/** Radionica: radni nalozi za namještaj po mjeri (nastaju sami kad je prodaja po mjeri potvrđena). */
import { asc, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'
import { isFull, type SessionUser } from './auth'
import { meta, setMeta } from './hr'
import { notifyEmployee, notifyManagers } from './inbox'
import { todayIso } from './logic'
import {
  costAmount,
  costTotals,
  DEFAULT_HOURLY_RATE,
  WORK_STATUSES,
  WORK_STATUS_LABEL,
  workMargin,
  type CostKind,
  type CostTotals,
  type WorkStatus,
} from '../lib/pomjeri'

export interface WorkOrderRow {
  id: string
  number: string
  status: WorkStatus
  dueDate: string | null
  note: string
  updatedBy: string
  updatedAt: string
  doneAt: string | null
  orderId: string
  orderNumber: string
  orderStatus: string
  orderDate: string
  customerName: string
  customerCity: string
  salesperson: string
  name: string
  description: string
  qty: number
  imageId: string | null
  thumbId: string | null
  deliveryDate: string | null
  /** Troškovi (samo uloge koje vide nabavne cijene). */
  costs?: WorkCostRow[]
  totals?: CostTotals
  /** Zarada po komadu (samo admin i uprava). */
  margin?: { gross: number; net: number; profit: number; pct: number }
}

export interface WorkCostRow {
  id: string
  kind: CostKind
  description: string
  supplier: string
  documentNumber: string
  qty: number
  unitPrice: number
  amount: number
  date: string
  employee: string
  createdBy: string
}

/** Ko vidi troškove naloga: sve osim trgovca i dostave (kao nabavne cijene). */
export const seesWorkCosts = (u: SessionUser) => u.role !== 'trgovac' && u.role !== 'dostava'

export async function hourlyRate() {
  const v = Number(await meta('radionica_satnica'))
  return v > 0 ? v : DEFAULT_HOURLY_RATE
}

const str = (v: number | null) => (v == null ? null : String(v))

/** Trgovac vidi samo naloge svojih prodaja; ostali sve. */
export async function listWorkOrders(user: SessionUser): Promise<{
  rows: WorkOrderRow[]
  today: string
  canEdit: boolean
  seesCosts: boolean
  seesMargin: boolean
  rate: number
  suppliers: { id: string; name: string }[]
  employees: { id: string; name: string }[]
}> {
  const rows = await db
    .select({ w: t.workOrders, i: t.orderItems, o: t.orders, c: t.customers, e: t.employees, d: t.deliveries })
    .from(t.workOrders)
    .innerJoin(t.orderItems, eq(t.workOrders.orderItemId, t.orderItems.id))
    .innerJoin(t.orders, eq(t.workOrders.orderId, t.orders.id))
    .innerJoin(t.customers, eq(t.orders.customerId, t.customers.id))
    .innerJoin(t.employees, eq(t.orders.employeeId, t.employees.id))
    .leftJoin(t.deliveries, eq(t.deliveries.orderId, t.orders.id))
    .orderBy(desc(t.workOrders.id))
  const own = user.role === 'trgovac'
  const sees = seesWorkCosts(user)
  const full = isFull(user.role)
  const costRows = sees && rows.length
    ? await db
        .select({ c: t.workOrderCosts, sup: t.suppliers.name, emp: t.employees.name })
        .from(t.workOrderCosts)
        .leftJoin(t.suppliers, eq(t.workOrderCosts.supplierId, t.suppliers.id))
        .leftJoin(t.employees, eq(t.workOrderCosts.employeeId, t.employees.id))
        .where(inArray(t.workOrderCosts.workOrderId, rows.map((r) => r.w.id)))
        .orderBy(asc(t.workOrderCosts.date), asc(t.workOrderCosts.id))
    : []
  const costsBy = new Map<number, WorkCostRow[]>()
  for (const { c, sup, emp } of costRows)
    costsBy.set(c.workOrderId, [
      ...(costsBy.get(c.workOrderId) ?? []),
      { id: String(c.id), kind: c.kind as CostKind, description: c.description, supplier: sup ?? '', documentNumber: c.documentNumber, qty: c.qty, unitPrice: c.unitPrice, amount: c.amount, date: c.date, employee: emp ?? '', createdBy: c.createdBy },
    ])
  return {
    today: todayIso(),
    canEdit: user.role !== 'trgovac',
    seesCosts: sees,
    seesMargin: full,
    rate: sees ? await hourlyRate() : 0,
    suppliers: sees ? (await db.select({ id: t.suppliers.id, name: t.suppliers.name }).from(t.suppliers).orderBy(asc(t.suppliers.name))).map((x) => ({ id: String(x.id), name: x.name })) : [],
    employees: sees ? (await db.select({ id: t.employees.id, name: t.employees.name }).from(t.employees).where(eq(t.employees.active, true)).orderBy(asc(t.employees.name))).map((x) => ({ id: String(x.id), name: x.name })) : [],
    rows: rows
      .filter((r) => !own || String(r.o.employeeId) === user.employeeId)
      .map(({ w, i, o, c, e, d }) => ({
        id: String(w.id),
        number: w.number,
        status: w.status as WorkStatus,
        dueDate: w.dueDate,
        note: w.note,
        updatedBy: w.updatedBy,
        updatedAt: w.updatedAt.toISOString(),
        doneAt: w.doneAt ? w.doneAt.toISOString() : null,
        orderId: String(o.id),
        orderNumber: o.number,
        orderStatus: o.status,
        orderDate: o.date,
        customerName: c.name,
        customerCity: c.city,
        salesperson: e.name,
        name: i.customName,
        description: i.description,
        qty: i.qty,
        imageId: str(i.imageId),
        thumbId: str(i.thumbId),
        deliveryDate: d?.date ?? null,
        ...(sees
          ? (() => {
              const costs = costsBy.get(w.id) ?? []
              const totals = costTotals(costs)
              const gross = Math.round(i.qty * i.unitPrice * (1 - i.discountPct / 100) * 100) / 100
              return { costs, totals, ...(full ? { margin: { gross, ...workMargin(gross, totals) } } : {}) }
            })()
          : {}),
      })),
  }
}

export interface WorkOrderUpdate {
  id: string
  status?: WorkStatus
  dueDate?: string | null
  note?: string
}

/** Status, rok i bilješka naloga. „Gotovo” javi prodavaču; početak rada prebaci prodaju u „U izradi”. */
export async function updateWorkOrder(user: SessionUser, input: WorkOrderUpdate) {
  if (user.role === 'trgovac') throw new Error('Status radnog naloga mijenja radionica, voditelj ili uprava.')
  const [w] = await db.select().from(t.workOrders).where(eq(t.workOrders.id, Number(input.id)))
  if (!w) throw new Error('Radni nalog ne postoji.')
  const [o] = await db.select().from(t.orders).where(eq(t.orders.id, w.orderId))
  if (!o) throw new Error('Prodaja ne postoji.')
  if (o.status === 'otkazana') throw new Error('Prodaja je otkazana — nalog se više ne mijenja.')
  const patch: Partial<typeof t.workOrders.$inferInsert> = { updatedAt: new Date(), updatedBy: user.name }
  if (input.status !== undefined) {
    if (!WORK_STATUSES.includes(input.status)) throw new Error('Nepoznat status naloga.')
    patch.status = input.status
    patch.doneAt = input.status === 'gotovo' ? new Date() : null
  }
  if (input.dueDate !== undefined) {
    if (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) throw new Error('Neispravan rok.')
    patch.dueDate = input.dueDate || null
  }
  if (input.note !== undefined) patch.note = String(input.note).slice(0, 1000)
  await db.update(t.workOrders).set(patch).where(eq(t.workOrders.id, w.id))

  if (input.status && input.status !== w.status) {
    if ((input.status === 'krojenje' || input.status === 'sklapanje') && o.status === 'potvrđena')
      await db.update(t.orders).set({ status: 'u_izradi' }).where(eq(t.orders.id, o.id))
    const [it] = await db.select({ name: t.orderItems.customName }).from(t.orderItems).where(eq(t.orderItems.id, w.orderItemId))
    const [c] = await db.select({ name: t.customers.name }).from(t.customers).where(eq(t.customers.id, o.customerId))
    const what = `${w.number} · ${it?.name ?? ''} · ${c?.name ?? ''} (prodaja ${o.number})`
    if (input.status === 'gotovo') {
      await notifyEmployee(o.employeeId, 'Namještaj po mjeri je gotov', `${what}. Prodaja se sada može označiti kao „Spremna” i zakazati dostava.`)
      await notifyManagers('Radni nalog gotov', what)
    } else await notifyEmployee(o.employeeId, `Radni nalog: ${WORK_STATUS_LABEL[input.status].toLowerCase()}`, what)
  }
  return { number: w.number }
}

export interface WorkCostInput {
  workOrderId: string
  kind: CostKind
  description: string
  supplierId: string | null
  documentNumber: string
  qty: number
  unitPrice: number
  date: string
  employeeId: string | null
  /** Za dnevnik izmjena. */
  number?: string
}

/** Novi trošak naloga (iznosi bez PDV-a). */
export async function addWorkCost(user: SessionUser, input: WorkCostInput) {
  if (!seesWorkCosts(user)) throw new Error('Troškove naloga upisuju operativa, voditelj i uprava.')
  if (!['partner', 'materijal', 'rad', 'ostalo'].includes(input.kind)) throw new Error('Nepoznata vrsta troška.')
  const [w] = await db.select({ id: t.workOrders.id }).from(t.workOrders).where(eq(t.workOrders.id, Number(input.workOrderId)))
  if (!w) throw new Error('Radni nalog ne postoji.')
  const qty = Math.round(Number(input.qty) * 100) / 100
  const unitPrice = Math.round(Number(input.unitPrice) * 100) / 100
  if (!(qty > 0)) throw new Error(input.kind === 'rad' ? 'Upišite broj sati.' : 'Upišite količinu.')
  if (!(unitPrice >= 0) || Number.isNaN(unitPrice)) throw new Error('Neispravna cijena.')
  const amount = costAmount(qty, unitPrice)
  if (!(amount > 0)) throw new Error('Iznos troška mora biti veći od 0.')
  const description = String(input.description ?? '').trim().slice(0, 300)
  if (input.kind !== 'rad' && !description && !input.supplierId) throw new Error('Upišite opis troška (npr. „Krojenje iverice, 14 elemenata”).')
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date ?? '') ? input.date : todayIso()
  await db.insert(t.workOrderCosts).values({
    workOrderId: w.id,
    kind: input.kind,
    description,
    supplierId: input.supplierId ? Number(input.supplierId) : null,
    documentNumber: String(input.documentNumber ?? '').trim().slice(0, 80),
    qty,
    unitPrice,
    amount,
    date,
    employeeId: input.employeeId ? Number(input.employeeId) : null,
    createdBy: user.name,
    createdAt: new Date(),
  })
  return { amount }
}

export async function deleteWorkCost(user: SessionUser, id: string) {
  if (!seesWorkCosts(user)) throw new Error('Za ovu radnju nemate ovlaštenje.')
  await db.delete(t.workOrderCosts).where(eq(t.workOrderCosts.id, Number(id)))
}

/** Satnica radionice (KM/h bez PDV-a) — mijenja uprava. */
export async function setHourlyRate(user: SessionUser, rate: number) {
  if (!isFull(user.role)) throw new Error('Satnicu mijenja uprava.')
  const v = Math.round(Number(rate) * 100) / 100
  if (!(v > 0 && v < 1000)) throw new Error('Satnica mora biti između 0 i 1000 KM.')
  await setMeta('radionica_satnica', String(v))
  return { rate: v }
}
