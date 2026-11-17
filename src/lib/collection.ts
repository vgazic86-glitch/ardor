/**
 * Naplata potraživanja: rokovi, rate i kašnjenje (čista logika, isto na serveru i u pregledniku).
 * Pravila (Vladimir, 17. 11. 2026.):
 * - ostatak dospijeva na dan isporuke (`issuedAt`), osim ako je kod prodaje upisan drugi rok (`dueDate`);
 * - „Rate” = salon kreditira kupca: plan rata, a dio koji rate ne pokrivaju (avans) dospijeva kao gore;
 * - uplate pokrivaju obaveze redom, od najstarije.
 */
import { date, money } from './format'
import { daysBetween } from './reports'
import { orderTotal, outstanding } from './stats'
import type { Customer, Installment, Order } from './types'

const r2 = (v: number) => Math.round(v * 100) / 100

/** Isti dan u mjesecu `n` mjeseci kasnije (31. jan + 1 = 28./29. feb). */
export function addMonths(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1 + n, 1))
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate()
  t.setUTCDate(Math.min(d, last))
  return t.toISOString().slice(0, 10)
}

/** Jednake mjesečne rate; zadnja rata preuzima zaokruživanje. */
export function planInstallments(amount: number, count: number, first: string): Installment[] {
  if (count < 1 || amount <= 0) return []
  const each = Math.floor((amount / count) * 100) / 100
  return Array.from({ length: count }, (_, i) => ({
    seq: i + 1,
    date: addMonths(first, i),
    amount: i === count - 1 ? r2(amount - each * (count - 1)) : each,
  }))
}

export interface Receivable {
  order: Order
  /** Ukupno preostalo za uplatu. */
  left: number
  /** Dospjelo do danas, a neplaćeno. */
  overdue: number
  /** Najstariji neplaćeni rok (od njega se broji kašnjenje), ili null. */
  oldestDue: string | null
  /** Dana kašnjenja (0 = nije u kašnjenju ili dospijeva danas). */
  daysLate: number
  /** Sljedeća obaveza koja još nije dospjela. */
  next: { date: string | null; amount: number } | null
  /** Rate: koliko ih je plaćeno od ukupno. */
  plan: { paid: number; count: number } | null
}

export type ReceivableState = 'kasni' | 'dospijeva' | 'nije_dospjelo'

export function receivableState(r: Receivable): ReceivableState {
  if (r.daysLate > 0) return 'kasni'
  if (r.overdue > 0.5) return 'dospijeva'
  return 'nije_dospjelo'
}

/** Stanje naplate jedne prodaje na dan `today`, ili null ako kupac ništa ne duguje. */
export function receivable(o: Order, today: string): Receivable | null {
  const left = outstanding(o)
  if (left < 0.5) return null
  const total = orderTotal(o)
  const base = o.dueDate ?? o.issuedAt
  const inst = o.paymentMethod === 'Rate' ? [...(o.installments ?? [])].sort((a, b) => a.seq - b.seq) : []
  const schedule: { date: string | null; amount: number; seq?: number }[] = []
  if (inst.length) {
    const upfront = r2(total - inst.reduce((s, i) => s + i.amount, 0))
    if (upfront > 0.5) schedule.push({ date: base, amount: upfront })
    for (const i of inst) schedule.push({ date: i.date, amount: i.amount, seq: i.seq })
  } else schedule.push({ date: base, amount: total })

  let paid = o.paid
  let overdue = 0
  let oldestDue: string | null = null
  let next: Receivable['next'] = null
  let paidInst = 0
  for (const s of schedule) {
    const cover = Math.min(paid, s.amount)
    paid -= cover
    const rest = r2(s.amount - cover)
    if (rest < 0.5) {
      if (s.seq) paidInst++
      continue
    }
    if (s.date && s.date <= today) {
      overdue += rest
      oldestDue ??= s.date
    } else if (!next) next = { date: s.date, amount: rest }
  }
  return {
    order: o,
    left,
    overdue: r2(overdue),
    oldestDue,
    daysLate: oldestDue ? Math.max(0, daysBetween(oldestDue, today)) : 0,
    next,
    plan: inst.length ? { paid: paidInst, count: inst.length } : null,
  }
}

/** Sva potraživanja, najduže kašnjenje prvo, pa po iznosu. */
export function receivables(orders: Order[], today: string) {
  return orders
    .map((o) => receivable(o, today))
    .filter((r): r is Receivable => !!r)
    .sort((a, b) => b.daysLate - a.daysLate || b.overdue - a.overdue || b.left - a.left)
}

/** Tekst podsjetnika kupcu (Viber, WhatsApp, SMS). */
export function reminderText(r: Receivable, c: Customer) {
  const ime = c.name.split(' ')[0] || c.name
  const L = [`Poštovani/a ${ime},`, '']
  const o = r.order
  if (r.overdue > 0.5) {
    L.push(
      `ljubazno podsjećamo da je za narudžbu ${o.number} dospjelo za uplatu ${money(r.overdue)}` +
        (r.oldestDue ? ` (rok: ${date(r.oldestDue)})` : '') +
        '.',
    )
    if (r.plan && r.next?.date) L.push(`Sljedeća rata: ${money(r.next.amount)} do ${date(r.next.date)}.`)
  } else if (r.next?.date) {
    L.push(`ljubazno podsjećamo da za narudžbu ${o.number} ${r.plan ? 'sljedeća rata' : 'uplata'} od ${money(r.next.amount)} dospijeva ${date(r.next.date)}.`)
  } else {
    L.push(`ljubazno podsjećamo da je za narudžbu ${o.number} preostalo za uplatu ${money(r.left)}.`)
  }
  L.push('Uplatu možete izvršiti u salonu ili na naš račun. Ako ste već platili, zanemarite ovu poruku.', '', 'ARDOR namještaj, Banja Luka')
  return L.join('\n')
}
