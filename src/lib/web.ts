/** Javna web stranica (ardornamjestaj.com): čista logika — katalog, upiti, dozvoljene adrese. */

export const WEB_ROOMS = {
  'dnevni-boravak': 'Dnevni boravak',
  'spavaca-soba': 'Spavaća soba',
  kuhinja: 'Kuhinja',
  trpezarija: 'Trpezarija',
  'djecja-soba': 'Dječja soba',
  hodnik: 'Hodnik',
  ured: 'Ured',
  'ormari-i-plakari': 'Ormari i plakari',
  'lezajevi-i-madraci': 'Ležajevi i madraci',
} as const
export const WEB_STYLES = { moderni: 'Moderni', skandinavski: 'Skandinavski', klasicni: 'Klasični', industrijski: 'Industrijski' } as const
export const WEB_COLORS = { svijetla: 'Svijetla / bijela', drvo: 'Drvo', tamna: 'Tamna / antracit', boja: 'U boji' } as const
export const WEB_MATERIALS = { tkanina: 'Tkanina', iverica: 'Iverica', mdf: 'MDF / akril', masiv: 'Masivno drvo' } as const
export const INQUIRY_KINDS = { ponuda: 'Ponuda', posjet: 'Posjet salonu', mjerenje: 'Mjerenje' } as const
export const INQUIRY_STATUS = { novo: 'Novo', u_obradi: 'U obradi', zatvoreno: 'Zatvoreno' } as const

export type WebRoom = keyof typeof WEB_ROOMS
export type InquiryKind = keyof typeof INQUIRY_KINDS
export type InquiryStatus = keyof typeof INQUIRY_STATUS

const pick = <T extends Record<string, string>>(map: T, v: unknown, d: keyof T): keyof T =>
  typeof v === 'string' && v in map ? (v as keyof T) : d

/** Adresa artikla na webu: „Isabel Lux garnitura” → „isabel-lux-garnitura”. */
export function slugify(s: string) {
  const map: Record<string, string> = { č: 'c', ć: 'c', đ: 'dj', š: 's', ž: 'z' }
  return (
    s
      .toLowerCase()
      .replace(/[čćđšž]/g, (c) => map[c])
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'artikal'
  )
}

/** Kategorija artikla iz aplikacije → prostorija na webu (prijedlog kad se artikal prvi put stavlja na web). */
export function guessRoom(category: string): WebRoom {
  const c = category.toLowerCase()
  if (/kuhinj/.test(c)) return 'kuhinja'
  if (/trpez|blagovaon|stol/.test(c)) return 'trpezarija'
  if (/spava|krevet|bračn|bracn/.test(c)) return 'spavaca-soba'
  if (/dječ|djec|dje[cč]/.test(c)) return 'djecja-soba'
  if (/ured|kancel/.test(c)) return 'ured'
  if (/ormar|plakar/.test(c)) return 'ormari-i-plakari'
  if (/madrac|dušek|dusek|ležaj|lezaj|jastu/.test(c)) return 'lezajevi-i-madraci'
  if (/hodnik|predsob|komod|cipel/.test(c)) return 'hodnik'
  return 'dnevni-boravak'
}

export function parseSwatches(s: string) {
  return s
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter((x) => /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(x))
    .slice(0, 6)
}

export interface WebSettingsInput {
  visible?: boolean
  slug?: string
  room?: string
  style?: string
  color?: string
  material?: string
  typeLabel?: string
  description?: string
  dimensions?: string
  materials?: string
  personal?: string
  swatches?: string
  oldPrice?: number | null
  featured?: boolean
}

const txt = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Očisti postavke artikla za web; stara cijena mora biti veća od trenutne. */
export function cleanWebSettings(i: WebSettingsInput, name: string, price: number) {
  const old = typeof i.oldPrice === 'number' && Number.isFinite(i.oldPrice) && i.oldPrice > price ? Math.round(i.oldPrice * 100) / 100 : null
  return {
    visible: !!i.visible,
    slug: slugify(txt(i.slug, 80) || name),
    room: pick(WEB_ROOMS, i.room, 'dnevni-boravak') as string,
    style: pick(WEB_STYLES, i.style, 'moderni') as string,
    color: pick(WEB_COLORS, i.color, 'svijetla') as string,
    material: pick(WEB_MATERIALS, i.material, 'tkanina') as string,
    typeLabel: txt(i.typeLabel, 80),
    description: txt(i.description, 1500),
    dimensions: txt(i.dimensions, 160),
    materials: txt(i.materials, 200),
    personal: txt(i.personal, 300),
    swatches: parseSwatches(txt(i.swatches, 200)).join(', '),
    oldPrice: old,
    featured: !!i.featured,
  }
}

/** Slobodno za prodaju = zaliha − rezervirano za otvorene prodaje. */
/* ───────── artikli za web (vlastiti popis, nije povezan s Artiklima aplikacije) ───────── */

export const WEB_AVAIL = { stanje: 'Odmah sa zalihe', narudzba: 'Po narudžbi' } as const
export const MAX_ITEM_IMAGES = 6

export interface WebItemInput extends Omit<WebSettingsInput, 'oldPrice'> {
  oldPrice?: number | string | null
  name?: string
  price?: number | string | null
  avail?: string
  imageIds?: string[]
}

/** Broj iz polja: „1.290,50”, „1290,5”, „1290” → 1290.5; prazno/neispravno → 0. */
export function parsePrice(v: unknown) {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : 0
  if (typeof v !== 'string') return 0
  let s = v.replace(/\s|KM/gi, '')
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0
}

/** Provjera i čišćenje artikla za web. Vraća poruku za korisnika ako nešto fali. */
export function cleanWebItem(i: WebItemInput): { error: string } | { ok: ReturnType<typeof cleanWebSettings> & { name: string; price: number; avail: string; imageIds: string } } {
  const name = txt(i.name, 90)
  if (name.length < 2) return { error: 'Upiši naziv artikla.' }
  const price = parsePrice(i.price)
  if (!price) return { error: 'Upiši cijenu (u KM, s PDV-om).' }
  if (price > 1_000_000) return { error: 'Cijena je prevelika.' }
  const old = parsePrice(i.oldPrice)
  if (old && old <= price) return { error: `Stara cijena mora biti veća od cijene (${price} KM) — ili ostavi prazno.` }
  const ids = [...new Set((i.imageIds ?? []).map(String).filter((x) => /^\d+$/.test(x)))].slice(0, MAX_ITEM_IMAGES)
  if (i.visible !== false && !ids.length) return { error: 'Dodaj barem jednu fotografiju — bez nje artikal ne može na web.' }
  const base = cleanWebSettings({ ...i, oldPrice: old || null }, name, price)
  return { ok: { ...base, name, price, avail: pick(WEB_AVAIL, i.avail, 'stanje') as string, imageIds: ids.join(',') } }
}

export function webAvailability(stock: number, reserved: number): 'stanje' | 'narudzba' {
  return stock - reserved > 0 ? 'stanje' : 'narudzba'
}

export interface InquiryFields {
  kind: InquiryKind
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
}

/** Provjera upita s weba. Vraća grešku (tekst za kupca) ili očišćena polja. */
export function validateInquiry(f: Record<string, unknown>, today: string): { error: string } | { ok: InquiryFields } {
  if (txt(f.website, 200)) return { error: 'spam' }
  const kind = pick(INQUIRY_KINDS, f.vrsta, 'ponuda') as InquiryKind
  const name = txt(f.ime, 80)
  const phone = txt(f.telefon, 30)
  const email = txt(f.email, 120)
  if (name.length < 2) return { error: 'Upiši ime i prezime.' }
  if (phone.replace(/\D/g, '').length < 6) return { error: 'Upiši ispravan broj telefona.' }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'E-mail adresa nije ispravna.' }
  if (!f.pristanak) return { error: 'Potrebna je saglasnost za kontakt.' }
  let date: string | null = null
  let slot = ''
  if (kind !== 'ponuda') {
    date = txt(f.datum, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Izaberi dan.' }
    if (date <= today) return { error: 'Termin može biti najranije sutra.' }
    if (new Date(`${date}T12:00:00Z`).getUTCDay() === 0) return { error: 'Nedjeljom ne radimo — izaberi drugi dan.' }
    slot = txt(f.termin, 5)
    if (!/^\d{2}:\d{2}$/.test(slot)) return { error: 'Izaberi termin.' }
  }
  const address = kind === 'mjerenje' ? txt(f.adresa, 160) : ''
  if (kind === 'mjerenje' && address.length < 4) return { error: 'Upiši adresu za mjerenje.' }
  return {
    ok: {
      kind, name, phone, email, date, slot, address,
      room: txt(f.prostorija, 60),
      dimensions: txt(f.dimenzije, 80),
      message: txt(f.poruka, 1500),
      product: txt(f.proizvod, 160),
      advice: txt(f.savjet, 600),
      source: txt(f.izvor, 160),
    },
  }
}

/** Adrese web stranice koje smiju zvati javni API (CORS). */
export function allowedOrigin(origin: string | null, extra = '') {
  if (!origin) return null
  const list = ['https://www.ardornamjestaj.com', 'https://ardornamjestaj.com', ...extra.split(',').map((s) => s.trim()).filter(Boolean)]
  if (list.includes(origin)) return origin
  if (/^http:\/\/localhost:\d+$/.test(origin)) return origin
  return null
}

/** Jednostavno ograničenje broja zahtjeva po ključu (IP) u prozoru vremena. */
export function makeLimiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>()
  return (key: string, now = Date.now()) => {
    const list = (hits.get(key) ?? []).filter((x) => now - x < windowMs)
    if (list.length >= max) return false
    list.push(now)
    hits.set(key, list)
    if (hits.size > 5000) hits.clear()
    return true
  }
}

/* ───────────────────────── web narudžbe (košarica, bez kartice) ───────────────────────── */

export const WEB_DELIVERY = { dostava: 'Dostava na adresu', preuzimanje: 'Preuzimanje u salonu' } as const
export const WEB_PAYMENT = { pouzece: 'Pouzećem (pri dostavi)', predracun: 'Uplata na račun (predračun)', salon: 'Plaćanje u salonu', rate: 'Na rate (partnerski kredit)' } as const
export const WEB_ORDER_STATUS = { nova: 'Nova', u_obradi: 'U obradi', prodaja: 'Napravljena prodaja', otkazana: 'Otkazana' } as const
export type WebDelivery = keyof typeof WEB_DELIVERY
export type WebPayment = keyof typeof WEB_PAYMENT
export type WebOrderStatus = keyof typeof WEB_ORDER_STATUS
export const MAX_ORDER_LINES = 20
export const MAX_ORDER_QTY = 20

export interface WebOrderFields {
  name: string
  phone: string
  email: string
  city: string
  address: string
  delivery: WebDelivery
  payment: WebPayment
  message: string
  /** Id artikla za web (broj iz „w12”) i količina; cijene računa server iz baze. */
  lines: { itemId: number; qty: number }[]
}

/** Provjera narudžbe s weba. Isti artikal dvaput se zbraja. 'spam' = popunjeno skriveno polje. */
export function validateWebOrder(f: Record<string, unknown>): { error: string } | { ok: WebOrderFields } {
  if (txt(f.website, 200)) return { error: 'spam' }
  const name = txt(f.ime, 80)
  const phone = txt(f.telefon, 30)
  const email = txt(f.email, 120)
  const delivery = pick(WEB_DELIVERY, f.dostava, 'dostava') as WebDelivery
  const payment = pick(WEB_PAYMENT, f.placanje, 'pouzece') as WebPayment
  const city = txt(f.mjesto, 60)
  const address = txt(f.adresa, 160)
  if (!Array.isArray(f.stavke) || f.stavke.length === 0) return { error: 'Košarica je prazna.' }
  const qty = new Map<number, number>()
  for (const s of f.stavke.slice(0, 50)) {
    const o = (s ?? {}) as Record<string, unknown>
    const id = Number(String(o.id ?? '').replace(/^w/, ''))
    const q = Math.floor(Number(o.kolicina))
    if (!Number.isInteger(id) || id <= 0 || !Number.isFinite(q) || q < 1) continue
    qty.set(id, Math.min(MAX_ORDER_QTY, (qty.get(id) ?? 0) + q))
  }
  if (qty.size === 0) return { error: 'Košarica je prazna.' }
  if (qty.size > MAX_ORDER_LINES) return { error: `Najviše ${MAX_ORDER_LINES} različitih artikala u jednoj narudžbi.` }
  if (name.length < 2) return { error: 'Upiši ime i prezime.' }
  if (phone.replace(/\D/g, '').length < 6) return { error: 'Upiši ispravan broj telefona.' }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'E-mail adresa nije ispravna.' }
  if (delivery === 'dostava' && city.length < 2) return { error: 'Upiši mjesto za dostavu.' }
  if (delivery === 'dostava' && address.length < 4) return { error: 'Upiši adresu za dostavu (ulica i broj).' }
  if (delivery === 'preuzimanje' && payment === 'pouzece') return { error: 'Pouzećem se plaća samo uz dostavu — izaberi drugi način plaćanja.' }
  if (!f.uvjeti) return { error: 'Potrebno je prihvatiti uvjete kupovine.' }
  return {
    ok: {
      name, phone, email, delivery, payment,
      city: delivery === 'dostava' ? city : '',
      address: delivery === 'dostava' ? address : '',
      message: txt(f.napomena, 1000),
      lines: [...qty].map(([itemId, q]) => ({ itemId, qty: q })),
    },
  }
}

export interface WebOrderLine { itemId: number; name: string; slug: string; room: string; price: number; qty: number }

/** Stavke s cijenama iz baze; artikal koji više nije vidljiv na webu = greška s nazivom. */
export function priceWebOrder(
  lines: { itemId: number; qty: number }[],
  items: { id: number; name: string; slug: string; room: string; price: number; visible: boolean; hasImage: boolean }[],
): { error: string } | { ok: { lines: WebOrderLine[]; total: number } } {
  const out: WebOrderLine[] = []
  for (const l of lines) {
    const it = items.find((x) => x.id === l.itemId)
    if (!it || !it.visible || !it.hasImage) return { error: 'Neki artikal iz košarice više nije u ponudi. Osvježi stranicu košarice i pošalji ponovo.' }
    out.push({ itemId: it.id, name: it.name, slug: it.slug, room: it.room, price: it.price, qty: l.qty })
  }
  const total = Math.round(out.reduce((s, l) => s + l.price * l.qty, 0) * 100) / 100
  return { ok: { lines: out, total } }
}

/** Broj web narudžbe za kupca i aplikaciju: W-0012. */
export const webOrderNumber = (id: number | string) => `W-${String(id).padStart(4, '0')}`
