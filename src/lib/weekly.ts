/**
 * Sedmični izvještaj upravi (e-pošta svakog ponedjeljka u 7:00).
 * Čista logika: sastavlja brojke za prošlu sedmicu (pon–ned) i pravi HTML/tekst poruke.
 */
import { date, money, pct } from './format'
import { addDays, daysBetween, debts, paymentsIn, realized, sum, type Period } from './reports'
import { isRevenue, monthKey, orderTotal, revenueIn, waitingOrders } from './stats'
import {
  targetFor,
  type Customer,
  type Employee,
  type Order,
  type Product,
  type StockMovement,
} from './types'

export interface WeeklyComplaint {
  number: string
  customerName: string
  productName: string
  status: string
  dueDate: string | null
}

export interface WeeklyInput {
  today: string
  orders: Order[]
  products: Product[]
  employees: Employee[]
  customers: Customer[]
  movements: StockMovement[]
  complaints: WeeklyComplaint[]
}

const OPEN_COMPLAINT = ['prijavljena', 'u_obradi', 'kod_dobavljaca']

/** Prošla sedmica od ponedjeljka do nedjelje, gledano s dana `today`. */
export function previousWeek(today: string): Period {
  const dow = (new Date(today + 'T12:00:00Z').getUTCDay() + 6) % 7 // 0 = ponedjeljak
  const monday = addDays(today, -dow)
  return { from: addDays(monday, -7), to: addDays(monday, -1) }
}

const inWeek = (iso: string, p: Period) => iso >= p.from && iso <= p.to

function salesIn(orders: Order[], p: Period) {
  const list = orders.filter((o) => isRevenue(o) && inWeek(o.date, p))
  return { value: sum(list, orderTotal), count: list.length, list }
}

export function buildWeekly(input: WeeklyInput) {
  const { today, orders, products, employees, customers, movements, complaints } = input
  const period = previousWeek(today)
  const prev = { from: addDays(period.from, -7), to: addDays(period.to, -7) }
  const sales = salesIn(orders, period)
  const prevSales = salesIn(orders, prev)

  const month = monthKey(period.to)
  const salesPeople = employees.filter((e) => e.role !== 'Dostava i montaža' && e.id !== '0')
  const target = sum(salesPeople, (e) => targetFor(e, month))
  const monthRevenue = revenueIn(orders, month)

  const empName = new Map(employees.map((e) => [e.id, e.name]))
  const bySeller = new Map<string, { name: string; value: number; count: number }>()
  for (const o of sales.list) {
    const s = bySeller.get(o.employeeId) ?? { name: empName.get(o.employeeId) ?? '—', value: 0, count: 0 }
    s.value += orderTotal(o)
    s.count += 1
    bySeller.set(o.employeeId, s)
  }

  const prodName = new Map(products.map((p) => [p.id, p.name]))
  const byProduct = new Map<string, { name: string; qty: number; value: number }>()
  for (const o of sales.list)
    for (const i of o.items) {
      const r = byProduct.get(i.productId) ?? { name: prodName.get(i.productId) ?? 'artikal', qty: 0, value: 0 }
      r.qty += i.qty
      r.value += i.qty * i.unitPrice * (1 - i.discountPct / 100)
      byProduct.set(i.productId, r)
    }

  const waiting = waitingOrders(orders, products)
  const waitingList = orders.filter((o) => waiting.has(o.id))

  const cust = new Map(customers.map((c) => [c.id, c]))
  const unknown = (id: string) => ({ id, name: 'Kupac' }) as Customer
  const owed = debts(orders, (id) => cust.get(id) ?? unknown(id), today)

  const open = complaints.filter((c) => OPEN_COMPLAINT.includes(c.status))
  const overdue = open
    .filter((c) => c.dueDate && c.dueDate < today)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))

  return {
    today,
    period,
    sales: { value: sales.value, count: sales.count, prevValue: prevSales.value },
    realized: sum(realized(orders, movements, period), (r) => r.gross),
    collected: sum(paymentsIn(orders, period), (p) => p.amount),
    month: { key: month, revenue: monthRevenue, target, pct: target ? monthRevenue / target : 0 },
    sellers: [...bySeller.values()].sort((a, b) => b.value - a.value),
    topProducts: [...byProduct.values()].sort((a, b) => b.value - a.value).slice(0, 5),
    waiting: {
      count: waitingList.length,
      value: sum(waitingList, orderTotal),
      oldestDays: waitingList.length ? Math.max(...waitingList.map((o) => daysBetween(o.date, today))) : 0,
    },
    debts: {
      total: sum(owed, (d) => d.due),
      count: owed.length,
      top: owed.slice(0, 5).map((d) => ({ name: d.customer.name, due: d.due, days: d.days })),
    },
    complaints: { open: open.length, overdue: overdue.length, overdueList: overdue.slice(0, 5) },
  }
}

export type Weekly = ReturnType<typeof buildWeekly>

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function weeklySubject(w: Weekly) {
  return `ARDOR — sedmični izvještaj ${date(w.period.from)} – ${date(w.period.to)}`
}

function change(now: number, before: number) {
  if (!before) return now ? 'prethodna sedmica bez prodaje' : '—'
  const d = (now - before) / before
  return `${d >= 0 ? '+' : '−'}${pct(Math.abs(d))} u odnosu na prethodnu sedmicu`
}

/** Tekst poruke (rezerva za programe koji ne prikazuju HTML). */
export function weeklyText(w: Weekly, appUrl: string) {
  const L: string[] = [
    weeklySubject(w),
    '',
    `Prodaja sedmice: ${money(w.sales.value)} (${w.sales.count} prodaja; ${change(w.sales.value, w.sales.prevValue)})`,
    `Isporučeno kupcima: ${money(w.realized)} · Naplaćeno: ${money(w.collected)}`,
    `Plan mjeseca: ${money(w.month.revenue)} od ${money(w.month.target)} (${pct(w.month.pct)})`,
    '',
    'Po prodavaču:',
    ...(w.sellers.length ? w.sellers.map((s) => `  ${s.name}: ${money(s.value)} (${s.count})`) : ['  —']),
    '',
    'Najprodavaniji artikli:',
    ...(w.topProducts.length ? w.topProducts.map((p) => `  ${p.name}: ${p.qty} kom, ${money(p.value)}`) : ['  —']),
    '',
    `Narudžbe kupaca (čekaju robu): ${w.waiting.count}, ${money(w.waiting.value)}, najduže ${w.waiting.oldestDays} dana`,
    `Potraživanja od kupaca: ${money(w.debts.total)} (${w.debts.count} kupaca)`,
    ...w.debts.top.map((d) => `  ${d.name}: ${money(d.due)}, ${d.days} dana`),
    `Reklamacije: ${w.complaints.open} otvorenih, ${w.complaints.overdue} s probijenim rokom`,
    ...w.complaints.overdueList.map((c) => `  ${c.number} ${c.customerName}: rok ${date(c.dueDate!)}`),
    '',
    `Detalji u aplikaciji: ${appUrl}`,
  ]
  return L.join('\n')
}

/** HTML poruke u ARDOR vizualu (samo inline stilovi — e-pošta ne podržava CSS datoteke). */
export function weeklyHtml(w: Weekly, appUrl: string) {
  const orange = '#F15A29'
  const grey = '#58595B'
  const font = "font-family:Ubuntu,'Segoe UI',Arial,sans-serif"
  const card = (label: string, value: string, note = '') =>
    `<td style="padding:12px;border:1px solid #eee;border-radius:8px;vertical-align:top;width:33%">
      <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${grey}">${label}</div>
      <div style="font-size:20px;font-weight:700;color:#222;margin-top:4px">${value}</div>
      ${note ? `<div style="font-size:12px;color:${grey};margin-top:2px">${note}</div>` : ''}
    </td>`
  const table = (head: string[], rows: string[][]) =>
    rows.length
      ? `<table cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px">
          <tr>${head.map((h, i) => `<th style="text-align:${i ? 'right' : 'left'};color:${grey};font-weight:600;border-bottom:2px solid ${orange}">${h}</th>`).join('')}</tr>
          ${rows.map((r) => `<tr>${r.map((c, i) => `<td style="text-align:${i ? 'right' : 'left'};border-bottom:1px solid #eee">${c}</td>`).join('')}</tr>`).join('')}
        </table>`
      : `<p style="font-size:13px;color:${grey}">Nema podataka.</p>`
  const h2 = (t: string) => `<h2 style="font-size:15px;color:${orange};margin:24px 0 8px">${t}</h2>`

  return `<!doctype html><html lang="bs"><body style="margin:0;background:#f6f4f1">
<div style="max-width:640px;margin:0 auto;background:#fff;padding:24px;${font};color:#222">
  <div style="border-bottom:3px solid ${orange};padding-bottom:12px;margin-bottom:16px">
    <div style="font-size:22px;font-weight:700;color:${orange}">ARDOR</div>
    <div style="font-size:14px;color:${grey}">Sedmični izvještaj · ${date(w.period.from)} – ${date(w.period.to)}</div>
  </div>
  <table cellspacing="8" style="width:100%;margin:0 -8px"><tr>
    ${card('Prodaja sedmice', money(w.sales.value), `${w.sales.count} prodaja · ${change(w.sales.value, w.sales.prevValue)}`)}
    ${card('Isporučeno', money(w.realized), `naplaćeno ${money(w.collected)}`)}
    ${card('Plan mjeseca', pct(w.month.pct), `${money(w.month.revenue)} od ${money(w.month.target)}`)}
  </tr></table>
  ${h2('Po prodavaču')}
  ${table(['Prodavač', 'Prodaja', 'Broj'], w.sellers.map((s) => [esc(s.name), money(s.value), String(s.count)]))}
  ${h2('Najprodavaniji artikli')}
  ${table(['Artikal', 'Kom', 'Iznos'], w.topProducts.map((p) => [esc(p.name), String(p.qty), money(p.value)]))}
  ${h2('Otvoreno')}
  <table cellspacing="8" style="width:100%;margin:0 -8px"><tr>
    ${card('Narudžbe kupaca', String(w.waiting.count), `${money(w.waiting.value)} · najduže ${w.waiting.oldestDays} dana`)}
    ${card('Potraživanja', money(w.debts.total), `${w.debts.count} kupaca`)}
    ${card('Reklamacije', String(w.complaints.open), `${w.complaints.overdue} s probijenim rokom`)}
  </tr></table>
  ${w.debts.top.length ? h2('Najveći dužnici') + table(['Kupac', 'Duguje', 'Dana'], w.debts.top.map((d) => [esc(d.name), money(d.due), String(d.days)])) : ''}
  ${w.complaints.overdueList.length ? h2('Reklamacije s probijenim rokom') + table(['Reklamacija', 'Kupac', 'Rok'], w.complaints.overdueList.map((c) => [esc(c.number), esc(c.customerName), date(c.dueDate!)])) : ''}
  <p style="margin-top:28px;font-size:13px"><a href="${esc(appUrl)}" style="color:${orange};font-weight:600">Otvori aplikaciju ARDOR</a></p>
  <p style="font-size:11px;color:#999">Poruku šalje aplikacija svakog ponedjeljka u 7:00. Primaoci su korisnici s ulogom administrator ili uprava koji imaju upisanu e-poštu (Korisnici i pristup).</p>
</div></body></html>`
}
