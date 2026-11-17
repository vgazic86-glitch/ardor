/**
 * Sažetak poslovanja za AI asistenta (samo admin i uprava).
 * Kratak tekst s brojkama iz snimka: promet i plan, realizacija i marža, prodavači,
 * artikli, zalihe, narudžbe kupaca i naplata. Plaće i ugovori NIKAD nisu u snimku pa ni ovdje.
 */
import { receivables } from './collection'
import { monthLong, pct } from './format'
import { addDays, marginBy, monthRange, realized, stockValue, sum, type Period } from './reports'
import { employeeStats, isRevenue, lastMonths, monthKey, orderTotal, revenueIn, waitingOrders } from './stats'
import { targetFor, type Customer, type Employee, type Order, type Product, type StockMovement } from './types'

export interface BriefInput {
  today: string
  orders: Order[]
  products: Product[]
  employees: Employee[]
  customers: Customer[]
  movements: StockMovement[]
}

/** Iznos u KM s dva decimala, bez Intl (isto na serveru i u testu). */
export const kmText = (n: number) => {
  const neg = n < 0
  const [i, d] = Math.abs(n).toFixed(2).split('.')
  return `${neg ? '−' : ''}${i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${d} KM`
}
const mPct = (margin: number, net: number) => (net ? pct(margin / net) : '—')
const monthLabel = (key: string) => `${monthLong(Number(key.slice(5, 7)) - 1)} ${key.slice(0, 4)}.`

export function buildBrief(input: BriefInput) {
  const { today, orders, products, employees, customers, movements } = input
  const month = monthKey(today)
  const months = lastMonths(month, 6)
  const salesPeople = employees.filter((e) => e.role !== 'Dostava i montaža' && e.id !== '0')
  const target = sum(salesPeople, (e) => targetFor(e, month))
  const byId = new Map(products.map((p) => [p.id, p]))
  // Arhivirani artikli nisu u snimku: zamjena s nabavnom 0 (marža se tada računa iz kretanja zaliha).
  const missing = (id: string): Product => ({
    id,
    sku: '',
    name: 'arhivirani artikal',
    category: products[0]?.category ?? 'Sjedeće garniture',
    price: 0,
    purchasePrice: 0,
    avgCost: 0,
    stock: 0,
    minStock: 0,
    supplierId: null,
    supplier: '—',
    leadTimeDays: 0,
    imageId: null,
    thumbId: null,
  })
  const productById = (id: string) => byId.get(id) ?? missing(id)
  const custName = new Map(customers.map((c) => [c.id, c.name]))
  const L: string[] = []

  // Promet (ugovoreno, po datumu prodaje) i plan
  L.push('## Promet (ugovorene prodaje s PDV-om, po datumu prodaje)')
  for (const k of months) L.push(`- ${monthLabel(k)}: ${kmText(revenueIn(orders, k))}`)
  const mtd = revenueIn(orders, month)
  L.push(`- Plan za ${monthLabel(month)}: ${kmText(target)}; ostvareno ${kmText(mtd)} (${target ? pct(mtd / target) : '—'}).`)

  // Realizacija i marža (roba izašla iz salona)
  L.push('', '## Realizacija i marža (roba izašla iz salona; neto bez PDV-a)')
  for (const k of months.slice(-3)) {
    const rows = realized(orders, movements, monthRange(k))
    const net = sum(rows, (r) => r.net)
    const margin = sum(rows, (r) => r.margin)
    L.push(`- ${monthLabel(k)}: prihod neto ${kmText(net)}, nabavna vrijednost ${kmText(sum(rows, (r) => r.cogs))}, marža ${kmText(margin)} (${mPct(margin, net)})`)
  }
  const last90: Period = { from: addDays(today, -89), to: today }
  const sales90 = realized(orders, movements, last90)
  L.push('', '## Marža po kategoriji (zadnjih 90 dana)')
  for (const g of marginBy(sales90, movements, productById, 'category').slice(0, 8))
    L.push(`- ${g.label}: neto ${kmText(g.net)}, marža ${kmText(g.margin)} (${mPct(g.margin, g.net)}), ${g.qty} kom`)

  // Prodavači ovaj mjesec
  L.push('', `## Prodavači (${monthLabel(month)})`)
  for (const s of employeeStats(orders, month, salesPeople).sort((a, b) => b.revenue - a.revenue))
    L.push(`- ${s.employee.name}: ${kmText(s.revenue)} (${s.orders} prodaja, plan ${pct(s.targetPct)}, prosjek ${kmText(s.avgOrder)}, popusti ${kmText(s.discounts)}, otvorene ponude ${s.offers})`)

  // Artikli zadnjih 30 dana
  const from30 = addDays(today, -29)
  const byProduct = new Map<string, { qty: number; value: number }>()
  for (const o of orders)
    if (isRevenue(o) && o.date >= from30)
      for (const i of o.items) {
        const r = byProduct.get(i.productId) ?? { qty: 0, value: 0 }
        r.qty += i.qty
        r.value += i.qty * i.unitPrice * (1 - i.discountPct / 100)
        byProduct.set(i.productId, r)
      }
  L.push('', '## Najprodavaniji artikli (zadnjih 30 dana)')
  for (const [id, r] of [...byProduct.entries()].sort((a, b) => b[1].value - a[1].value).slice(0, 10))
    L.push(`- ${productById(id).name}: ${r.qty} kom, ${kmText(r.value)}`)

  // Zalihe
  const soldRecently = new Set(orders.filter((o) => isRevenue(o) && o.date >= addDays(today, -89)).flatMap((o) => o.items.map((i) => i.productId)))
  const slow = products
    .filter((p) => p.stock > 0 && !soldRecently.has(p.id))
    .map((p) => ({ p, value: p.stock * p.avgCost }))
    .sort((a, b) => b.value - a.value)
  L.push('', '## Zalihe')
  L.push(`- Vrijednost zaliha po nabavnoj cijeni: ${kmText(stockValue(products))}`)
  const low = products.filter((p) => p.minStock > 0 && p.stock <= p.minStock)
  L.push(`- Ispod minimuma (${low.length}): ${low.slice(0, 10).map((p) => `${p.name} (${p.stock}/${p.minStock})`).join(', ') || '—'}`)
  L.push(`- Bez prodaje 90 dana (${slow.length}): ${slow.slice(0, 8).map((x) => `${x.p.name} ${x.p.stock} kom, ${kmText(x.value)}`).join('; ') || '—'}`)

  // Narudžbe kupaca (čekaju robu)
  const waiting = waitingOrders(orders, products)
  const wList = orders.filter((o) => waiting.has(o.id))
  L.push('', '## Narudžbe kupaca (čekaju robu)')
  L.push(`- ${wList.length} prodaja, ${kmText(sum(wList, orderTotal))}`)

  // Naplata
  const rec = receivables(orders, today)
  const late = rec.filter((r) => r.daysLate > 0)
  L.push('', '## Naplata')
  L.push(`- Kupci duguju ukupno ${kmText(sum(rec, (r) => r.left))} (${rec.length} prodaja); dospjelo neplaćeno ${kmText(sum(rec, (r) => r.overdue))}; kasni ${late.length} prodaja.`)
  for (const r of late.slice(0, 10))
    L.push(`- ${custName.get(r.order.customerId) ?? 'Kupac'} (${r.order.number}): kasni ${r.daysLate} dana, dospjelo ${kmText(r.overdue)}${r.plan ? `, rate ${r.plan.paid}/${r.plan.count}` : ''}`)
  const advances = sum(
    orders.filter((o) => !o.issuedAt && o.status !== 'otkazana' && o.status !== 'ponuda'),
    (o) => o.paid,
  )
  L.push(`- Avansi kupaca za robu koja još nije izašla: ${kmText(advances)}`)

  return L.join('\n')
}

/** Je li pitanje poslovno (promet, marža, naplata…) — za lokalni odgovor bez AI ključa. */
export function isBusinessQuestion(q: string) {
  return /promet|prodaj|prodal|plan|marž|marz|zarad|realiz|dug|duguj|naplat|kasni|rate|avans|zalih.*vrijed|prodavač|prodavac|najprodavan/i.test(q)
}
