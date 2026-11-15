import { itemsTotal, type Employee, type Order, type Product } from './types'

export const orderTotal = (o: Order) => itemsTotal(o.items)
export const isRevenue = (o: Order) =>
  o.status !== 'ponuda' && o.status !== 'otkazana'
/** Otvorena narudžba čija roba još nije izašla iz salona (rezerviše zalihu). */
export const isReserving = (o: Order) =>
  ['potvrđena', 'u_izradi', 'spremna'].includes(o.status) && !o.issuedAt

export const monthKey = (iso: string) => iso.slice(0, 7)

export function previousMonthKey(key: string) {
  const [y, m] = key.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

/** Zadnjih n mjeseci zaključno s `current`, od najstarijeg prema najnovijem. */
export function lastMonths(current: string, n = 12) {
  const keys: string[] = [current]
  while (keys.length < n) keys.unshift(previousMonthKey(keys[0]))
  return keys
}

export function revenueIn(orders: Order[], key: string) {
  return orders
    .filter((o) => isRevenue(o) && monthKey(o.date) === key)
    .reduce((s, o) => s + orderTotal(o), 0)
}

export function employeeStats(
  orders: Order[],
  key: string,
  salesPeople: Employee[],
) {
  return salesPeople.map((e) => {
    const mine = orders.filter(
      (o) => o.employeeId === e.id && monthKey(o.date) === key,
    )
    const sold = mine.filter(isRevenue)
    const revenue = sold.reduce((s, o) => s + orderTotal(o), 0)
    const offers = mine.filter((o) => o.status === 'ponuda').length
    const discounts = sold.reduce(
      (s, o) =>
        s +
        o.items.reduce(
          (a, i) => a + i.qty * i.unitPrice * (i.discountPct / 100),
          0,
        ),
      0,
    )
    return {
      employee: e,
      revenue,
      orders: sold.length,
      offers,
      avgOrder: sold.length ? revenue / sold.length : 0,
      commission: revenue * e.commissionRate,
      targetPct: e.monthlyTarget ? revenue / e.monthlyTarget : 0,
      discounts,
    }
  })
}

export function categoryRevenue(
  orders: Order[],
  keys: string[],
  productById: (id: string) => Product,
) {
  const map = new Map<string, number>()
  for (const o of orders) {
    if (!isRevenue(o) || !keys.includes(monthKey(o.date))) continue
    for (const i of o.items) {
      const c = productById(i.productId).category
      map.set(
        c,
        (map.get(c) ?? 0) + i.qty * i.unitPrice * (1 - i.discountPct / 100),
      )
    }
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1])
}

export const outstanding = (o: Order) =>
  isRevenue(o) ? Math.max(0, orderTotal(o) - o.paid) : 0

export function reservedQty(orders: Order[]) {
  const map = new Map<string, number>()
  for (const o of orders)
    if (isReserving(o))
      for (const i of o.items)
        map.set(i.productId, (map.get(i.productId) ?? 0) + i.qty)
  return map
}
