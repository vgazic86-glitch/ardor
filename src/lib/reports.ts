/**
 * Knjigovodstveni izračuni nad snimkom podataka.
 * Prihod se priznaje po realizaciji: kada roba izađe iz salona (`issuedAt`).
 * Nabavna vrijednost prodane robe dolazi iz kretanja zaliha te narudžbe.
 */
import { netOf, VAT_RATE } from './format'
import { orderTotal, outstanding } from './stats'
import type {
  Customer,
  Employee,
  Order,
  PaymentMethod,
  Product,
  Receipt,
  StockMovement,
} from './types'

export interface Period {
  from: string
  to: string
}

export const inPeriod = (iso: string | null, p: Period) =>
  !!iso && iso >= p.from && iso <= p.to

export function addDays(iso: string, n: number) {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(a: string, b: string) {
  return Math.round(
    (Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86_400_000,
  )
}

export function monthRange(key: string): Period {
  const [y, m] = key.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { from: `${key}-01`, to: `${key}-${String(last).padStart(2, '0')}` }
}

/** Nabavna vrijednost robe koja je po narudžbi izašla (neto nakon povrata). */
export function cogsByOrder(movements: StockMovement[]) {
  const map = new Map<string, number>()
  for (const m of movements)
    if (m.orderId)
      map.set(m.orderId, (map.get(m.orderId) ?? 0) - m.qty * m.unitCost)
  return map
}

export interface SaleRow {
  order: Order
  gross: number
  net: number
  vat: number
  cogs: number
  margin: number
}

/** Realizirane prodaje u periodu (roba izašla iz salona). */
export function realized(
  orders: Order[],
  movements: StockMovement[],
  p: Period,
): SaleRow[] {
  const cogs = cogsByOrder(movements)
  return orders
    .filter((o) => o.status !== 'otkazana' && inPeriod(o.issuedAt, p))
    .map((o) => {
      const gross = orderTotal(o)
      const net = netOf(gross)
      // Namještaj po mjeri: nabavna vrijednost = vanjski troškovi radnog naloga (vlastiti rad je već u plaćama).
      const custom = o.items.reduce((s, i) => s + (i.work?.cost ?? 0), 0)
      const c = Math.max(0, cogs.get(o.id) ?? 0) + custom
      return {
        order: o,
        gross,
        net,
        vat: gross - net,
        cogs: c,
        margin: net - c,
      }
    })
    .sort((a, b) => (a.order.issuedAt! < b.order.issuedAt! ? -1 : 1))
}

export function sum<T>(rows: T[], f: (r: T) => number) {
  return rows.reduce((s, r) => s + f(r), 0)
}

export const receiptNet = (r: Receipt) =>
  r.lines.reduce((s, l) => s + l.qty * l.unitCost, 0)

/** Ulazni PDV primke: s računa dobavljača ako je upisan, inače 17 % od nabavne vrijednosti. */
export const receiptVat = (r: Receipt) =>
  r.vat != null ? r.vat : receiptNet(r) * VAT_RATE

export function vatSummary(
  sales: SaleRow[],
  receipts: Receipt[],
  p: Period,
  /** Ostali ulazni računi u periodu (troškovi, računi dobavljača): osnovica i PDV. */
  other: { base: number; vat: number; count: number } = { base: 0, vat: 0, count: 0 },
) {
  const outVat = sum(sales, (s) => s.vat)
  const inRecs = receipts.filter((r) => inPeriod(r.date, p))
  const inNet = sum(inRecs, receiptNet)
  const inVat = sum(inRecs, receiptVat)
  return {
    outBase: sum(sales, (s) => s.net),
    outVat,
    inBase: inNet,
    inVat,
    otherBase: other.base,
    otherVat: other.vat,
    otherCount: other.count,
    due: outVat - inVat - other.vat,
    receipts: inRecs,
  }
}

export interface Group {
  key: string
  label: string
  net: number
  cogs: number
  margin: number
  qty: number
}

/** Marža po kategoriji ili artiklu: stavke raspoređene po udjelu u iznosu narudžbe. */
export function marginBy(
  sales: SaleRow[],
  movements: StockMovement[],
  productById: (id: string) => Product,
  by: 'category' | 'product' | 'supplier',
): Group[] {
  const map = new Map<string, Group>()
  const cost = new Map<string, number>()
  for (const m of movements)
    if (m.orderId && m.type === 'izlaz')
      cost.set(`${m.orderId}:${m.productId}`, m.unitCost)
  for (const s of sales) {
    for (const i of s.order.items) {
      const p = productById(i.productId)
      const key =
        by === 'category'
          ? p.category
          : by === 'supplier'
            ? (p.supplierId ?? 'bez')
            : p.id
      const g = map.get(key) ?? {
        key,
        label:
          by === 'category'
            ? p.category
            : by === 'supplier'
              ? p.supplierId
                ? p.supplier
                : 'Bez dobavljača'
              : `${p.name}`,
        net: 0,
        cogs: 0,
        margin: 0,
        qty: 0,
      }
      const net = netOf(i.qty * i.unitPrice * (1 - i.discountPct / 100))
      const c = i.customName ? (i.work?.cost ?? 0) : i.qty * (cost.get(`${s.order.id}:${i.productId}`) ?? p.avgCost)
      g.net += net
      g.cogs += c
      g.margin += net - c
      g.qty += i.qty
      map.set(key, g)
    }
  }
  return [...map.values()].sort((a, b) => b.net - a.net)
}

export function marginBySeller(
  sales: SaleRow[],
  employeeById: (id: string) => Employee,
): Group[] {
  const map = new Map<string, Group>()
  for (const s of sales) {
    const e = employeeById(s.order.employeeId)
    const g = map.get(e.id) ?? {
      key: e.id,
      label: e.name,
      net: 0,
      cogs: 0,
      margin: 0,
      qty: 0,
    }
    g.net += s.net
    g.cogs += s.cogs
    g.margin += s.margin
    g.qty += 1
    map.set(e.id, g)
  }
  return [...map.values()].sort((a, b) => b.net - a.net)
}

export function paymentsIn(orders: Order[], p: Period) {
  return orders
    .filter((o) => o.status !== 'otkazana')
    .flatMap((o) => o.payments.map((pay) => ({ ...pay, order: o })))
    .filter((x) => inPeriod(x.date, p))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

export function paymentsByMethod(rows: ReturnType<typeof paymentsIn>) {
  const map = new Map<PaymentMethod, { n: number; amount: number }>()
  for (const r of rows) {
    const g = map.get(r.method) ?? { n: 0, amount: 0 }
    g.n += 1
    g.amount += r.amount
    map.set(r.method, g)
  }
  return map
}

export interface Debt {
  customer: Customer
  orders: Order[]
  total: number
  due: number
  /** Dio duga za robu koja je već isporučena (dospjelo). */
  issuedDue: number
  oldest: string
  days: number
}

/** Potraživanja od kupaca na današnji dan (isporučeno ili potvrđeno, a nenaplaćeno). */
export function debts(
  orders: Order[],
  customerById: (id: string) => Customer,
  today: string,
): Debt[] {
  const map = new Map<string, Debt>()
  for (const o of orders) {
    const due = outstanding(o)
    if (due < 0.5) continue
    const c = customerById(o.customerId)
    const d = map.get(c.id) ?? {
      customer: c,
      orders: [],
      total: 0,
      due: 0,
      issuedDue: 0,
      oldest: o.date,
      days: 0,
    }
    d.orders.push(o)
    d.total += orderTotal(o)
    d.due += due
    if (o.issuedAt) d.issuedDue += due
    if (o.date < d.oldest) d.oldest = o.date
    map.set(c.id, d)
  }
  return [...map.values()]
    .map((d) => ({ ...d, days: daysBetween(d.oldest, today) }))
    .sort((a, b) => b.due - a.due)
}

/** Avansi: uplaćeno za robu koja još nije izašla iz salona (obaveza prema kupcu). */
export function advances(orders: Order[]) {
  return sum(
    orders.filter(
      (o) => !o.issuedAt && o.status !== 'otkazana' && o.status !== 'ponuda',
    ),
    (o) => o.paid,
  )
}

export function stockValue(products: Product[]) {
  return sum(products, (p) => Math.max(0, p.stock) * p.avgCost)
}

export interface SupplierRow extends Group {
  /** Nabavna vrijednost robe zaprimljene od dobavljača u periodu (primke, bez PDV-a). */
  purchased: number
  receipts: number
}

/** Prodaja po dobavljačima (realizacija) + nabava od dobavljača u istom periodu. */
export function salesBySupplier(
  sales: SaleRow[],
  movements: StockMovement[],
  receipts: Receipt[],
  productById: (id: string) => Product,
  supplierName: (id: string) => string,
  p: Period,
): SupplierRow[] {
  const rows = new Map<string, SupplierRow>(
    marginBy(sales, movements, productById, 'supplier').map((g) => [
      g.key,
      { ...g, purchased: 0, receipts: 0 },
    ]),
  )
  for (const r of receipts) {
    if (!inPeriod(r.date, p)) continue
    const key = r.supplierId ?? 'bez'
    const row = rows.get(key) ?? {
      key,
      label: r.supplierId ? supplierName(r.supplierId) : 'Bez dobavljača',
      net: 0,
      cogs: 0,
      margin: 0,
      qty: 0,
      purchased: 0,
      receipts: 0,
    }
    row.purchased += receiptNet(r)
    row.receipts += 1
    rows.set(key, row)
  }
  return [...rows.values()].sort(
    (a, b) => b.net - a.net || b.purchased - a.purchased,
  )
}
