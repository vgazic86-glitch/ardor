/** Radionica: šifarnik repromaterijala, prijem, inventura i kretanja (zaliha s decimalama). */
import { asc, desc, eq } from 'drizzle-orm'
import { db, type Tx } from '../../db/index.js'
import * as t from '../../db/schema.js'
import type { SessionUser } from './auth'
import { todayIso } from './logic'
import { avgCost, isLow, MATERIAL_UNITS, nextMaterialCode, stockOf, valueOf, type MaterialMoveType } from '../lib/materijal'

/** Materijal vide i vode operativa, voditelj i uprava (kao nabavne cijene). */
export function requireMaterialAccess(user: SessionUser) {
  if (user.role === 'trgovac' || user.role === 'dostava') throw new Error('Radionički materijal vode operativa, voditelj i uprava.')
}

export interface MaterialRow {
  id: string
  code: string
  name: string
  unit: string
  category: string
  supplierId: string | null
  supplier: string
  price: number
  minQty: number
  note: string
  active: boolean
  stock: number
  avgCost: number
  value: number
  low: boolean
}

export interface MaterialMoveRow {
  id: string
  date: string
  type: MaterialMoveType
  materialId: string
  material: string
  unit: string
  qty: number
  unitCost: number
  value: number
  supplier: string
  documentNumber: string
  workOrder: string
  note: string
  createdBy: string
}

/** Stanje i prosječna cijena za sve materijale (unutar transakcije ili bez nje). */
async function stockMap(q: Tx | typeof db) {
  const moves = await q.select({ materialId: t.materialMoves.materialId, type: t.materialMoves.type, qty: t.materialMoves.qty, unitCost: t.materialMoves.unitCost }).from(t.materialMoves)
  const by = new Map<number, { type: string; qty: number; unitCost: number }[]>()
  for (const m of moves) by.set(m.materialId, [...(by.get(m.materialId) ?? []), m])
  return by
}

export async function materialSnapshot(materialId: number, q: Tx | typeof db = db) {
  const [m] = await q.select().from(t.materials).where(eq(t.materials.id, materialId))
  if (!m) throw new Error('Materijal ne postoji.')
  const moves = await q.select({ type: t.materialMoves.type, qty: t.materialMoves.qty, unitCost: t.materialMoves.unitCost }).from(t.materialMoves).where(eq(t.materialMoves.materialId, materialId))
  return { m, stock: stockOf(moves), avg: avgCost(moves, m.price) }
}

export async function listMaterials(user: SessionUser) {
  requireMaterialAccess(user)
  const [mats, sups, by, moves] = await Promise.all([
    db.select().from(t.materials).orderBy(asc(t.materials.category), asc(t.materials.name)),
    db.select({ id: t.suppliers.id, name: t.suppliers.name }).from(t.suppliers).orderBy(asc(t.suppliers.name)),
    stockMap(db),
    db
      .select({ m: t.materialMoves, mat: t.materials.name, unit: t.materials.unit, sup: t.suppliers.name, wo: t.workOrders.number })
      .from(t.materialMoves)
      .innerJoin(t.materials, eq(t.materialMoves.materialId, t.materials.id))
      .leftJoin(t.suppliers, eq(t.materialMoves.supplierId, t.suppliers.id))
      .leftJoin(t.workOrderCosts, eq(t.materialMoves.workCostId, t.workOrderCosts.id))
      .leftJoin(t.workOrders, eq(t.workOrderCosts.workOrderId, t.workOrders.id))
      .orderBy(desc(t.materialMoves.date), desc(t.materialMoves.id))
      .limit(300),
  ])
  const supName = new Map(sups.map((s) => [s.id, s.name]))
  const rows: MaterialRow[] = mats.map((m) => {
    const mv = by.get(m.id) ?? []
    const stock = stockOf(mv)
    const avg = avgCost(mv, m.price)
    return {
      id: String(m.id),
      code: m.code,
      name: m.name,
      unit: m.unit,
      category: m.category,
      supplierId: m.supplierId ? String(m.supplierId) : null,
      supplier: m.supplierId ? (supName.get(m.supplierId) ?? '') : '',
      price: m.price,
      minQty: m.minQty,
      note: m.note,
      active: m.active,
      stock,
      avgCost: avg,
      value: valueOf(Math.max(0, stock), avg),
      low: isLow(stock, m.minQty),
    }
  })
  return {
    today: todayIso(),
    materials: rows,
    suppliers: sups.map((s) => ({ id: String(s.id), name: s.name })),
    moves: moves.map(({ m, mat, unit, sup, wo }) => ({
      id: String(m.id),
      date: m.date,
      type: m.type as MaterialMoveType,
      materialId: String(m.materialId),
      material: mat,
      unit,
      qty: m.qty,
      unitCost: m.unitCost,
      value: valueOf(Math.abs(m.qty), m.unitCost),
      supplier: sup ?? '',
      documentNumber: m.documentNumber,
      workOrder: wo ?? '',
      note: m.note,
      createdBy: m.createdBy,
    })) satisfies MaterialMoveRow[],
  }
}

export interface MaterialInput {
  id: string | null
  name: string
  unit: string
  category: string
  supplierId: string | null
  price: number
  minQty: number
  note: string
  active: boolean
}

export async function saveMaterial(user: SessionUser, input: MaterialInput) {
  requireMaterialAccess(user)
  const name = String(input.name ?? '').trim().slice(0, 160)
  if (!name) throw new Error('Upišite naziv materijala.')
  const unit = (MATERIAL_UNITS as readonly string[]).includes(input.unit) ? input.unit : 'kom'
  const values = {
    name,
    unit,
    category: String(input.category ?? '').trim().slice(0, 60),
    supplierId: input.supplierId ? Number(input.supplierId) : null,
    price: Math.max(0, Math.round(Number(input.price || 0) * 100) / 100),
    minQty: Math.max(0, Math.round(Number(input.minQty || 0) * 1000) / 1000),
    note: String(input.note ?? '').trim().slice(0, 500),
    active: input.active !== false,
  }
  if (input.id) {
    await db.update(t.materials).set(values).where(eq(t.materials.id, Number(input.id)))
    return { id: input.id, name }
  }
  const codes = (await db.select({ c: t.materials.code }).from(t.materials)).map((r) => r.c)
  const [row] = await db.insert(t.materials).values({ ...values, code: nextMaterialCode(codes), createdAt: new Date() }).returning()
  return { id: String(row.id), name, code: row.code }
}

export interface MaterialReceiptLine {
  /** Postojeći materijal; prazno = novi materijal iz naziva (pravi se pri spremanju prijema). */
  materialId: string | null
  name?: string
  unit?: string
  category?: string
  qty: number
  unitCost: number
}

export interface MaterialReceiptInput {
  date: string
  supplierId: string | null
  documentNumber: string
  note: string
  lines: MaterialReceiptLine[]
}

/**
 * Prijem materijala u radionicu (ulaz) — cijena s računa postaje i zadnja nabavna.
 * Stavka može biti i novi materijal (naziv + jedinica): napravi se u šifarniku u istom koraku.
 * Ako materijal s istim nazivom već postoji, koristi se postojeći (nema duplikata).
 */
export async function receiveMaterials(user: SessionUser, input: MaterialReceiptInput) {
  requireMaterialAccess(user)
  const lines = (input.lines ?? [])
    .map((l) => ({
      materialId: l.materialId ? Number(l.materialId) : null,
      name: String(l.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 160),
      unit: (MATERIAL_UNITS as readonly string[]).includes(l.unit ?? '') ? (l.unit as string) : 'kom',
      category: String(l.category ?? '').trim().slice(0, 60),
      qty: Math.round(Number(l.qty) * 1000) / 1000,
      unitCost: Math.round(Number(l.unitCost) * 10000) / 10000,
    }))
    .filter((l) => (l.materialId || l.name) && l.qty)
  if (!lines.length) throw new Error('Dodajte barem jednu stavku: naziv materijala i količinu.')
  for (const l of lines) {
    if (!(l.qty > 0)) throw new Error(`Količina za „${l.name || 'materijal'}” mora biti veća od 0.`)
    if (!(l.unitCost >= 0)) throw new Error('Neispravna cijena.')
  }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date ?? '') ? input.date : todayIso()
  const supplierId = input.supplierId ? Number(input.supplierId) : null
  let created = 0
  await db.transaction(async (tx) => {
    const now = new Date()
    const all = await tx.select({ id: t.materials.id, code: t.materials.code, name: t.materials.name }).from(t.materials)
    const byName = new Map(all.map((m) => [m.name.toLowerCase(), m.id]))
    const codes = all.map((m) => m.code)
    for (const l of lines) {
      if (l.materialId) continue
      const found = byName.get(l.name.toLowerCase())
      if (found) {
        l.materialId = found
        continue
      }
      const code = nextMaterialCode(codes)
      codes.push(code)
      const [row] = await tx
        .insert(t.materials)
        .values({ code, name: l.name, unit: l.unit, category: l.category, supplierId, price: Math.round(l.unitCost * 100) / 100, createdAt: now })
        .returning()
      byName.set(l.name.toLowerCase(), row.id)
      l.materialId = row.id
      created++
    }
    await tx.insert(t.materialMoves).values(
      lines.map((l) => ({
        materialId: l.materialId!,
        date,
        type: 'ulaz',
        qty: l.qty,
        unitCost: l.unitCost,
        supplierId,
        documentNumber: String(input.documentNumber ?? '').trim().slice(0, 80),
        note: String(input.note ?? '').trim().slice(0, 300),
        createdBy: user.name,
        createdAt: now,
      })),
    )
    for (const l of lines)
      await tx
        .update(t.materials)
        .set({ price: Math.round(l.unitCost * 100) / 100, active: true, ...(supplierId ? { supplierId } : {}) })
        .where(eq(t.materials.id, l.materialId!))
  })
  return { lines: lines.length, created }
}

/** Inventura: upisano stvarno stanje → korekcija za razliku. */
export async function countMaterial(user: SessionUser, input: { materialId: string; counted: number; note: string }) {
  requireMaterialAccess(user)
  const counted = Math.round(Number(input.counted) * 1000) / 1000
  if (!(counted >= 0)) throw new Error('Upišite izbrojano stanje (0 ili više).')
  return db.transaction(async (tx) => {
    const { m, stock, avg } = await materialSnapshot(Number(input.materialId), tx)
    const diff = Math.round((counted - stock) * 1000) / 1000
    if (!diff) return { name: m.name, diff: 0 }
    await tx.insert(t.materialMoves).values({
      materialId: m.id,
      date: todayIso(),
      type: 'korekcija',
      qty: diff,
      unitCost: avg,
      note: String(input.note ?? '').trim().slice(0, 300) || 'Inventura',
      createdBy: user.name,
      createdAt: new Date(),
    })
    return { name: m.name, diff }
  })
}

/** Aktivni materijal za izbor kod troška naloga (stanje i prosječna cijena). */
export async function materialOptions() {
  const [mats, by] = await Promise.all([db.select().from(t.materials).where(eq(t.materials.active, true)).orderBy(asc(t.materials.name)), stockMap(db)])
  return mats.map((m) => {
    const mv = by.get(m.id) ?? []
    return { id: String(m.id), code: m.code, name: m.name, unit: m.unit, stock: stockOf(mv), avgCost: avgCost(mv, m.price) }
  })
}
