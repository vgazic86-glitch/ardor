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
