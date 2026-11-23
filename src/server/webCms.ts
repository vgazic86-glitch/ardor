/**
 * Uređivanje web stranice iz aplikacije (CMS): tekstovi, obavijest na vrhu, kontakt, članci, fotografije.
 * Pravila i zadani tekstovi su u lib/webContent.ts. Svaka izmjena pokreće ponovnu izgradnju weba (scheduleWebRebuild).
 */
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'
import { todayBL } from '../lib/motivation'
import {
  articleHtml, articleSlug, canEditArticle, canEditGroup, canPublish, canSetStatus, cleanArticle, cleanField, FIELD, mergeTexts, readingMinutes, WEB_FIELDS,
  type ArticleInput, type ArticleStatus,
} from '../lib/webContent'
import type { SessionUser } from './auth'
import { decodeImage, type ImagePart } from './images'
import { gemini, plain, scheduleWebRebuild } from './web'

const IMAGE_KEYS = WEB_FIELDS.filter((f) => f.kind === 'image').map((f) => f.key)

async function savedTexts() {
  const rows = await db.select().from(t.webContent)
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

/* ───────────────────────── javno (za izgradnju weba) ───────────────────────── */

export async function publicContent(origin: string) {
  const texts = mergeTexts(await savedTexts())
  for (const k of IMAGE_KEYS) texts[k] = texts[k] ? `${origin}/api/web/mediji/${texts[k]}` : ''
  const arts = await db.select().from(t.webArticles).where(eq(t.webArticles.status, 'objavljen')).orderBy(desc(t.webArticles.publishedAt))
  return {
    today: todayBL(),
    texts,
    articles: arts.map((a) => ({
      slug: a.slug,
      title: a.title,
      summary: a.summary,
      theme: a.theme,
      room: a.room,
      image: a.imageId ? `${origin}/api/web/mediji/${a.imageId}` : '',
      date: (a.publishedAt ?? a.createdAt ?? new Date()).toISOString().slice(0, 10),
      readMin: readingMinutes(a.body),
      html: articleHtml(a.body),
    })),
  }
}

/** Fotografija za web: javna ako je na naslovnici ili u objavljenom članku; prijavljeni vide i nacrte. */
export async function readWebMedia(fileId: number, loggedIn: boolean) {
  if (!Number.isInteger(fileId) || fileId <= 0) return null
  const used = (await db.select().from(t.webContent).where(inArray(t.webContent.key, IMAGE_KEYS))).some((r) => r.value === String(fileId))
  let ok = used
  if (!ok) {
    const [a] = await db.select({ status: t.webArticles.status }).from(t.webArticles).where(eq(t.webArticles.imageId, fileId))
    ok = !!a && (a.status === 'objavljen' || loggedIn)
  }
  if (!ok) return null
  const [f] = await db.select({ mime: t.files.mime, data: t.files.data }).from(t.files).where(eq(t.files.id, fileId))
  return f ?? null
}

/* ───────────────────────── uređivanje ───────────────────────── */

export interface CmsArticle extends ArticleInput {
  id: string
  slug: string
  status: ArticleStatus
  imageId: string | null
  author: string
  approvedBy: string
  updatedAt: string | null
  publishedAt: string | null
}

export async function cmsData() {
  const rows = await db.select().from(t.webContent)
  const saved = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  const meta = Object.fromEntries(rows.map((r) => [r.key, { by: r.updatedBy, at: r.updatedAt?.toISOString() ?? null }]))
  const arts = await db.select().from(t.webArticles).orderBy(desc(t.webArticles.updatedAt))
  const articles: CmsArticle[] = arts.map((a) => ({
    id: String(a.id), slug: a.slug, title: a.title, summary: a.summary, theme: a.theme, room: a.room, body: a.body,
    status: a.status as ArticleStatus, imageId: a.imageId ? String(a.imageId) : null, author: a.author, approvedBy: a.approvedBy,
    updatedAt: a.updatedAt?.toISOString() ?? null, publishedAt: a.publishedAt?.toISOString() ?? null,
  }))
  // Sažetak kataloga za „Pregled weba” (vide ga i trgovci, bez cijena i zaliha).
  const wp = await db
    .select({ room: t.webProducts.room, featured: t.webProducts.featured, oldPrice: t.webProducts.oldPrice, price: t.products.price, imageId: t.products.imageId })
    .from(t.webProducts)
    .innerJoin(t.products, eq(t.webProducts.productId, t.products.id))
    .where(and(eq(t.webProducts.visible, true), eq(t.products.active, true)))
  const shown = wp.filter((x) => x.imageId)
  const byRoom: Record<string, number> = {}
  for (const x of shown) byRoom[x.room] = (byRoom[x.room] ?? 0) + 1
  const catalog = {
    total: shown.length,
    byRoom,
    featured: shown.filter((x) => x.featured).length,
    sale: shown.filter((x) => x.oldPrice && x.oldPrice > x.price).length,
    noImage: wp.length - shown.length,
  }
  return { saved, texts: mergeTexts(saved), meta, articles, catalog }
}

/** Sprema više polja odjednom (jedna grupa). Prazna vrijednost = vrati zadani tekst. */
export async function saveTexts(user: SessionUser, values: Record<string, string>) {
  const clean: [string, string][] = []
  for (const [k, raw] of Object.entries(values)) {
    const f = FIELD.get(k)
    if (!f) continue
    if (!canEditGroup(user.role, f.group)) throw new Error('Ovaj dio weba mijenja voditelj salona, uprava ili admin.')
    const r = cleanField(k, raw)
    if ('error' in r) throw new Error(r.error)
    clean.push([k, r.ok])
  }
  if (!clean.length) return
  const now = new Date()
  for (const [key, value] of clean) {
    await db.insert(t.webContent).values({ key, value, updatedAt: now, updatedBy: user.name })
      .onConflictDoUpdate({ target: t.webContent.key, set: { value, updatedAt: now, updatedBy: user.name } })
  }
  scheduleWebRebuild()
}

/** Nova fotografija za polje tipa „slika” (npr. velika fotografija naslovnice). */
export async function setTextImage(user: SessionUser, key: string, image: ImagePart | null) {
  const f = FIELD.get(key)
  if (!f || f.kind !== 'image') throw new Error('Nepoznato polje.')
  if (!canEditGroup(user.role, f.group)) throw new Error('Nemate ovlaštenje.')
  const [old] = await db.select().from(t.webContent).where(eq(t.webContent.key, key))
  let value = ''
  if (image) {
    const data = decodeImage(image)
    const [file] = await db.insert(t.files).values({ name: `web-${key}.${image.mime === 'image/webp' ? 'webp' : 'jpg'}`, mime: image.mime, size: data.length, data }).returning()
    value = String(file.id)
  }
  const now = new Date()
  await db.insert(t.webContent).values({ key, value, updatedAt: now, updatedBy: user.name })
    .onConflictDoUpdate({ target: t.webContent.key, set: { value, updatedAt: now, updatedBy: user.name } })
  if (old?.value && /^\d+$/.test(old.value)) await db.delete(t.files).where(eq(t.files.id, Number(old.value))).catch(() => {})
  scheduleWebRebuild()
}

export interface ArticleSave extends ArticleInput {
  id?: string
  /** Kamo članak ide nakon spremanja: nacrt, na odobrenje ili objava. */
  status: ArticleStatus
  image?: ImagePart | null
  /** true = ukloni fotografiju */
  removeImage?: boolean
}

export async function saveArticle(user: SessionUser, input: ArticleSave) {
  const to: ArticleStatus = input.status === 'objavljen' || input.status === 'ceka' ? input.status : 'nacrt'
  const r = cleanArticle(input, to !== 'nacrt')
  if ('error' in r) throw new Error(r.error)
  const v = r.ok
  const id = input.id ? Number(input.id) : null
  const [old] = id ? await db.select().from(t.webArticles).where(eq(t.webArticles.id, id)) : []
  if (id && !old) throw new Error('Članak nije pronađen.')
  const from = (old?.status ?? 'nacrt') as ArticleStatus
  if (old && !canEditArticle(user.role, from)) throw new Error('Objavljeni članak mijenja voditelj salona, uprava ili admin.')
  if (!canSetStatus(user.role, from, to)) throw new Error('Članak objavljuje voditelj salona, uprava ili admin — pošalji ga na odobrenje.')
  if (to !== 'nacrt' && !input.image && (input.removeImage || !old?.imageId)) throw new Error('Dodaj naslovnu fotografiju članka.')

  const now = new Date()
  return db.transaction(async (tx) => {
    let imageId = input.removeImage ? null : (old?.imageId ?? null)
    if (input.image) {
      const data = decodeImage(input.image)
      const [file] = await tx.insert(t.files).values({ name: `web-clanak.${input.image.mime === 'image/webp' ? 'webp' : 'jpg'}`, mime: input.image.mime, size: data.length, data }).returning()
      imageId = file.id
    }
    // Adresa se ne mijenja nakon objave (da ne puknu linkovi iz Googlea).
    let slug = old && from === 'objavljen' ? old.slug : articleSlug(v.title) || `clanak-${Date.now()}`
    const taken = await tx.select({ id: t.webArticles.id, slug: t.webArticles.slug }).from(t.webArticles)
    const used = new Set(taken.filter((x) => x.id !== id).map((x) => x.slug))
    for (let n = 2; used.has(slug); n++) slug = `${articleSlug(v.title)}-${n}`
    const row = {
      ...v, slug, imageId, status: to, updatedAt: now,
      ...(to === 'objavljen' && from !== 'objavljen' ? { publishedAt: now, approvedBy: user.name } : {}),
      ...(to !== 'objavljen' ? { approvedBy: '' } : {}),
    }
    let savedId: number
    if (old) {
      await tx.update(t.webArticles).set(row).where(eq(t.webArticles.id, old.id))
      savedId = old.id
      if (old.imageId && old.imageId !== imageId) await tx.delete(t.files).where(eq(t.files.id, old.imageId))
    } else {
      const [n] = await tx.insert(t.webArticles).values({ ...row, author: user.name, createdAt: now }).returning()
      savedId = n.id
    }
    if (to === 'ceka' && from !== 'ceka') {
      const bosses = await tx.select({ id: t.users.id, role: t.users.role }).from(t.users).where(eq(t.users.active, true))
      const ids = bosses.filter((b) => canPublish(b.role as SessionUser['role']) && String(b.id) !== user.id).map((b) => b.id)
      if (ids.length) await tx.insert(t.notifications).values(ids.map((userId) => ({ userId, at: now, title: `Web: članak čeka odobrenje`, text: `„${v.title}” (${user.name}). Otvori „Web stranica” → Članci.`.slice(0, 300) })))
    }
    if (to === 'objavljen' || from === 'objavljen') scheduleWebRebuild()
    return { id: String(savedId), slug }
  })
}

export async function deleteArticle(user: SessionUser, id: string) {
  const [a] = await db.select().from(t.webArticles).where(eq(t.webArticles.id, Number(id)))
  if (!a) return
  if (!canEditArticle(user.role, a.status as ArticleStatus)) throw new Error('Objavljeni članak briše voditelj salona, uprava ili admin.')
  await db.delete(t.webArticles).where(eq(t.webArticles.id, a.id))
  if (a.imageId) await db.delete(t.files).where(eq(t.files.id, a.imageId)).catch(() => {})
  if (a.status === 'objavljen') scheduleWebRebuild()
}

/** AI nacrt članka (Gemini). Ne šalje ništa osim naslova i teme. */
export async function draftArticle(input: { title: string; theme?: string; notes?: string }) {
  const title = String(input.title ?? '').trim().slice(0, 120)
  if (title.length < 5) throw new Error('Prvo upiši naslov — AI piše članak prema naslovu.')
  const system = `Pišeš članke za blog „Inspiracija i savjeti” salona namještaja ARDOR (Banja Luka, salon 6000 m², vlastiti pogon za namještaj po mjeri: kuhinje, plakari, ormari).
Jezik: bosanski, ijekavica, obraćanje kupcu na „ti”, toplo i stručno, bez pretjerivanja i bez izmišljenih podataka (cijene, akcije, rokovi, nazivi modela).
Format (strogo): običan tekst. Podnaslovi u zasebnom redu počinju s „## ”. Nabrajanje: red počinje s „- ”. Podebljano samo **ovako**, rijetko. Prazan red između odlomaka. Bez naslova na vrhu (naslov već postoji).
Dužina 350–550 riječi: kratki uvod, 3–5 podnaslova s praktičnim savjetima, kratak zaključak koji poziva u salon ili na besplatno mjerenje.
Vrati ISKLJUČIVO JSON: {"summary": "opis za Google, 120–155 znakova", "body": "tekst članka"}`
  const user = `Naslov: ${title}\nTema: ${String(input.theme ?? '').slice(0, 40)}\nNapomene autora: ${String(input.notes ?? '').replace(/\S+@\S+/g, '').replace(/\+?\d[\d\s/-]{6,}\d/g, '').slice(0, 500)}`
  const raw = await gemini(system, user, true, 2400).catch(() => null)
  if (!raw) throw new Error('AI trenutno nije dostupan. Pokušaj za minutu ili napiši tekst sam.')
  try {
    const j = JSON.parse(raw) as { summary?: unknown; body?: unknown }
    const body = typeof j.body === 'string' ? j.body.replace(/^\s*#\s+.*\n/, '').replace(/^\s*[*•]\s+/gm, '- ').trim() : ''
    if (body.length < 200) throw new Error()
    return { summary: typeof j.summary === 'string' ? plain(j.summary).slice(0, 160) : '', body }
  } catch {
    throw new Error('AI je vratio neispravan tekst. Pokušaj ponovo.')
  }
}
