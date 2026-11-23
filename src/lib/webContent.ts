/**
 * Uređivanje web stranice iz aplikacije (jednostavni CMS): popis polja koja zaposlenici smiju mijenjati,
 * zadani tekstovi (isti kao na webu), pravila po ulogama i članci „Inspiracija i savjeti”.
 * Čista logika — bez baze, da se može testirati.
 */
type Role = 'admin' | 'uprava' | 'voditelj' | 'operativa' | 'trgovac' | 'dostava'
import { slugify } from './web'

export type WebGroup = 'naslovna' | 'traka' | 'onama' | 'kontakt'

export interface WebField {
  key: string
  group: WebGroup
  label: string
  /** Gdje se tekst vidi na webu — piše se ispod polja, običnim riječima. */
  where: string
  kind: 'text' | 'textarea' | 'image' | 'date'
  max: number
  def: string
  /** Redovi za višeredna polja. */
  rows?: number
}

export const WEB_GROUPS: Record<WebGroup, { title: string; text: string }> = {
  naslovna: { title: 'Naslovnica', text: 'Prvo što kupac vidi kad otvori ardornamjestaj.com.' },
  traka: { title: 'Obavijest na vrhu', text: 'Uska traka iznad cijele stranice — za akciju, praznike ili promjenu radnog vremena.' },
  onama: { title: 'O nama', text: 'Stranica „O nama”.' },
  kontakt: { title: 'Kontakt i radno vrijeme', text: 'Telefoni i radno vrijeme na svim stranicama. Mijenja voditelj, uprava ili admin.' },
}

export const WEB_FIELDS: WebField[] = [
  { key: 'naslovna.oznaka', group: 'naslovna', label: 'Mali natpis iznad naslova', where: 'Sitna slova iznad velikog naslova.', kind: 'text', max: 60, def: 'Salon namještaja · Banja Luka · od 1996.' },
  { key: 'naslovna.naslov', group: 'naslovna', label: 'Veliki naslov', where: 'Najveći tekst na stranici. Svaki red ovdje = jedan red na webu (najviše 3). Zadnja riječ je istaknuta bojom.', kind: 'textarea', rows: 3, max: 90, def: 'Tvoj dom zaslužuje\nnamještaj koji ga\nčini boljim.' },
  { key: 'naslovna.podnaslov', group: 'naslovna', label: 'Tekst ispod naslova', where: 'Jedna do dvije rečenice ispod velikog naslova.', kind: 'textarea', rows: 2, max: 200, def: 'Kreiraj svoj dom po mjeri — uz stručne savjete, namještaj iz vlastitog pogona i potpunu podršku od ideje do montaže.' },
  { key: 'naslovna.slika', group: 'naslovna', label: 'Velika fotografija', where: 'Fotografija preko cijelog ekrana iza naslova. Najbolje vodoravna, svijetla, bez teksta na slici.', kind: 'image', max: 0, def: '' },
  { key: 'naslovna.prica.naslov', group: 'naslovna', label: 'Naslov „Naša priča”', where: 'Dio ispod velike fotografije.', kind: 'textarea', rows: 2, max: 110, def: 'Od 1996. uređujemo domove u kojima se lijepo živi — komad po komad.' },
  { key: 'naslovna.prica.tekst', group: 'naslovna', label: 'Tekst „Naša priča”', where: 'Odlomak ispod naslova „Naša priča”.', kind: 'textarea', rows: 4, max: 400, def: 'Počeli smo kao distributer namještaja, 2007. otvorili salon od 6000 m² u mirnom dijelu Obilićeva, a 2016. pokrenuli vlastiti pogon. Danas ti možemo ponuditi i gotov komad sa zalihe i namještaj napravljen tačno za tvoj prostor.' },
  { key: 'naslovna.pomjeri.naslov', group: 'naslovna', label: 'Naslov „Namještaj po mjeri”', where: 'Tamni dio o kuhinjama i plakarima po mjeri.', kind: 'text', max: 80, def: 'Svaki centimetar tvog prostora — iskorišten.' },
  { key: 'naslovna.pomjeri.tekst', group: 'naslovna', label: 'Tekst „Namještaj po mjeri”', where: 'Odlomak pored naslova o namještaju po mjeri.', kind: 'textarea', rows: 3, max: 300, def: 'Kuhinje, ugradbeni plakari, američki ormari i komode iz našeg pogona. Dolazimo na mjerenje, crtamo 3D prijedlog i montiramo — jedan tim od prve skice do zadnjeg šarafa.' },
  { key: 'naslovna.kontakt.naslov', group: 'naslovna', label: 'Naslov kod obrasca', where: 'Dno naslovnice, pored obrasca za upit.', kind: 'text', max: 60, def: 'Dođi, sjedni, isprobaj.' },

  { key: 'traka.tekst', group: 'traka', label: 'Tekst obavijesti', where: 'Prazno = traka se ne prikazuje. Npr. „Black Friday: −20 % na garniture do nedjelje”.', kind: 'text', max: 110, def: '' },
  { key: 'traka.link', group: 'traka', label: 'Kamo vodi klik (nije obavezno)', where: 'Npr. /akcije/ ili /kontakt/. Prazno = traka nije klikabilna.', kind: 'text', max: 120, def: '' },
  { key: 'traka.do', group: 'traka', label: 'Prikazuj do (uključivo)', where: 'Nakon tog dana traka sama nestane. Prazno = dok je ne obrišeš.', kind: 'date', max: 10, def: '' },

  { key: 'onama.naslov', group: 'onama', label: 'Naslov stranice', where: 'Veliki naslov na vrhu stranice „O nama”.', kind: 'textarea', rows: 2, max: 110, def: 'Od 1996. uređujemo domove u kojima se lijepo živi — komad po komad.' },
  { key: 'onama.podnaslov', group: 'onama', label: 'Rečenica ispod naslova', where: 'Ispod velikog naslova.', kind: 'text', max: 120, def: 'Ne prodajemo komad — pomažemo ti da dom proradi.' },
  { key: 'onama.tekst', group: 'onama', label: 'Naša priča', where: 'Glavni tekst. Prazan red između odlomaka = novi odlomak.', kind: 'textarea', rows: 8, max: 1500, def: 'ARDOR je osnovan 1996. u Banjoj Luci kao distributer namještaja. Godinama smo dovozili namještaj vodećih proizvođača i učili što kupcima zaista treba — i što im najčešće nedostaje.\n\n2007. smo otvorili distributivno-prodajni centar od 6000 m² u mirnom dijelu Obilićeva. Tu možeš sjesti na svaku garnituru, leći na madrac i otvoriti svaki ormar prije nego odlučiš.\n\n2016. smo pokrenuli vlastiti proizvodni pogon. Od tada radimo kuhinje, ugradbene plakare, američke ormare i komode tačno po mjeri prostora — od mjerenja i 3D prijedloga do montaže.' },

  { key: 'kontakt.telefon', group: 'kontakt', label: 'Telefon salona', where: 'U podnožju, na Kontaktu i u gumbu „Nazovi”.', kind: 'text', max: 30, def: '051 433 750' },
  { key: 'kontakt.mobitel', group: 'kontakt', label: 'Mobitel (Viber i WhatsApp)', where: 'Gumbi Viber i WhatsApp vode na ovaj broj.', kind: 'text', max: 30, def: '065 436 420' },
  { key: 'kontakt.radni', group: 'kontakt', label: 'Radno vrijeme radnim danom', where: 'Ponedjeljak – petak.', kind: 'text', max: 30, def: '08:00 – 20:30' },
  { key: 'kontakt.subota', group: 'kontakt', label: 'Radno vrijeme subotom', where: 'Subota.', kind: 'text', max: 30, def: '08:00 – 19:00' },
  { key: 'kontakt.nedjelja', group: 'kontakt', label: 'Nedjelja', where: 'Npr. „Zatvoreno”.', kind: 'text', max: 30, def: 'Zatvoreno' },
]

export const FIELD = new Map(WEB_FIELDS.map((f) => [f.key, f]))

/** Tko smije mijenjati koju grupu. Dostava ne uređuje web. */
export function canEditGroup(role: Role, group: WebGroup) {
  if (role === 'dostava') return false
  if (group === 'kontakt') return role === 'admin' || role === 'uprava' || role === 'voditelj'
  return true
}

/** Objavljuje članke (trgovac i operativa šalju na odobrenje). */
export const canPublish = (role: Role) => role === 'admin' || role === 'uprava' || role === 'voditelj'

const TIME = /^\d{1,2}[:.]\d{2}\s*[–-]\s*\d{1,2}[:.]\d{2}$/

/** Provjera jednog polja. Vraća očišćenu vrijednost ili poruku greške. */
export function cleanField(key: string, raw: unknown): { ok: string } | { error: string } {
  const f = FIELD.get(key)
  if (!f) return { error: 'Nepoznato polje.' }
  let v = String(raw ?? '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').trim()
  if (f.kind === 'text' || f.kind === 'date') v = v.replace(/\s+/g, ' ')
  if (f.kind === 'image') return /^\d*$/.test(v) ? { ok: v } : { error: 'Neispravna slika.' }
  if (v.length > f.max) return { error: `„${f.label}” može imati najviše ${f.max} znakova (sada ${v.length}).` }
  if (f.key === 'naslovna.naslov' && v.split('\n').length > 3) return { error: 'Veliki naslov može imati najviše 3 reda.' }
  if (f.kind === 'date' && v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { error: 'Datum nije ispravan.' }
  if (f.key === 'traka.link' && v && !/^(\/[\w\-/?=&#.%]*|https:\/\/[^\s<>"]+)$/.test(v))
    return { error: 'Link mora početi s / (stranica našeg weba, npr. /akcije/) ili s https://.' }
  if ((f.key === 'kontakt.telefon' || f.key === 'kontakt.mobitel') && v && phoneDigits(v).length < 8)
    return { error: 'Broj telefona nije ispravan (npr. 051 433 750).' }
  if ((f.key === 'kontakt.radni' || f.key === 'kontakt.subota') && v && !TIME.test(v) && !/^zatvoreno$/i.test(v))
    return { error: 'Radno vrijeme upiši kao „08:00 – 20:30” ili „Zatvoreno”.' }
  if (/<\s*\/?\s*[a-z]/i.test(v)) return { error: 'Tekst ne smije sadržavati HTML oznake.' }
  return { ok: v }
}

/** Domaći broj → međunarodni bez nule: „051 433 750” → „38751433750”. */
export function phoneDigits(s: string) {
  const d = s.replace(/\D/g, '')
  if (d.startsWith('00387')) return d.slice(2)
  if (d.startsWith('387')) return d
  if (d.startsWith('0')) return `387${d.slice(1)}`
  return d
}

/** Zadani tekstovi + spremljene izmjene (prazna spremljena vrijednost = zadano, osim trake). */
export function mergeTexts(saved: Record<string, string>) {
  const out: Record<string, string> = {}
  for (const f of WEB_FIELDS) {
    const v = saved[f.key]
    out[f.key] = v !== undefined && (v !== '' || f.group === 'traka') ? v : f.def
  }
  return out
}

/** Je li traka aktivna danas (dan u formatu GGGG-MM-DD, Banja Luka). */
export function barActive(texts: Record<string, string>, today: string) {
  return !!texts['traka.tekst'] && (!texts['traka.do'] || texts['traka.do'] >= today)
}

/* ───────────────────────── članci ───────────────────────── */

export const ARTICLE_STATUS = { nacrt: 'Nacrt', ceka: 'Čeka odobrenje', objavljen: 'Objavljen' } as const
export type ArticleStatus = keyof typeof ARTICLE_STATUS
export const ARTICLE_THEMES = ['Kuhinje', 'Dnevni boravak', 'Spavaća soba', 'Po mjeri', 'Održavanje', 'Materijali', 'Trendovi', 'Savjeti'] as const

export interface ArticleInput {
  title: string
  summary: string
  theme: string
  room: string
  body: string
}

/** Provjera članka. strict = za slanje na odobrenje / objavu (nacrt smije biti nedovršen). */
export function cleanArticle(a: Partial<ArticleInput>, strict: boolean): { ok: ArticleInput } | { error: string } {
  const s = (v: unknown, n: number) => String(v ?? '').replace(/\r/g, '').trim().slice(0, n)
  const v: ArticleInput = {
    title: s(a.title, 120).replace(/\s+/g, ' '),
    summary: s(a.summary, 300).replace(/\s+/g, ' '),
    theme: s(a.theme, 40),
    room: s(a.room, 40),
    body: s(a.body, 20000),
  }
  if (v.title.length < 5) return { error: 'Upiši naslov članka (barem 5 znakova).' }
  if (/<\s*\/?\s*[a-z]/i.test(v.body + v.title + v.summary)) return { error: 'Tekst ne smije sadržavati HTML oznake.' }
  if (strict) {
    if (v.title.length > 90) return { error: 'Naslov je predug — najviše 90 znakova (Google prikaže oko 60).' }
    if (v.summary.length < 40) return { error: 'Upiši kratki opis (barem 40 znakova) — vidi se u Googleu i na popisu članaka.' }
    if (v.summary.length > 160) return { error: `Kratki opis može imati najviše 160 znakova (sada ${v.summary.length}).` }
    if (!v.theme) return { error: 'Odaberi temu članka.' }
    if (words(v.body) < 120) return { error: `Članak je prekratak (${words(v.body)} riječi) — za Google treba barem 120 riječi.` }
  }
  return { ok: v }
}

export const words = (s: string) => (s.match(/[\p{L}\p{N}]+/gu) ?? []).length
/** Minute čitanja (oko 200 riječi u minuti, najmanje 1). */
export const readingMinutes = (body: string) => Math.max(1, Math.round(words(body) / 200))
export const articleSlug = (title: string) => slugify(title).slice(0, 80).replace(/-+$/, '')

/**
 * Dozvoljeni prijelazi statusa. Trgovac: nacrt ⇄ čeka. Voditelj i više: sve, uključujući objavu i povlačenje.
 * Objavljeni članak trgovac ne mijenja (da se ne pojavi neodobren tekst na webu).
 */
export function canSetStatus(role: Role, from: ArticleStatus, to: ArticleStatus) {
  if (role === 'dostava') return false
  if (canPublish(role)) return true
  return from !== 'objavljen' && to !== 'objavljen'
}

export function canEditArticle(role: Role, status: ArticleStatus) {
  if (role === 'dostava') return false
  return canPublish(role) || status !== 'objavljen'
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const inline = (s: string) =>
  esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((\/[^)\s]*|https:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')

/**
 * Jednostavan zapis članka → HTML (isti prikaz u aplikaciji i na webu):
 *   „## Naslov” = podnaslov, „- stavka” = nabrajanje, „1. stavka” = numerirano,
 *   **podebljano**, [tekst](/adresa/) = link, prazan red = novi odlomak.
 */
export function articleHtml(body: string) {
  const out: string[] = []
  let list: 'ul' | 'ol' | null = null
  let para: string[] = []
  const flushPara = () => {
    if (para.length) out.push(`<p>${para.map(inline).join('<br>')}</p>`)
    para = []
  }
  const closeList = () => {
    if (list) out.push(`</${list}>`)
    list = null
  }
  for (const raw of body.replace(/\r/g, '').split('\n')) {
    const line = raw.trim()
    const h = /^#{2,3}\s+(.+)$/.exec(line)
    const ul = /^[-–•*]\s+(.+)$/.exec(line)
    const ol = /^\d+[.)]\s+(.+)$/.exec(line)
    if (!line) {
      flushPara()
      closeList()
    } else if (h) {
      flushPara()
      closeList()
      out.push(`<h2>${inline(h[1])}</h2>`)
    } else if (ul || ol) {
      flushPara()
      const kind = ul ? 'ul' : 'ol'
      if (list !== kind) {
        closeList()
        out.push(`<${kind}>`)
        list = kind
      }
      out.push(`<li>${inline((ul ?? ol)![1])}</li>`)
    } else {
      closeList()
      para.push(line)
    }
  }
  flushPara()
  closeList()
  return out.join('\n')
}
