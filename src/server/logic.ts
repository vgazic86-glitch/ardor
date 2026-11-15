/** Serverska logika nad Netlify Database. Uvozi se samo iz serverskih funkcija. */
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db, type Tx } from '../../db/index.js'
import * as t from '../../db/schema.js'
import { seedDemo } from '../../db/seed.js'
import {
  ensureBrandBook,
  ensureDocumentsSeeded,
  ensureHrSeeded,
  listDocuments,
} from './hr'
import type {
  Category,
  DeliveryStatus,
  MovementType,
  OrderStatus,
  PaymentMethod,
  Role,
  Slot,
  Snapshot,
} from '../lib/types'

export function todayIso() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Sarajevo',
  }).format(new Date())
}

const id = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === '' ? null : Number(v)
const str = (v: number | null) => (v === null ? null : String(v))
const round2 = (v: number) => Math.round(v * 100) / 100

async function ensureSeeded() {
  const [row] = await db
    .select()
    .from(t.appMeta)
    .where(eq(t.appMeta.key, 'seeded'))
  if (row) return
  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(t.appMeta)
      .values({ key: 'seeded', value: todayIso() })
      .onConflictDoNothing()
      .returning()
    if (!inserted.length) return
    const [{ n }] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(t.employees)
    if (n > 0) return
    await seedDemo(tx, todayIso())
  })
}

export async function loadSnapshot(): Promise<Snapshot> {
  await ensureSeeded()
  await ensureDocumentsSeeded()
  await ensureBrandBook()
  await ensureHrSeeded()
  const [emps, sups, prods, custs, ords, items, pays, dels, recs, moves, docs] =
    await Promise.all([
      db
        .select()
        .from(t.employees)
        .where(eq(t.employees.active, true))
        .orderBy(t.employees.id),
      db.select().from(t.suppliers).orderBy(t.suppliers.name),
      db
        .select()
        .from(t.products)
        .where(eq(t.products.active, true))
        .orderBy(t.products.sku),
      db.select().from(t.customers).orderBy(t.customers.name),
      db
        .select()
        .from(t.orders)
        .orderBy(sql`${t.orders.date} desc, ${t.orders.id} desc`),
      db.select().from(t.orderItems).orderBy(t.orderItems.id),
      db.select().from(t.payments).orderBy(t.payments.date, t.payments.id),
      db.select().from(t.deliveries),
      db
        .select()
        .from(t.receipts)
        .orderBy(sql`${t.receipts.date} desc, ${t.receipts.id} desc`),
      db
        .select()
        .from(t.stockMovements)
        .orderBy(t.stockMovements.date, t.stockMovements.id),
      listDocuments(),
    ])

  const stock = new Map<number, number>()
  const inQty = new Map<number, number>()
  const inVal = new Map<number, number>()
  for (const m of moves) {
    stock.set(m.productId, (stock.get(m.productId) ?? 0) + m.qty)
    if (m.qty > 0 && (m.type === 'pocetno' || m.type === 'primka')) {
      inQty.set(m.productId, (inQty.get(m.productId) ?? 0) + m.qty)
      inVal.set(m.productId, (inVal.get(m.productId) ?? 0) + m.qty * m.unitCost)
    }
  }
  const supById = new Map(sups.map((s) => [s.id, s]))
  const group = <T extends { orderId: number }>(rows: T[]) => {
    const m = new Map<number, T[]>()
    for (const r of rows) m.set(r.orderId, [...(m.get(r.orderId) ?? []), r])
    return m
  }
  const itemsBy = group(items)
  const paysBy = group(pays)
  const delBy = new Map(dels.map((d) => [d.orderId, d]))

  return {
    today: todayIso(),
    employees: emps.map((e) => ({
      id: String(e.id),
      name: e.name,
      role: e.role as Role,
      initials: e.initials,
      color: e.color,
      monthlyTarget: e.monthlyTarget,
      commissionRate: e.commissionRate,
      phone: e.phone,
    })),
    suppliers: sups.map((s) => ({
      id: String(s.id),
      name: s.name,
      phone: s.phone,
      email: s.email,
      leadTimeDays: s.leadTimeDays,
    })),
    products: prods.map((p) => {
      const s = p.supplierId ? supById.get(p.supplierId) : undefined
      const q = inQty.get(p.id) ?? 0
      return {
        id: String(p.id),
        sku: p.sku,
        name: p.name,
        category: p.category as Category,
        price: p.price,
        purchasePrice: p.purchasePrice,
        avgCost: q ? round2((inVal.get(p.id) ?? 0) / q) : p.purchasePrice,
        stock: stock.get(p.id) ?? 0,
        minStock: p.minStock,
        supplierId: str(p.supplierId),
        supplier: s?.name ?? '—',
        leadTimeDays: s?.leadTimeDays ?? 0,
        imageId: str(p.imageId),
        thumbId: str(p.thumbId),
      }
    }),
    customers: custs.map((c) => ({
      id: String(c.id),
      name: c.name,
      phone: c.phone,
      email: c.email,
      city: c.city,
      address: c.address,
    })),
    orders: ords.map((o) => {
      const ps = paysBy.get(o.id) ?? []
      const d = delBy.get(o.id)
      return {
        id: String(o.id),
        number: o.number,
        date: o.date,
        customerId: String(o.customerId),
        employeeId: String(o.employeeId),
        items: (itemsBy.get(o.id) ?? []).map((i) => ({
          productId: String(i.productId),
          qty: i.qty,
          unitPrice: i.unitPrice,
          discountPct: i.discountPct,
        })),
        status: o.status as OrderStatus,
        paymentMethod: o.paymentMethod as PaymentMethod,
        paid: round2(ps.reduce((s, p) => s + p.amount, 0)),
        payments: ps.map((p) => ({
          id: String(p.id),
          date: p.date,
          amount: p.amount,
          method: p.method as PaymentMethod,
          employeeId: str(p.employeeId),
        })),
        delivery: d
          ? {
              date: d.date,
              slot: d.slot as Slot,
              address: d.address,
              city: d.city,
              driverId: String(d.driverId),
              assembly: d.assembly,
              status: d.status as DeliveryStatus,
            }
          : null,
        note: o.note,
        issuedAt: o.issuedAt,
      }
    }),
    receipts: recs.map((r) => ({
      id: String(r.id),
      number: r.number,
      date: r.date,
      supplierId: str(r.supplierId),
      documentNumber: r.documentNumber,
      note: r.note,
      employeeId: str(r.employeeId),
      lines: moves
        .filter((m) => m.receiptId === r.id)
        .map((m) => ({
          productId: String(m.productId),
          qty: m.qty,
          unitCost: m.unitCost,
        })),
    })),
    movements: moves.map((m) => ({
      id: String(m.id),
      productId: String(m.productId),
      date: m.date,
      type: m.type as MovementType,
      qty: m.qty,
      unitCost: m.unitCost,
      receiptId: str(m.receiptId),
      orderId: str(m.orderId),
      employeeId: str(m.employeeId),
      note: m.note,
    })),
    documents: docs,
  }
}

/* ───────────────────────── zalihe ───────────────────────── */

async function avgCosts(tx: Tx, productIds: number[]) {
  const map = new Map<number, number>()
  if (!productIds.length) return map
  const rows = await tx
    .select({
      productId: t.stockMovements.productId,
      cost: sql<string>`sum(${t.stockMovements.qty} * ${t.stockMovements.unitCost}) / nullif(sum(${t.stockMovements.qty}), 0)`,
    })
    .from(t.stockMovements)
    .where(
      and(
        inArray(t.stockMovements.productId, productIds),
        inArray(t.stockMovements.type, ['pocetno', 'primka']),
        sql`${t.stockMovements.qty} > 0`,
      ),
    )
    .groupBy(t.stockMovements.productId)
  for (const r of rows)
    if (r.cost !== null) map.set(r.productId, round2(Number(r.cost)))
  const prods = await tx
    .select({ id: t.products.id, pp: t.products.purchasePrice })
    .from(t.products)
    .where(inArray(t.products.id, productIds))
  for (const p of prods) if (!map.has(p.id)) map.set(p.id, p.pp)
  return map
}

/** Roba je izašla iz salona: skini sa zaliha (jednom po narudžbi). */
async function issueOrder(
  tx: Tx,
  orderId: number,
  date: string,
  actorId: number | null,
) {
  const [o] = await tx.select().from(t.orders).where(eq(t.orders.id, orderId))
  if (!o || o.issuedAt || o.status === 'otkazana' || o.status === 'ponuda')
    return
  const its = await tx
    .select()
    .from(t.orderItems)
    .where(eq(t.orderItems.orderId, orderId))
  const costs = await avgCosts(
    tx,
    its.map((i) => i.productId),
  )
  if (its.length)
    await tx.insert(t.stockMovements).values(
      its.map((i) => ({
        productId: i.productId,
        date,
        type: 'izlaz',
        qty: -i.qty,
        unitCost: costs.get(i.productId) ?? 0,
        orderId,
        employeeId: actorId,
        note: `Izlaz po narudžbi ${o.number}`,
      })),
    )
  await tx
    .update(t.orders)
    .set({ issuedAt: date })
    .where(eq(t.orders.id, orderId))
}

/** Roba se vratila u salon (otkazano ili vraćena dostava): vrati na zalihe. */
async function returnOrder(
  tx: Tx,
  orderId: number,
  date: string,
  actorId: number | null,
  reason: string,
) {
  const [o] = await tx.select().from(t.orders).where(eq(t.orders.id, orderId))
  if (!o || !o.issuedAt) return
  const rows = await tx
    .select({
      productId: t.stockMovements.productId,
      qty: sql<number>`sum(${t.stockMovements.qty})::int`,
      cost: sql<string>`sum(case when ${t.stockMovements.qty} < 0 then ${t.stockMovements.qty} * ${t.stockMovements.unitCost} else 0 end) / nullif(sum(case when ${t.stockMovements.qty} < 0 then ${t.stockMovements.qty} else 0 end), 0)`,
    })
    .from(t.stockMovements)
    .where(eq(t.stockMovements.orderId, orderId))
    .groupBy(t.stockMovements.productId)
  const back = rows.filter((r) => r.qty < 0)
  if (back.length)
    await tx.insert(t.stockMovements).values(
      back.map((r) => ({
        productId: r.productId,
        date,
        type: 'povrat',
        qty: -r.qty,
        unitCost: round2(Number(r.cost ?? 0)),
        orderId,
        employeeId: actorId,
        note: `${reason} — ${o.number}`,
      })),
    )
  await tx
    .update(t.orders)
    .set({ issuedAt: null })
    .where(eq(t.orders.id, orderId))
}

/* ───────────────────────── narudžbe ───────────────────────── */

export interface CreateOrderInput {
  actorId: string | null
  customerId: string | null
  newCustomer: {
    name: string
    phone: string
    email: string
    city: string
    address: string
  } | null
  employeeId: string
  items: {
    productId: string
    qty: number
    unitPrice: number
    discountPct: number
  }[]
  status: OrderStatus
  paymentMethod: PaymentMethod
  paid: number
  note: string
  pickupNow: boolean
  delivery: {
    date: string
    slot: Slot
    driverId: string
    assembly: boolean
  } | null
}

export async function createOrder(input: CreateOrderInput) {
  if (!input.items.length)
    throw new Error('Narudžba mora imati barem jednu stavku.')
  const today = todayIso()
  const actor = id(input.actorId)
  return db.transaction(async (tx) => {
    let customerId = id(input.customerId)
    let customer = customerId
      ? (
          await tx
            .select()
            .from(t.customers)
            .where(eq(t.customers.id, customerId))
        )[0]
      : undefined
    if (input.newCustomer) {
      if (!input.newCustomer.name.trim()) throw new Error('Unesite ime kupca.')
      ;[customer] = await tx
        .insert(t.customers)
        .values({ ...input.newCustomer, name: input.newCustomer.name.trim() })
        .returning()
      customerId = customer.id
    }
    if (!customer || !customerId) throw new Error('Kupac nije pronađen.')

    const [{ next }] = (
      await tx.execute(
        sql`select nextval(pg_get_serial_sequence('orders', 'id'))::int as next`,
      )
    ).rows as { next: number }[]
    const status: OrderStatus = input.pickupNow ? 'isporučena' : input.status
    const total = input.items.reduce(
      (s, i) => s + i.qty * i.unitPrice * (1 - i.discountPct / 100),
      0,
    )
    await tx.insert(t.orders).values({
      id: next,
      number: `ARD-${today.slice(2, 4)}-${String(next).padStart(4, '0')}`,
      date: today,
      customerId,
      employeeId: Number(input.employeeId),
      status,
      paymentMethod: input.paymentMethod,
      note: input.note,
    })
    await tx.insert(t.orderItems).values(
      input.items.map((i) => ({
        orderId: next,
        productId: Number(i.productId),
        qty: Math.max(1, Math.round(i.qty)),
        unitPrice: round2(i.unitPrice),
        discountPct: Math.min(100, Math.max(0, i.discountPct)),
      })),
    )
    const paid = round2(
      Math.min(total, Math.max(0, input.pickupNow ? total : input.paid)),
    )
    if (paid > 0 && status !== 'ponuda')
      await tx.insert(t.payments).values({
        orderId: next,
        date: today,
        amount: paid,
        method: input.paymentMethod,
        employeeId: actor ?? Number(input.employeeId),
      })
    if (input.delivery && !input.pickupNow && status !== 'ponuda') {
      await tx.insert(t.deliveries).values({
        orderId: next,
        date: input.delivery.date || today,
        slot: input.delivery.slot,
        address: customer.address,
        city: customer.city,
        driverId: Number(input.delivery.driverId),
        assembly: input.delivery.assembly,
        status: 'zakazana',
      })
    }
    if (input.pickupNow)
      await issueOrder(tx, next, today, actor ?? Number(input.employeeId))
    return { id: String(next) }
  })
}

export async function setOrderStatus(
  orderId: string,
  status: OrderStatus,
  actorId: string | null,
) {
  const oid = Number(orderId)
  const today = todayIso()
  await db.transaction(async (tx) => {
    await tx.update(t.orders).set({ status }).where(eq(t.orders.id, oid))
    if (status === 'isporučena') {
      await tx
        .update(t.deliveries)
        .set({ status: 'dostavljeno' })
        .where(eq(t.deliveries.orderId, oid))
      await issueOrder(tx, oid, today, id(actorId))
    }
    if (status === 'otkazana')
      await returnOrder(
        tx,
        oid,
        today,
        id(actorId),
        'Povrat — otkazana narudžba',
      )
  })
}

export async function setDeliveryStatus(
  orderId: string,
  status: DeliveryStatus,
  actorId: string | null,
) {
  const oid = Number(orderId)
  const today = todayIso()
  await db.transaction(async (tx) => {
    await tx
      .update(t.deliveries)
      .set({ status })
      .where(eq(t.deliveries.orderId, oid))
    if (status === 'dostavljeno') {
      await tx
        .update(t.orders)
        .set({ status: 'isporučena' })
        .where(eq(t.orders.id, oid))
      await issueOrder(tx, oid, today, id(actorId))
    } else if (status === 'u_putu') {
      await issueOrder(tx, oid, today, id(actorId))
    } else {
      const [o] = await tx.select().from(t.orders).where(eq(t.orders.id, oid))
      if (o && o.status !== 'isporučena')
        await returnOrder(
          tx,
          oid,
          today,
          id(actorId),
          'Povrat — dostava vraćena u salon',
        )
    }
  })
}

export async function addPayment(
  orderId: string,
  amount: number,
  method: PaymentMethod | null,
  actorId: string | null,
) {
  const oid = Number(orderId)
  await db.transaction(async (tx) => {
    const [o] = await tx.select().from(t.orders).where(eq(t.orders.id, oid))
    if (!o) throw new Error('Narudžba nije pronađena.')
    const its = await tx
      .select()
      .from(t.orderItems)
      .where(eq(t.orderItems.orderId, oid))
    const total = its.reduce(
      (s, i) => s + i.qty * i.unitPrice * (1 - i.discountPct / 100),
      0,
    )
    const [{ paid }] = await tx
      .select({ paid: sql<string>`coalesce(sum(${t.payments.amount}), 0)` })
      .from(t.payments)
      .where(eq(t.payments.orderId, oid))
    const value = round2(Math.min(amount, total - Number(paid)))
    if (value <= 0) return
    await tx.insert(t.payments).values({
      orderId: oid,
      date: todayIso(),
      amount: value,
      method: method ?? o.paymentMethod,
      employeeId: id(actorId),
    })
  })
}

/* ───────────────────────── prijem robe i artikli ───────────────────────── */

export interface ReceiptInput {
  actorId: string | null
  date: string
  supplierId: string | null
  documentNumber: string
  note: string
  lines: { productId: string; qty: number; unitCost: number }[]
}

export async function createReceipt(input: ReceiptInput) {
  const lines = input.lines.filter((l) => l.qty > 0)
  if (!lines.length) throw new Error('Prijem mora imati barem jednu stavku.')
  const date = input.date || todayIso()
  return db.transaction(async (tx) => {
    const [{ next }] = (
      await tx.execute(
        sql`select nextval(pg_get_serial_sequence('receipts', 'id'))::int as next`,
      )
    ).rows as { next: number }[]
    const number = `PR-${date.slice(2, 4)}-${String(next).padStart(4, '0')}`
    await tx.insert(t.receipts).values({
      id: next,
      number,
      date,
      supplierId: id(input.supplierId),
      documentNumber: input.documentNumber.trim(),
      note: input.note.trim(),
      employeeId: id(input.actorId),
    })
    await tx.insert(t.stockMovements).values(
      lines.map((l) => ({
        productId: Number(l.productId),
        date,
        type: 'primka',
        qty: Math.round(l.qty),
        unitCost: round2(Math.max(0, l.unitCost)),
        receiptId: next,
        employeeId: id(input.actorId),
        note: `Prijem ${number}${input.documentNumber ? ` (${input.documentNumber})` : ''}`,
      })),
    )
    for (const l of lines)
      if (l.unitCost > 0)
        await tx
          .update(t.products)
          .set({ purchasePrice: round2(l.unitCost) })
          .where(eq(t.products.id, Number(l.productId)))
    return { id: String(next), number }
  })
}

export interface ProductInput {
  id: string | null
  sku: string
  name: string
  category: Category
  price: number
  purchasePrice: number
  minStock: number
  supplierId: string | null
  openingStock: number
  actorId: string | null
}

export async function saveProduct(input: ProductInput) {
  if (!input.sku.trim() || !input.name.trim())
    throw new Error('Šifra i naziv su obavezni.')
  const values = {
    sku: input.sku.trim(),
    name: input.name.trim(),
    category: input.category,
    price: round2(input.price),
    purchasePrice: round2(input.purchasePrice),
    minStock: Math.max(0, Math.round(input.minStock)),
    supplierId: id(input.supplierId),
  }
  return db.transaction(async (tx) => {
    const dup = await tx
      .select({ id: t.products.id })
      .from(t.products)
      .where(eq(t.products.sku, values.sku))
    if (dup.length && String(dup[0].id) !== input.id)
      throw new Error(`Šifra ${values.sku} već postoji.`)
    if (input.id) {
      await tx
        .update(t.products)
        .set(values)
        .where(eq(t.products.id, Number(input.id)))
      return { id: input.id }
    }
    const [p] = await tx.insert(t.products).values(values).returning()
    if (input.openingStock > 0)
      await tx.insert(t.stockMovements).values({
        productId: p.id,
        date: todayIso(),
        type: 'pocetno',
        qty: Math.round(input.openingStock),
        unitCost: values.purchasePrice,
        employeeId: id(input.actorId),
        note: 'Početno stanje',
      })
    return { id: String(p.id) }
  })
}

export async function archiveProduct(productId: string) {
  await db
    .update(t.products)
    .set({ active: false })
    .where(eq(t.products.id, Number(productId)))
}

/** Inventura: postavi stanje na prebrojanu količinu (razlika ide kao korekcija). */
export async function adjustStock(
  productId: string,
  counted: number,
  note: string,
  actorId: string | null,
) {
  const pid = Number(productId)
  await db.transaction(async (tx) => {
    const [{ qty }] = await tx
      .select({
        qty: sql<number>`coalesce(sum(${t.stockMovements.qty}), 0)::int`,
      })
      .from(t.stockMovements)
      .where(eq(t.stockMovements.productId, pid))
    const diff = Math.round(counted) - qty
    if (!diff) return
    const costs = await avgCosts(tx, [pid])
    await tx.insert(t.stockMovements).values({
      productId: pid,
      date: todayIso(),
      type: 'korekcija',
      qty: diff,
      unitCost: costs.get(pid) ?? 0,
      employeeId: id(actorId),
      note: note.trim() || 'Inventura',
    })
  })
}

/** Inventura za više artikala odjednom: svaka razlika ide kao korekcija. */
export async function adjustStockMany(
  lines: { productId: string; counted: number }[],
  note: string,
  actorId: string | null,
) {
  const today = todayIso()
  let changed = 0
  await db.transaction(async (tx) => {
    const ids = lines.map((l) => Number(l.productId))
    if (!ids.length) return
    const rows = await tx
      .select({
        productId: t.stockMovements.productId,
        qty: sql<number>`coalesce(sum(${t.stockMovements.qty}), 0)::int`,
      })
      .from(t.stockMovements)
      .where(inArray(t.stockMovements.productId, ids))
      .groupBy(t.stockMovements.productId)
    const current = new Map(rows.map((r) => [r.productId, r.qty]))
    const costs = await avgCosts(tx, ids)
    const values = lines
      .map((l) => {
        const pid = Number(l.productId)
        const diff = Math.round(l.counted) - (current.get(pid) ?? 0)
        return { pid, diff }
      })
      .filter((x) => x.diff !== 0)
      .map((x) => ({
        productId: x.pid,
        date: today,
        type: 'korekcija',
        qty: x.diff,
        unitCost: costs.get(x.pid) ?? 0,
        employeeId: id(actorId),
        note: note.trim() || `Inventura ${today}`,
      }))
    changed = values.length
    if (values.length) await tx.insert(t.stockMovements).values(values)
  })
  return { changed }
}

/* ───────────────────────── šifarnici ───────────────────────── */

export interface SupplierInput {
  id: string | null
  name: string
  phone: string
  email: string
  leadTimeDays: number
}

export async function saveSupplier(input: SupplierInput) {
  if (!input.name.trim()) throw new Error('Naziv dobavljača je obavezan.')
  const values = {
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    leadTimeDays: Math.max(0, Math.round(input.leadTimeDays)),
  }
  if (input.id) {
    await db
      .update(t.suppliers)
      .set(values)
      .where(eq(t.suppliers.id, Number(input.id)))
    return { id: input.id }
  }
  const [s] = await db.insert(t.suppliers).values(values).returning()
  return { id: String(s.id) }
}

export interface EmployeeInput {
  id: string | null
  name: string
  role: Role
  phone: string
  color: string
  monthlyTarget: number
  commissionRate: number
}

export async function saveEmployee(input: EmployeeInput) {
  const name = input.name.trim()
  if (!name) throw new Error('Ime zaposlenika je obavezno.')
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const values = {
    name,
    role: input.role,
    initials,
    phone: input.phone.trim(),
    color: input.color || '#7c4a2d',
    monthlyTarget: round2(Math.max(0, input.monthlyTarget)),
    commissionRate: Math.max(0, Math.min(1, input.commissionRate)),
  }
  if (input.id) {
    await db
      .update(t.employees)
      .set(values)
      .where(eq(t.employees.id, Number(input.id)))
    return { id: input.id }
  }
  const [e] = await db.insert(t.employees).values(values).returning()
  return { id: String(e.id) }
}

export async function deactivateEmployee(employeeId: string) {
  await db
    .update(t.employees)
    .set({ active: false })
    .where(eq(t.employees.id, Number(employeeId)))
}

/**
 * Briše primjerne narudžbe, kupce, uplate, dostave, prijeme i kretanja robe.
 * Zaposlenici, dobavljači i artikli ostaju; stanje zaliha kreće od nule.
 */
export async function clearTransactions() {
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`truncate table stock_movements, receipts, deliveries, payments, order_items, orders, customers, bonuses restart identity cascade`,
    )
    await tx.execute(sql`delete from salaries where note = 'Primjerni podatak'`)
    await tx.execute(
      sql`delete from expenses where description like '%(primjer)%'`,
    )
    await tx
      .insert(t.appMeta)
      .values({ key: 'cleared', value: todayIso() })
      .onConflictDoUpdate({ target: t.appMeta.key, set: { value: todayIso() } })
  })
}
