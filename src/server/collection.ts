/** Naplata: plan rata, rok plaćanja i evidencija podsjetnika (server). */
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'
import { planInstallments } from '../lib/collection'
import type { SessionUser } from './auth'
import { clampCount, validIso } from './logic'

const r2 = (v: number) => Math.round(v * 100) / 100

/** Trgovac i operativa smiju samo svoje prodaje; voditelj, uprava i admin sve. */
async function ownOrder(user: SessionUser, orderId: string) {
  const [o] = await db.select().from(t.orders).where(eq(t.orders.id, Number(orderId)))
  if (!o) throw new Error('Prodaja nije pronađena.')
  const restricted = user.role === 'trgovac' || user.role === 'operativa'
  if (restricted && String(o.employeeId) !== user.employeeId)
    throw new Error('Ovo nije vaša prodaja — naplatu vodi prodavač ili uprava.')
  return o
}

/**
 * Novi plan rata za preostali iznos (ukupno − dosad uplaćeno). Stari plan se briše.
 * count = 0 briše plan. Prodaja prelazi na način plaćanja „Rate”.
 */
export async function setInstallmentPlan(user: SessionUser, d: { orderId: string; count: number; first: string }) {
  const o = await ownOrder(user, d.orderId)
  if (o.status === 'ponuda' || o.status === 'otkazana') throw new Error('Plan rata se pravi za potvrđenu prodaju.')
  await db.transaction(async (tx) => {
    await tx.delete(t.installments).where(eq(t.installments.orderId, o.id))
    if (!d.count) return
    const items = await tx.select().from(t.orderItems).where(eq(t.orderItems.orderId, o.id))
    const pays = await tx.select().from(t.payments).where(eq(t.payments.orderId, o.id))
    const total = items.reduce((s, i) => s + i.qty * i.unitPrice * (1 - i.discountPct / 100), 0)
    const left = r2(total - pays.reduce((s, p) => s + p.amount, 0))
    if (left < 0.5) throw new Error('Kupac je sve platio — plan rata nije potreban.')
    const plan = planInstallments(left, clampCount(d.count), validIso(d.first))
    // Postojeće uplate ostaju kao „avans”: rate pokrivaju samo ostatak.
    await tx.insert(t.installments).values(plan.map((p) => ({ orderId: o.id, seq: p.seq, dueDate: p.date, amount: p.amount })))
    if (o.paymentMethod !== 'Rate') await tx.update(t.orders).set({ paymentMethod: 'Rate' }).where(eq(t.orders.id, o.id))
  })
}

/** Rok plaćanja ostatka; null = na dan isporuke. */
export async function setDueDate(user: SessionUser, d: { orderId: string; dueDate: string | null }) {
  const o = await ownOrder(user, d.orderId)
  await db
    .update(t.orders)
    .set({ dueDate: d.dueDate ? validIso(d.dueDate) : null })
    .where(eq(t.orders.id, o.id))
}

const CHANNELS = ['WhatsApp', 'Viber', 'SMS', 'kopirano', 'poziv']

/** Upis da je kupac podsjećen (prikazuje se „zadnji podsjetnik” na stranici Naplata). */
export async function recordReminder(user: SessionUser, d: { orderId: string; channel: string }) {
  const o = await ownOrder(user, d.orderId)
  await db.insert(t.paymentReminders).values({
    orderId: o.id,
    at: new Date(),
    userName: user.name,
    channel: CHANNELS.includes(d.channel) ? d.channel : 'kopirano',
  })
}
