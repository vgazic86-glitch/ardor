/**
 * Javna web stranica (ardornamjestaj.com): katalog za web, upiti s weba, AI savjetnik i pomoćnik za materijale.
 * Javne rute su u src/routes/api.web.*.ts; uređivanje (artikli na webu, obrada upita) ide kroz api.ts.
 * Van nikad ne idu nabavne cijene, količine zaliha, kupci ni zaposlenici.
 */
import { and, desc, eq, inArray, or } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'
import { reservedQty } from '../lib/stats'
import { todayBL } from '../lib/motivation'
import {
  cleanWebSettings, guessRoom, makeLimiter, parseSwatches, slugify, validateInquiry, webAvailability,
  INQUIRY_KINDS, INQUIRY_STATUS, WEB_ROOMS, type InquiryStatus, type WebSettingsInput,
} from '../lib/web'
import type { SessionUser } from './auth'
import { loadSnapshot } from './logic'

/* ───────────────────────── javni katalog ───────────────────────── */

export interface PublicProduct {
  id: string
  slug: string
  name: string
  type: string
  room: string
  style: string
  color: string
  material: string
  avail: 'stanje' | 'narudzba'
  price: number
  oldPrice?: number
  images: string[]
  dimensions: string
  materials: string
  personal: string
  description: string
  swatches: string[]
  featured: boolean
}

export async function publicCatalog(origin: string): Promise<PublicProduct[]> {
  const rows = await db
    .select({ w: t.webProducts, p: { id: t.products.id, name: t.products.name, category: t.products.category, price: t.products.price, imageId: t.products.imageId, active: t.products.active } })
    .from(t.webProducts)
    .innerJoin(t.products, eq(t.webProducts.productId, t.products.id))
    .where(and(eq(t.webProducts.visible, true), eq(t.products.active, true)))
  if (!rows.length) return []
  const snap = await loadSnapshot()
  const reserved = reservedQty(snap.orders)
  const stock = new Map(snap.products.map((p) => [p.id, p.stock]))
  return rows.map(({ w, p }) => {
    const id = String(p.id)
    return {
      id,
      slug: w.slug,
      name: p.name,
      type: w.typeLabel || p.category,
      room: w.room,
      style: w.style,
      color: w.color,
      material: w.material,
      avail: webAvailability(stock.get(id) ?? 0, reserved.get(id) ?? 0),
      price: p.price,
      ...(w.oldPrice && w.oldPrice > p.price ? { oldPrice: w.oldPrice } : {}),
      images: p.imageId ? [`${origin}/api/web/slike/${p.imageId}`] : [],
      dimensions: w.dimensions,
      materials: w.materials,
      personal: w.personal,
      description: w.description,
      swatches: parseSwatches(w.swatches),
      featured: w.featured,
    }
  }).filter((x) => x.images.length > 0)
}

/** Slika smije van samo ako pripada artiklu koji je vidljiv na webu. */
export async function readWebImage(fileId: number) {
  if (!Number.isInteger(fileId) || fileId <= 0) return null
  const [ok] = await db
    .select({ id: t.products.id })
    .from(t.products)
    .innerJoin(t.webProducts, eq(t.webProducts.productId, t.products.id))
    .where(and(eq(t.products.imageId, fileId), eq(t.webProducts.visible, true), eq(t.products.active, true)))
  if (!ok) return null
  const [f] = await db.select({ mime: t.files.mime, data: t.files.data }).from(t.files).where(eq(t.files.id, fileId))
  return f ?? null
}

/* ───────────────────────── upiti s weba ───────────────────────── */

const inquiryLimit = makeLimiter(6, 10 * 60_000)
const ALLOWED_IMG = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO = 3 * 1024 * 1024

async function salesUserIds() {
  const rows = await db
    .select({ id: t.users.id })
    .from(t.users)
    .where(and(eq(t.users.active, true), or(eq(t.users.role, 'admin'), eq(t.users.role, 'uprava'), eq(t.users.role, 'voditelj'), eq(t.users.role, 'trgovac'))))
  return rows.map((r) => r.id)
}

export async function createInquiry(form: FormData, ip: string) {
  if (!inquiryLimit(ip || 'nepoznato')) return { status: 429, error: 'Previše upita u kratkom vremenu. Nazovi nas na 051 433 750.' }
  const fields: Record<string, unknown> = {}
  for (const [k, v] of form.entries()) if (typeof v === 'string') fields[k] = v
  const res = validateInquiry(fields, todayBL())
  if ('error' in res) {
    // Botovima ne javljamo da su uhvaćeni.
    if (res.error === 'spam') return { status: 200, ok: true }
    return { status: 400, error: res.error }
  }
  const photos = form.getAll('slike').filter((f): f is File => typeof f !== 'string').slice(0, 5)
  for (const f of photos) {
    if (!ALLOWED_IMG.includes(f.type)) return { status: 400, error: 'Fotografije moraju biti JPG, PNG ili WebP.' }
    if (f.size > MAX_PHOTO) return { status: 400, error: 'Fotografija je prevelika (najviše 3 MB).' }
  }
  const v = res.ok
  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(t.webInquiries)
      .values({ at: new Date(), kind: v.kind, name: v.name, phone: v.phone, email: v.email, room: v.room, dimensions: v.dimensions, message: v.message, product: v.product, advice: v.advice, date: v.date, slot: v.slot, address: v.address, source: v.source, ip: ip.slice(0, 60) })
      .returning()
    let n = 1
    for (const f of photos) {
      const data = Buffer.from(await f.arrayBuffer())
      const [file] = await tx
        .insert(t.files)
        .values({ name: `web-upit-${row.id}-${n++}.${f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg'}`, mime: f.type, size: data.length, data })
        .returning()
      await tx.insert(t.webInquiryPhotos).values({ inquiryId: row.id, fileId: file.id })
    }
    return row.id
  })
  try {
    const ids = await salesUserIds()
    const what = INQUIRY_KINDS[v.kind]
    const when = v.date ? ` · ${v.date.split('-').reverse().join('.')}. u ${v.slot}` : ''
    if (ids.length)
      await db.insert(t.notifications).values(ids.map((userId) => ({ userId, at: new Date(), title: `Web: ${what.toLowerCase()} — ${v.name}`.slice(0, 120), text: `${v.room || v.product || 'Upit s web stranice'}${when}. Otvori „Web stranica” → Upiti.`.slice(0, 300) })))
  } catch (e) {
    console.error('Web upit: obavijest nije upisana', e)
  }
  return { status: 200, ok: true, id }
}

/* ───────────────────────── AI: savjetnik i materijali ───────────────────────── */

const aiLimit = makeLimiter(20, 60 * 60_000)
const GEMINI_URL = () => process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com'
const GEMINI_MODEL = () => process.env.GEMINI_MODEL || 'gemini-flash-lite-latest'

export async function gemini(system: string, user: string, json: boolean, maxTokens = 900) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  const res = await fetch(`${GEMINI_URL()}/v1beta/models/${encodeURIComponent(GEMINI_MODEL())}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4, ...(json ? { responseMimeType: 'application/json' } : {}) },
    }),
    signal: AbortSignal.timeout(maxTokens > 900 ? 45_000 : 18_000),
  })
  if (!res.ok) {
    console.error('Web AI: Gemini', res.status, (await res.text()).slice(0, 200))
    return null
  }
  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] }
  return (body.candidates?.[0]?.content?.parts ?? []).filter((p) => !p.thought && p.text).map((p) => p.text).join('').trim() || null
}

const KNOWLEDGE = `ARDOR namještaj d.o.o., Banja Luka (Vojvode Pere Kreće 21), salon od 6000 m², od 1996.; vlastiti pogon za namještaj po mjeri od 2016.
Po mjeri: kuhinje, ugradbeni plakari, američki ormari, komode. Materijali: akrilna iverica 18,6 mm (visoki sjaj), MDF 18 mm (lakiran u bilo kojoj boji), oplemenjena iverica 18/25/36 mm (dekori drveta), sjajna iverica 18 mm. Dodaci: LED rasvjeta, električni dodaci za kuhinju, okovi po izboru (tiho zatvaranje, push-to-open).
Usluge: besplatno mjerenje, 3D prijedlog, dostava i montaža, garancija, plaćanje na rate uz partnerski kredit (iznos i rok kredita ne navodi — ratu i uslove dogovaramo u salonu). Studio spavanja: madraci i jastuci za isprobati.
Radno vrijeme: radnim danom 08:00–20:30, subotom 08:00–19:00. Telefon 051 433 750, Viber/WhatsApp 065 436 420.`

export async function advise(input: unknown, ip: string) {
  if (!aiLimit(ip || 'nepoznato')) return { status: 429, error: 'Previše upita.' }
  const b = (input ?? {}) as { odgovori?: Record<string, unknown>; kandidati?: { id?: unknown; naziv?: unknown; tip?: unknown; stil?: unknown; cijena?: unknown }[] }
  const o = b.odgovori ?? {}
  const s = (v: unknown, n = 40) => String(v ?? '').replace(/[^\p{L}\p{N} .,\-]/gu, '').slice(0, n)
  const cands = (Array.isArray(b.kandidati) ? b.kandidati : []).slice(0, 8).map((c) => ({ id: s(c.id, 12), naziv: s(c.naziv), tip: s(c.tip), stil: s(c.stil, 20), cijena: Number(c.cijena) || 0 }))
  const system = `Ti si savjetnik za uređenje doma salona ARDOR. Piši na bosanskom (ijekavica), toplo i stručno, kratko, bez pretjerivanja i bez izmišljanja usluga.
${KNOWLEDGE}
Vrati ISKLJUČIVO JSON: {"text": "2 rečenice personaliziranog prijedloga", "tips": ["3 konkretna savjeta za raspored i boje, svaki do 140 znakova"], "ids": ["do 3 id-a iz kandidata koji najbolje odgovaraju budžetu i stilu"]}. Ne navodi cijene koje nisu u kandidatima.`
  const user = `Prostorija: ${s(o.room)}; kvadratura: ${Number(o.m2) || 0} m²; stil: ${s(o.style)}; budžet do: ${Number(o.budget) > 50000 ? 'preko 7000' : Number(o.budget) || 0} KM; opseg: ${o.scope === 'sve' ? 'kompletno uređenje' : 'jedan ili dva komada'}.
Kandidati iz ponude: ${JSON.stringify(cands)}`
  const raw = await gemini(system, user, true).catch(() => null)
  if (!raw) return { status: 200, text: '', tips: [], ids: [] }
  try {
    const j = JSON.parse(raw) as { text?: unknown; tips?: unknown; ids?: unknown }
    const ids = new Set(cands.map((c) => c.id))
    return {
      status: 200,
      text: typeof j.text === 'string' ? plain(j.text).slice(0, 400) : '',
      tips: Array.isArray(j.tips) ? j.tips.filter((x): x is string => typeof x === 'string').slice(0, 4).map((x) => plain(x).slice(0, 200)) : [],
      ids: Array.isArray(j.ids) ? j.ids.map(String).filter((x) => ids.has(x)).slice(0, 3) : [],
    }
  } catch {
    return { status: 200, text: '', tips: [], ids: [] }
  }
}

export async function answerQuestion(input: unknown, ip: string) {
  if (!aiLimit(ip || 'nepoznato')) return { status: 429, error: 'Previše upita.' }
  const q = String((input as { pitanje?: unknown })?.pitanje ?? '').trim().slice(0, 300)
  if (q.length < 4) return { status: 400, error: 'Pitanje je prekratko.' }
  // Ne šaljemo van telefone i e-mailove koje bi posjetitelj možda upisao.
  const safe = q.replace(/\S+@\S+/g, '[e-mail]').replace(/\+?\d[\d\s/-]{6,}\d/g, '[broj]')
  const system = `Ti si pomoćnik za materijale i uređenje salona namještaja ARDOR. Odgovaraj na bosanskom (ijekavica), najviše 120 riječi, konkretno i praktično. Običan tekst bez markdowna (bez zvjezdica i naslova); nabrajanje s crticom na početku reda. Ne tvrdi svojstva materijala koja nisu općepoznata.
Teme: materijali (akril, MDF, iverica, masiv, tkanine, koža), održavanje namještaja, boje i raspored, odabir madraca, namještaj po mjeri, usluge ARDOR-a.
Ako pitanje nije o namještaju ili uređenju doma, ljubazno reci da pomažeš samo oko namještaja. Ne izmišljaj cijene, rokove ni akcije — za to uputi na salon.
${KNOWLEDGE}`
  const a = await gemini(system, safe, false).catch(() => null)
  if (!a) return { status: 503, error: 'AI pomoćnik trenutno nije dostupan.' }
  return { status: 200, odgovor: plain(a).slice(0, 1200) }
}

/** Ukloni markdown iz AI odgovora (web ga prikazuje kao običan tekst). */
export function plain(s: string) {
  return s
    .replace(/^\s*#+\s*/gm, '')
    .replace(/^\s*[*•]\s+/gm, '– ')
    .replace(/\*\*?([^*]+)\*\*?/g, '$1')
    .replace(/\*/g, '')
}

/* ───────────────────────── uređivanje u aplikaciji ───────────────────────── */

export interface WebAdminProduct {
  productId: string
  sku: string
  name: string
  category: string
  price: number
  hasImage: boolean
  thumbId: string | null
  web: (ReturnType<typeof cleanWebSettings> & { configured: boolean })
}

export interface WebInquiryRow {
  id: string
  at: string
  kind: string
  name: string
  phone: string
  email: string
  room: string
  dimensions: string
  message: string
  product: string
  advice: string
  date: string | null
  slot: string
  address: string
  source: string
  status: string
  handledBy: string
  note: string
  customerId: string | null
  photos: string[]
}

export async function webAdminData(user: SessionUser) {
  const inq = await db.select().from(t.webInquiries).orderBy(desc(t.webInquiries.at)).limit(300)
  const photos = inq.length
    ? await db.select().from(t.webInquiryPhotos).where(inArray(t.webInquiryPhotos.inquiryId, inq.map((i) => i.id)))
    : []
  const inquiries: WebInquiryRow[] = inq.map((i) => ({
    id: String(i.id), at: i.at.toISOString(), kind: i.kind, name: i.name, phone: i.phone, email: i.email, room: i.room, dimensions: i.dimensions,
    message: i.message, product: i.product, advice: i.advice, date: i.date, slot: i.slot, address: i.address, source: i.source,
    status: i.status, handledBy: i.handledBy, note: i.note, customerId: i.customerId ? String(i.customerId) : null,
    photos: photos.filter((p) => p.inquiryId === i.id).map((p) => String(p.fileId)),
  }))
  // Trgovac vidi upite; uređivanje artikala za web je za operativu i više (kao Artikli).
  if (user.role === 'trgovac') return { inquiries, products: [] as WebAdminProduct[] }
  const prods = await db
    .select({ p: { id: t.products.id, sku: t.products.sku, name: t.products.name, category: t.products.category, price: t.products.price, imageId: t.products.imageId, thumbId: t.products.thumbId }, w: t.webProducts })
    .from(t.products)
    .leftJoin(t.webProducts, eq(t.webProducts.productId, t.products.id))
    .where(eq(t.products.active, true))
    .orderBy(t.products.name)
  const products: WebAdminProduct[] = prods.map(({ p, w }) => ({
    productId: String(p.id), sku: p.sku, name: p.name, category: p.category, price: p.price, hasImage: !!p.imageId, thumbId: p.thumbId ? String(p.thumbId) : null,
    web: w
      ? { configured: true, visible: w.visible, slug: w.slug, room: w.room, style: w.style, color: w.color, material: w.material, typeLabel: w.typeLabel, description: w.description, dimensions: w.dimensions, materials: w.materials, personal: w.personal, swatches: w.swatches, oldPrice: w.oldPrice, featured: w.featured }
      : { configured: false, ...cleanWebSettings({ room: guessRoom(p.category) }, p.name, p.price) },
  }))
  return { inquiries, products }
}

export type WebSaveInput = WebSettingsInput & { productId: string; name?: string }

export async function saveWebProduct(input: WebSaveInput) {
  const pid = Number(input.productId)
  const [p] = await db.select({ name: t.products.name, price: t.products.price, imageId: t.products.imageId }).from(t.products).where(eq(t.products.id, pid))
  if (!p) throw new Error('Artikal nije pronađen.')
  const v = cleanWebSettings(input, p.name, p.price)
  if (v.visible && !p.imageId) throw new Error('Artikal bez fotografije ne može na web — dodaj sliku u Artiklima.')
  // Jedinstvena adresa: ako je zauzeta, dodaj broj artikla.
  const [taken] = await db.select({ id: t.webProducts.productId }).from(t.webProducts).where(eq(t.webProducts.slug, v.slug))
  if (taken && taken.id !== pid) v.slug = slugify(`${v.slug}-${pid}`)
  const row = { ...v, updatedAt: new Date() }
  await db.insert(t.webProducts).values({ productId: pid, ...row }).onConflictDoUpdate({ target: t.webProducts.productId, set: row })
  scheduleWebRebuild()
}

let rebuildTimer: ReturnType<typeof setTimeout> | null = null
/**
 * Ponovna izgradnja weba (WEB_DEPLOY_HOOK = „deploy hook” adresa s Cloudflare Pages / Netlify).
 * Za GitHub: WEB_DEPLOY_HOOK = https://api.github.com/repos/<vlasnik>/<repo>/dispatches + WEB_DEPLOY_TOKEN.
 * Čeka 2 minute od zadnje izmjene, da više izmjena zaredom napravi samo jednu izgradnju.
 */
export function scheduleWebRebuild() {
  const hook = process.env.WEB_DEPLOY_HOOK
  if (!hook) return
  if (rebuildTimer) clearTimeout(rebuildTimer)
  rebuildTimer = setTimeout(() => {
    rebuildTimer = null
    // GitHub Actions (pregled na GitHub Pages): repository_dispatch s tokenom; inače običan deploy hook (Cloudflare/Netlify).
    const token = process.env.WEB_DEPLOY_TOKEN
    const gh = hook.startsWith('https://api.github.com/') && token
    fetch(hook, {
      method: 'POST',
      ...(gh ? { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' }, body: JSON.stringify({ event_type: 'cms' }) } : {}),
      signal: AbortSignal.timeout(15_000),
    }).catch((e) => console.error('Web: izgradnja nije pokrenuta', e))
  }, 120_000)
}

export async function setInquiryStatus(user: SessionUser, input: { id: string; status: string; note?: string }) {
  const status = (input.status in INQUIRY_STATUS ? input.status : 'novo') as InquiryStatus
  await db
    .update(t.webInquiries)
    .set({ status, handledBy: user.name, ...(input.note !== undefined ? { note: input.note.trim().slice(0, 1000) } : {}) })
    .where(eq(t.webInquiries.id, Number(input.id)))
}

/** Upit → kupac u aplikaciji (ako kupac s istim telefonom već postoji, poveže se s njim). */
export async function inquiryToCustomer(user: SessionUser, id: string) {
  const [i] = await db.select().from(t.webInquiries).where(eq(t.webInquiries.id, Number(id)))
  if (!i) throw new Error('Upit nije pronađen.')
  if (i.customerId) return { customerId: String(i.customerId) }
  const digits = (s: string) => s.replace(/\D/g, '').replace(/^(387|00387|0)/, '')
  const all = await db.select({ id: t.customers.id, phone: t.customers.phone }).from(t.customers)
  const same = all.find((c) => c.phone && digits(c.phone) === digits(i.phone))
  const note = [`Web upit (${INQUIRY_KINDS[i.kind as keyof typeof INQUIRY_KINDS] ?? i.kind}) ${i.at.toISOString().slice(0, 10)}`, i.room, i.dimensions, i.message, i.product, i.advice].filter(Boolean).join(' · ').slice(0, 1000)
  let cid: number
  if (same) cid = same.id
  else {
    const [c] = await db.insert(t.customers).values({ name: i.name, phone: i.phone, email: i.email, address: i.address, note }).returning()
    cid = c.id
  }
  await db.update(t.webInquiries).set({ customerId: cid, status: i.status === 'novo' ? 'u_obradi' : i.status, handledBy: user.name }).where(eq(t.webInquiries.id, i.id))
  return { customerId: String(cid) }
}

/** Fotografija iz upita (samo za prijavljene). */
export async function readInquiryPhoto(fileId: number) {
  const [ok] = await db.select({ id: t.webInquiryPhotos.id }).from(t.webInquiryPhotos).where(eq(t.webInquiryPhotos.fileId, fileId))
  if (!ok) return null
  const [f] = await db.select({ mime: t.files.mime, data: t.files.data }).from(t.files).where(eq(t.files.id, fileId))
  return f ?? null
}

export const WEB_ROOM_NAMES = WEB_ROOMS
