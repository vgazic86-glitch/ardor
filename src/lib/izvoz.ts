/** Izvoz: ponude stranim kupcima i računi koji iz njih nastaju. Čista logika (iznosi, brojevi, rokovi). */

export type ExportOfferStatus = 'nacrt' | 'poslana' | 'prihvacena' | 'odbijena'
export type ExportInvoiceStatus = 'izdan' | 'placen' | 'storniran'

export const OFFER_STATUS_LABEL: Record<ExportOfferStatus, string> = {
  nacrt: 'Nacrt',
  poslana: 'Poslana kupcu',
  prihvacena: 'Prihvaćena',
  odbijena: 'Odbijena',
}

export const INVOICE_STATUS_LABEL: Record<ExportInvoiceStatus, string> = {
  izdan: 'Izdan, čeka uplatu',
  placen: 'Plaćen',
  storniran: 'Storniran',
}

/** Valute i koliko KM vrijedi 1 jedinica (EUR je fiksan; ostale se upisuju po kursnoj listi CBBiH). */
export const CURRENCIES: { code: string; label: string; rate: number | null }[] = [
  { code: 'EUR', label: 'EUR (€)', rate: 1.95583 },
  { code: 'KM', label: 'KM (BAM)', rate: 1 },
  { code: 'USD', label: 'USD ($)', rate: null },
  { code: 'CHF', label: 'CHF', rate: null },
]

export const INCOTERMS = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF']

export const DEFAULT_VAT_NOTE =
  'Oslobođeno plaćanja PDV-a — izvoz dobara (član 27. Zakona o PDV-u BiH). / VAT exempt — export of goods (Art. 27 of the VAT Law of BiH).'

export const DEFAULT_VALID_DAYS = 30

export interface ExportLine {
  qty: number
  unitPrice: number
  discountPct: number
}

const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

/** Iznos stavke u valuti ponude, zaokružen na 2 decimale. */
export function lineTotal(l: ExportLine) {
  const disc = Math.min(100, Math.max(0, l.discountPct || 0))
  return r2(l.qty * l.unitPrice * (1 - disc / 100))
}

/** Ukupno ponude/računa = zbir zaokruženih stavki (isto kao na PDF-u). */
export function offerTotal(lines: ExportLine[]) {
  return r2(lines.reduce((s, l) => s + lineTotal(l), 0))
}

/** Protuvrijednost u KM. */
export function toKm(amount: number, rate: number) {
  return r2(amount * (rate || 0))
}

/** Prijedlog izvozne cijene iz maloprodajne (s PDV-om, KM): bez PDV-a, preračunato u valutu. */
export function suggestPrice(retailKm: number, rate: number, vatRate = 0.17) {
  if (!rate) return 0
  return r2(retailKm / (1 + vatRate) / rate)
}

/** Sljedeći broj u godini: IZP-2026-0001. Postojeći brojevi drugih godina se ne gledaju. */
export function nextNumber(prefix: string, year: number, existing: Iterable<string>) {
  const head = `${prefix}-${year}-`
  let max = 0
  for (const n of existing) {
    const rest = n.startsWith(head) ? n.slice(head.length) : ''
    if (/^[0-9]+$/.test(rest)) max = Math.max(max, Number(rest))
  }
  return `${prefix}-${year}-${String(max + 1).padStart(4, '0')}`
}

/** Datum + n dana (ISO yyyy-mm-dd, bez vremenske zone). */
export function addDays(iso: string, days: number) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + Math.round(days || 0))
  return d.toISOString().slice(0, 10)
}

/** Ponuda je istekla ako nije odlučena, a rok važenja je prošao. */
export function isExpired(o: { status: ExportOfferStatus; validUntil: string }, today: string) {
  return (o.status === 'nacrt' || o.status === 'poslana') && o.validUntil < today
}

/** Koje promjene statusa ponude su dopuštene (prihvaćena se mijenja samo stornom računa). */
export function canMoveOffer(from: ExportOfferStatus, to: ExportOfferStatus) {
  if (from === to) return false
  if (from === 'prihvacena') return false
  if (to === 'nacrt') return from === 'poslana' || from === 'odbijena'
  return true
}

/** Iznos s valutom za ekran: 1.234,50 EUR (bez Intl, isto na serveru i u pregledniku). */
export function fmtAmount(v: number, currency: string) {
  const [i, d] = Math.abs(v).toFixed(2).split('.')
  return `${v < 0 ? '-' : ''}${i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${d} ${currency}`
}
