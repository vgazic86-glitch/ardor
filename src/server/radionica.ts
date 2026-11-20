/** Radionica: radni nalozi za namještaj po mjeri (nastaju sami kad je prodaja po mjeri potvrđena). */
import { desc, eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'
import type { SessionUser } from './auth'
import { notifyEmployee, notifyManagers } from './inbox'
import { todayIso } from './logic'
import { WORK_STATUSES, WORK_STATUS_LABEL, type WorkStatus } from '../lib/pomjeri'

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
}

const str = (v: number | null) => (v == null ? null : String(v))

/** Trgovac vidi samo naloge svojih prodaja; ostali sve. */
export async function listWorkOrders(user: SessionUser): Promise<{ rows: WorkOrderRow[]; today: string; canEdit: boolean }> {
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
  return {
    today: todayIso(),
    canEdit: user.role !== 'trgovac',
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
