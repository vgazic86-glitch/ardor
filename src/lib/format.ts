import type { DeliveryStatus, MovementType, OrderStatus } from './types'

/** Valuta salona — promijenite na jednom mjestu ako treba (npr. EUR). */
export const CURRENCY = 'KM'

/** Stopa PDV-a; maloprodajne cijene su s uključenim PDV-om. */
export const VAT_RATE = 0.17
export const netOf = (gross: number) => gross / (1 + VAT_RATE)

/**
 * Formatiranje brojeva bez oslanjanja na Intl lokale (server i preglednik
 * moraju dati isti tekst): tačka za hiljade, zarez za decimale.
 */
function group(intPart: string) {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
const num = {
  format: (v: number) => {
    const r = Math.round(v)
    return (r < 0 ? '−' : '') + group(String(Math.abs(r)))
  },
}
const num2 = {
  format: (v: number) => {
    const [i, d] = Math.abs(v).toFixed(2).split('.')
    return (v < -0.004 ? '−' : '') + group(i) + ',' + d
  },
}

export const money = (v: number) => `${num.format(Math.round(v))} ${CURRENCY}`
export const money2 = (v: number) => `${num2.format(v)} ${CURRENCY}`
export const count = (v: number) => num.format(v)
export const pct = (v: number) => `${Math.round(v * 100)}%`

const months = [
  'jan',
  'feb',
  'mar',
  'apr',
  'maj',
  'jun',
  'jul',
  'aug',
  'sep',
  'okt',
  'nov',
  'dec',
]
const monthsLong = [
  'januar',
  'februar',
  'mart',
  'april',
  'maj',
  'juni',
  'juli',
  'august',
  'septembar',
  'oktobar',
  'novembar',
  'decembar',
]
const days = ['ned', 'pon', 'uto', 'sri', 'čet', 'pet', 'sub']

export const monthShort = (m: number) => months[m]
export const monthLong = (m: number) => monthsLong[m]

export function date(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d}. ${months[m - 1]} ${y}.`
}
export function dateShort(iso: string) {
  const [, m, d] = iso.split('-').map(Number)
  return `${d}. ${months[m - 1]}`
}
export function weekday(iso: string) {
  return days[new Date(iso + 'T12:00:00Z').getUTCDay()]
}

export const movementLabel: Record<MovementType, string> = {
  pocetno: 'Početno stanje',
  primka: 'Prijem robe',
  izlaz: 'Izlaz kupcu',
  povrat: 'Povrat',
  korekcija: 'Korekcija / inventura',
  premjestaj: 'Interna primka (premještaj)',
  izvoz: 'Izvoz (račun)',
}

export const movementTone: Record<MovementType, string> = {
  pocetno: 'bg-stone-100 text-stone-700 ring-stone-300',
  primka: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  izlaz: 'bg-sky-50 text-sky-800 ring-sky-200',
  povrat: 'bg-amber-50 text-amber-800 ring-amber-200',
  korekcija: 'bg-violet-50 text-violet-800 ring-violet-200',
  premjestaj: 'bg-violet-50 text-violet-800 ring-violet-200',
  izvoz: 'bg-orange-50 text-orange-800 ring-orange-200',
}

/** Iznos iz polja: „8.450,00”, „8450,5”, „8450.5” → broj (uz zarez su tačke hiljade). */
export const parseAmount = (v: string) => {
  const t = String(v ?? '').replace(/\s/g, '')
  return Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t) || 0
}

export const orderStatusLabel: Record<OrderStatus, string> = {
  ponuda: 'Ponuda',
  potvrđena: 'Potvrđena',
  u_izradi: 'U izradi',
  spremna: 'Spremna',
  isporučena: 'Isporučena',
  otkazana: 'Otkazana',
}

export const orderStatusTone: Record<OrderStatus, string> = {
  ponuda: 'bg-stone-100 text-stone-700 ring-stone-300',
  potvrđena: 'bg-sky-50 text-sky-800 ring-sky-200',
  u_izradi: 'bg-amber-50 text-amber-800 ring-amber-200',
  spremna: 'bg-violet-50 text-violet-800 ring-violet-200',
  isporučena: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  otkazana: 'bg-rose-50 text-rose-700 ring-rose-200',
}

export const deliveryStatusLabel: Record<DeliveryStatus, string> = {
  zakazana: 'Zakazana',
  u_putu: 'U putu',
  dostavljeno: 'Dostavljeno',
  odgođena: 'Odgođena',
}

export const deliveryStatusTone: Record<DeliveryStatus, string> = {
  zakazana: 'bg-sky-50 text-sky-800 ring-sky-200',
  u_putu: 'bg-amber-50 text-amber-800 ring-amber-200',
  dostavljeno: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  odgođena: 'bg-rose-50 text-rose-700 ring-rose-200',
}
