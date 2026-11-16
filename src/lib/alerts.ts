/** Upozorenja za brifing i zvonce: šta danas traži pažnju. */
import { money } from './format'
import { orderTotal } from './stats'
import type { Order, Product } from './types'

export type AlertKey = 'zadaci' | 'dostave' | 'kasni' | 'zaliha' | 'ponude' | 'dug' | 'sigurnost'

export interface Alert {
  key: AlertKey
  count: number
  title: string
  detail: string
  tone: 'copper' | 'bad' | 'warn' | 'info'
  to: string
  search?: Record<string, string | boolean>
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)

export function computeAlerts({
  orders,
  products,
  today,
  openTasks,
  ownEmployeeId,
}: {
  orders: Order[]
  products: Product[]
  today: string
  openTasks: number
  /** Ako je zadano, ponude i dugovanja samo za tog prodavača. */
  ownEmployeeId?: string | null
}): Alert[] {
  const mine = (o: Order) => !ownEmployeeId || o.employeeId === ownEmployeeId
  const active = orders.filter((o) => o.status !== 'otkazana')
  const todayDeliveries = active.filter((o) => o.delivery && o.delivery.date === today && o.delivery.status !== 'dostavljeno')
  const late = active.filter((o) => o.delivery && o.delivery.date < today && o.delivery.status !== 'dostavljeno')
  const low = products.filter((p) => p.minStock > 0 && p.stock <= p.minStock)
  const oldOffers = orders.filter((o) => mine(o) && o.status === 'ponuda' && daysBetween(o.date, today) >= 7)
  const debts = orders.filter(
    (o) => mine(o) && o.status === 'isporučena' && orderTotal(o) - o.paid > 0.5 && daysBetween(o.issuedAt ?? o.date, today) > 30,
  )
  const debtSum = debts.reduce((s, o) => s + orderTotal(o) - o.paid, 0)
  const out: Alert[] = []
  if (openTasks) out.push({ key: 'zadaci', count: openTasks, title: `${openTasks} ${openTasks === 1 ? 'otvoren zadatak' : 'otvorenih zadataka'}`, detail: 'čekaju vas', tone: 'copper', to: '/zadaci' })
  if (todayDeliveries.length)
    out.push({ key: 'dostave', count: todayDeliveries.length, title: `${todayDeliveries.length} ${todayDeliveries.length === 1 ? 'dostava' : 'dostave'} danas`, detail: [...new Set(todayDeliveries.map((o) => o.delivery!.city))].join(', '), tone: 'info', to: '/dostave' })
  if (late.length) out.push({ key: 'kasni', count: late.length, title: `${late.length} ${late.length === 1 ? 'dostava kasni' : 'dostave kasne'}`, detail: 'rok je prošao, a nije označeno dostavljeno', tone: 'bad', to: '/dostave' })
  if (low.length) out.push({ key: 'zaliha', count: low.length, title: `${low.length} ${low.length === 1 ? 'artikal' : 'artikala'} za naručiti`, detail: 'ispod minimalne zalihe', tone: 'warn', to: '/zalihe' })
  if (oldOffers.length)
    out.push({ key: 'ponude', count: oldOffers.length, title: `${oldOffers.length} ${oldOffers.length === 1 ? 'ponuda čeka' : 'ponuda čeka'} odgovor`, detail: 'starije od 7 dana — nazovite kupca', tone: 'warn', to: '/narudzbe' })
  if (debts.length)
    out.push({ key: 'dug', count: debts.length, title: `${debts.length} ${debts.length === 1 ? 'kupac duguje' : 'kupaca duguje'} 30+ dana`, detail: `ukupno ${money(debtSum)}`, tone: 'bad', to: '/kupci', search: { dug: true } })
  return out
}

/** Radni dani (pon–sub) od sutra do kraja mjeseca. */
export function workingDaysLeft(today: string) {
  const [y, m, d] = today.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  let n = 0
  for (let day = d; day <= last; day++) if (new Date(Date.UTC(y, m - 1, day)).getUTCDay() !== 0) n++
  return n
}
