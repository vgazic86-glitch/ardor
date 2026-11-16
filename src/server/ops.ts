/** Narudžbe dobavljačima, kartice dobavljača, radno vrijeme i podaci o firmi. */
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'
import {
  DEFAULT_COMPANY,
  type CompanyInfo,
  type LedgerEntry,
  type LedgerKind,
  type PurchaseLine,
  type PurchaseOrder,
  type PurchaseStatus,
  type WorkDay,
  type WorkKind,
} from '../lib/types'
import type { SessionUser } from './auth'
import { isFull, requireAdminUser, userContact } from './auth'
import { meta, setMeta } from './hr'
import { todayIso } from './logic'

const r2 = (v: number) => Math.round(v * 100) / 100
const str = (v: number | null) => (v === null ? null : String(v))
const isDate = (s: string | null | undefined) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)

/* ───────────────────────── podaci o firmi (memorandum) ───────────────────────── */

export async function getCompany(): Promise<CompanyInfo> {
  try {
    const raw = await meta('company')
    return { ...DEFAULT_COMPANY, ...(raw ? JSON.parse(raw) : {}) }
  } catch {
    return DEFAULT_COMPANY
  }
}

export async function saveCompany(c: CompanyInfo) {
  await requireAdminUser()
  const clean = Object.fromEntries(
    Object.keys(DEFAULT_COMPANY).map((k) => [k, String((c as unknown as Record<string, string>)[k] ?? '').trim()]),
  ) as unknown as CompanyInfo
  if (!clean.name) throw new Error('Unesite naziv firme.')
  await setMeta('company', JSON.stringify(clean))
  return clean
}

/* ───────────────────────── narudžbe dobavljačima ───────────────────────── */

export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  const orders = await db
    .select()
    .from(t.purchaseOrders)
    .orderBy(desc(t.purchaseOrders.date), desc(t.purchaseOrders.id))
  const items = await db
    .select()
    .from(t.purchaseOrderItems)
    .orderBy(asc(t.purchaseOrderItems.orderId), asc(t.purchaseOrderItems.position), asc(t.purchaseOrderItems.id))
  const byOrder = new Map<number, PurchaseLine[]>()
  for (const i of items) {
    const list = byOrder.get(i.orderId) ?? []
    list.push({
      productId: str(i.productId),
      code: i.code,
      name: i.name,
      qty: i.qty,
      unit: i.unit,
      price: i.price,
      note: i.note,
    })
    byOrder.set(i.orderId, list)
  }
  return orders.map((o) => ({
    id: String(o.id),
    number: o.number,
    date: o.date,
    supplierId: String(o.supplierId),
    status: o.status as PurchaseStatus,
    note: o.note,
    deliveryBy: o.deliveryBy,
    createdById: str(o.createdBy),
    createdByName: o.createdByName,
    closedAt: o.closedAt ? o.closedAt.toISOString() : null,
    receiptId: str(o.receiptId),
    lines: byOrder.get(o.id) ?? [],
  }))
}

export interface PurchaseInput {
  id: string | null
  supplierId: string
  date: string
  deliveryBy: string | null
  note: string
  lines: PurchaseLine[]
}

async function loadOrder(id: string) {
  const [o] = await db.select().from(t.purchaseOrders).where(eq(t.purchaseOrders.id, Number(id)))
  if (!o) throw new Error('Narudžba ne postoji.')
  return o
}

export async function savePurchaseOrder(user: SessionUser, input: PurchaseInput) {
  if (!input.supplierId) throw new Error('Odaberite dobavljača.')
  const lines = input.lines
    .map((l) => ({ ...l, name: l.name.trim(), code: l.code.trim(), note: l.note.trim(), qty: Math.round(Number(l.qty) || 0) }))
    .filter((l) => l.name && l.qty > 0)
  if (!lines.length) throw new Error('Dodajte barem jednu stavku s količinom.')
  const date = isDate(input.date) ? input.date : todayIso()
  return db.transaction(async (tx) => {
    let id: number
    let number: string
    if (input.id) {
      const [o] = await tx.select().from(t.purchaseOrders).where(eq(t.purchaseOrders.id, Number(input.id)))
      if (!o) throw new Error('Narudžba ne postoji.')
      if (o.status !== 'nacrt') throw new Error('Zaključena narudžba se ne može mijenjati. Vratite je u nacrt.')
      id = o.id
      number = o.number
      await tx
        .update(t.purchaseOrders)
        .set({
          supplierId: Number(input.supplierId),
          date,
          deliveryBy: isDate(input.deliveryBy) ? input.deliveryBy : null,
          note: input.note.trim(),
        })
        .where(eq(t.purchaseOrders.id, id))
      await tx.delete(t.purchaseOrderItems).where(eq(t.purchaseOrderItems.orderId, id))
    } else {
      const [{ next }] = (
        await tx.execute(sql`select nextval(pg_get_serial_sequence('purchase_orders', 'id'))::int as next`)
      ).rows as { next: number }[]
      id = next
      number = `NB-${date.slice(2, 4)}-${String(next).padStart(4, '0')}`
      await tx.insert(t.purchaseOrders).values({
        id,
        number,
        date,
        supplierId: Number(input.supplierId),
        deliveryBy: isDate(input.deliveryBy) ? input.deliveryBy : null,
        note: input.note.trim(),
        createdBy: Number(user.id),
        createdByName: user.name,
      })
    }
    await tx.insert(t.purchaseOrderItems).values(
      lines.map((l, i) => ({
        orderId: id,
        position: i,
        productId: l.productId ? Number(l.productId) : null,
        code: l.code,
        name: l.name,
        qty: l.qty,
        unit: l.unit.trim() || 'kom',
        price: l.price == null || !(l.price > 0) ? null : r2(l.price),
        note: l.note,
      })),
    )
    return { id: String(id), number }
  })
}

export async function setPurchaseStatus(id: string, status: PurchaseStatus) {
  const o = await loadOrder(id)
  const allowed: Record<string, PurchaseStatus[]> = {
    nacrt: ['zakljucena', 'otkazana'],
    zakljucena: ['nacrt', 'otkazana', 'zaprimljena'],
    otkazana: ['nacrt'],
    zaprimljena: [],
  }
  if (!allowed[o.status]?.includes(status)) throw new Error('Ta promjena statusa nije moguća.')
  await db
    .update(t.purchaseOrders)
    .set({
      status,
      closedAt: status === 'zakljucena' ? new Date() : status === 'nacrt' ? null : o.closedAt,
    })
    .where(eq(t.purchaseOrders.id, o.id))
}

export async function deletePurchaseOrder(id: string) {
  const o = await loadOrder(id)
  if (o.status !== 'nacrt') throw new Error('Brisati se može samo nacrt narudžbe.')
  await db.delete(t.purchaseOrders).where(eq(t.purchaseOrders.id, o.id))
}

/** Veže primku na narudžbu i označava je zaprimljenom. */
export async function linkPurchaseReceipt(id: string, receiptId: string) {
  const o = await loadOrder(id)
  if (o.status !== 'zakljucena') throw new Error('Robu možete zaprimiti samo po zaključenoj narudžbi.')
  await db
    .update(t.purchaseOrders)
    .set({ status: 'zaprimljena', receiptId: Number(receiptId) })
    .where(eq(t.purchaseOrders.id, o.id))
}

export async function purchaseOrderPdf(id: string) {
  const all = await listPurchaseOrders()
  const order = all.find((o) => o.id === id)
  if (!order) throw new Error('Narudžba ne postoji.')
  if (order.status === 'nacrt') throw new Error('PDF se izrađuje nakon što se narudžba zaključi.')
  const [supplier] = await db.select().from(t.suppliers).where(eq(t.suppliers.id, Number(order.supplierId)))
  const creator = order.createdById ? await userContact(order.createdById) : null
  let creatorRole = ''
  if (creator?.employeeId) {
    const [e] = await db.select({ role: t.employees.role }).from(t.employees).where(eq(t.employees.id, creator.employeeId))
    creatorRole = e?.role ?? ''
  }
  const { renderPurchaseOrderPdf } = await import('./pdf')
  const bytes = await renderPurchaseOrderPdf({
    order,
    company: await getCompany(),
    supplier: {
      name: supplier?.name ?? '',
      phone: supplier?.phone ?? '',
      email: supplier?.email ?? '',
    },
    creator: {
      name: creator?.name || order.createdByName,
      role: creatorRole,
      phone: creator?.phone ?? '',
      email: creator?.email ?? '',
    },
  })
  return {
    name: `Narudzba ${order.number} - ${(supplier?.name ?? '').replace(/[^\p{L}\p{N} .-]/gu, '')}.pdf`,
    data: Buffer.from(bytes).toString('base64'),
  }
}

/* ───────────────────────── kartice dobavljača ───────────────────────── */

const LEDGER_KINDS: LedgerKind[] = ['uplata', 'zaduzenje', 'odobrenje', 'pocetno']

export async function listLedger(): Promise<LedgerEntry[]> {
  const rows = await db.select().from(t.supplierLedger).orderBy(asc(t.supplierLedger.date), asc(t.supplierLedger.id))
  return rows.map((r) => ({
    id: String(r.id),
    supplierId: String(r.supplierId),
    date: r.date,
    kind: r.kind as LedgerKind,
    amount: r.amount,
    vat: r.vat,
    document: r.document,
    note: r.note,
    createdByName: r.createdByName,
  }))
}

export interface LedgerInput {
  id: string | null
  supplierId: string
  date: string
  kind: LedgerKind
  amount: number
  /** Od toga PDV (računi i odobrenja). */
  vat?: number
  document: string
  note: string
}

export async function saveLedgerEntry(user: SessionUser, input: LedgerInput) {
  if (!input.supplierId) throw new Error('Odaberite dobavljača.')
  if (!LEDGER_KINDS.includes(input.kind)) throw new Error('Nepoznata vrsta stavke.')
  const amount = r2(Number(input.amount))
  if (!(amount > 0) && input.kind !== 'pocetno') throw new Error('Unesite iznos veći od nule.')
  if (!amount) throw new Error('Unesite iznos.')
  const values = {
    supplierId: Number(input.supplierId),
    date: isDate(input.date) ? input.date : todayIso(),
    kind: input.kind,
    amount,
    vat: input.kind === 'zaduzenje' || input.kind === 'odobrenje' ? r2(Math.max(0, Math.min(Math.abs(amount), Number(input.vat) || 0))) : 0,
    document: input.document.trim(),
    note: input.note.trim(),
  }
  if (input.id) await db.update(t.supplierLedger).set(values).where(eq(t.supplierLedger.id, Number(input.id)))
  else await db.insert(t.supplierLedger).values({ ...values, createdByName: user.name })
}

export async function deleteLedgerEntry(id: string) {
  await db.delete(t.supplierLedger).where(eq(t.supplierLedger.id, Number(id)))
}

/* ───────────────────────── radno vrijeme ───────────────────────── */

const WORK_KINDS: WorkKind[] = ['rad', 'godisnji', 'bolovanje', 'slobodan', 'praznik']

/** Trenutno vrijeme u Banjoj Luci, HH:MM. */
function nowHHMM() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Sarajevo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
}

const toDay = (r: typeof t.workTime.$inferSelect): WorkDay => ({
  id: String(r.id),
  employeeId: String(r.employeeId),
  date: r.date,
  kind: r.kind as WorkKind,
  start: r.start,
  end: r.end,
  breakMin: r.breakMin,
  note: r.note,
  updatedByName: r.updatedByName,
})

export async function listWorkTime(user: SessionUser, month: string): Promise<{ days: WorkDay[]; now: string }> {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Neispravan mjesec.')
  const from = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const to = `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`
  const conds = [gte(t.workTime.date, from), lte(t.workTime.date, to)]
  if (!isFull(user.role)) {
    if (!user.employeeId) return { days: [], now: nowHHMM() }
    conds.push(eq(t.workTime.employeeId, Number(user.employeeId)))
  }
  const rows = await db
    .select()
    .from(t.workTime)
    .where(and(...conds))
    .orderBy(asc(t.workTime.date))
  return { days: rows.map(toDay), now: nowHHMM() }
}

export interface WorkDayInput {
  employeeId: string
  date: string
  kind: WorkKind
  start: string
  end: string
  breakMin: number
  note: string
}

const timeOk = (s: string) => s === '' || /^([01]?\d|2[0-3])[:.][0-5]\d$/.test(s.trim())
const normTime = (s: string) => {
  const v = s.trim().replace('.', ':')
  if (!v) return ''
  const [h, m] = v.split(':')
  return `${h.padStart(2, '0')}:${m}`
}

const shiftDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * Šta zaposlenik (bez punog pristupa) smije sam upisati:
 * dolazak/odlazak za danas i jučer; godišnji, bolovanje, praznik i slobodan dan
 * do 30 dana unazad i do 6 mjeseci unaprijed (npr. planirani godišnji).
 */
function selfEditError(kind: WorkKind, date: string) {
  const today = todayIso()
  if (kind === 'rad') {
    if (date !== today && date !== shiftDays(today, -1)) return 'Dolazak i odlazak sami upisujete za danas i jučer. Starije dane ispravlja voditelj.'
    return null
  }
  if (date < shiftDays(today, -30)) return 'Odsustvo starije od 30 dana upisuje voditelj.'
  if (date > shiftDays(today, 183)) return 'Odsustvo možete upisati najviše 6 mjeseci unaprijed.'
  return null
}

export async function saveWorkDay(user: SessionUser, input: WorkDayInput) {
  if (!isDate(input.date)) throw new Error('Neispravan datum.')
  if (!WORK_KINDS.includes(input.kind)) throw new Error('Nepoznata vrsta dana.')
  if (!isFull(user.role)) {
    if (!user.employeeId || input.employeeId !== user.employeeId)
      throw new Error('Možete upisivati samo svoje radno vrijeme.')
    const err = selfEditError(input.kind, input.date)
    if (err) throw new Error(err)
  }
  if (!timeOk(input.start) || !timeOk(input.end)) throw new Error('Vrijeme upišite kao SS:MM, npr. 08:30.')
  const values = {
    kind: input.kind,
    start: input.kind === 'rad' ? normTime(input.start) : '',
    end: input.kind === 'rad' ? normTime(input.end) : '',
    breakMin: input.kind === 'rad' ? Math.max(0, Math.min(600, Math.round(Number(input.breakMin) || 0))) : 0,
    note: input.note.trim(),
    updatedByName: user.name,
    updatedAt: new Date(),
  }
  const empty = values.kind === 'rad' && !values.start && !values.end && !values.note
  const where = and(eq(t.workTime.employeeId, Number(input.employeeId)), eq(t.workTime.date, input.date))
  if (empty) {
    await db.delete(t.workTime).where(where)
    return
  }
  await db
    .insert(t.workTime)
    .values({ employeeId: Number(input.employeeId), date: input.date, ...values })
    .onConflictDoUpdate({ target: [t.workTime.employeeId, t.workTime.date], set: values })
}

/** Brzi upis dolaska/odlaska za prijavljenog zaposlenika (trenutno vrijeme). */
export async function clock(user: SessionUser, action: 'dolazak' | 'odlazak', employeeId?: string | null) {
  const emp = !isFull(user.role) ? user.employeeId : employeeId || user.employeeId
  if (!emp) throw new Error('Vaš korisnički račun nije povezan sa zaposlenikom.')
  const date = todayIso()
  const now = nowHHMM()
  const [row] = await db
    .select()
    .from(t.workTime)
    .where(and(eq(t.workTime.employeeId, Number(emp)), eq(t.workTime.date, date)))
  if (action === 'dolazak') {
    if (row?.start) throw new Error(`Dolazak je već upisan (${row.start}).`)
  } else if (!row?.start) throw new Error('Prvo upišite dolazak.')
  await saveWorkDay(!isFull(user.role) ? user : { ...user, role: 'uprava' }, {
    employeeId: emp,
    date,
    kind: 'rad',
    start: action === 'dolazak' ? now : row!.start,
    end: action === 'odlazak' ? now : row?.end ?? '',
    breakMin: row?.breakMin ?? (action === 'odlazak' ? 30 : 0),
    note: row?.note ?? '',
  })
  return { time: now }
}

export interface WorkRangeInput {
  employeeId: string
  from: string
  to: string
  kind: WorkKind
  note: string
}

/** Odsustvo za više dana odjednom (godišnji, bolovanje…). Nedjelje se preskaču. */
export async function saveWorkRange(user: SessionUser, input: WorkRangeInput) {
  if (!isDate(input.from) || !isDate(input.to)) throw new Error('Unesite datum od i do.')
  if (input.to < input.from) throw new Error('Datum „do” je prije datuma „od”.')
  if (input.kind === 'rad') throw new Error('Za radne dane upišite dolazak i odlazak po danu.')
  const days: string[] = []
  for (let d = input.from; d <= input.to; d = shiftDays(d, 1)) {
    if (new Date(`${d}T12:00:00Z`).getUTCDay() !== 0) days.push(d)
    if (days.length > 62) throw new Error('Najviše dva mjeseca odjednom.')
  }
  if (!days.length) throw new Error('U odabranom periodu nema radnih dana.')
  for (const d of days)
    await saveWorkDay(user, { employeeId: input.employeeId, date: d, kind: input.kind, start: '', end: '', breakMin: 0, note: input.note })
  return { days: days.length }
}
