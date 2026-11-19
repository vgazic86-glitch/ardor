import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'
import type { StockLocation, Transfer } from '../lib/types'
const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sarajevo' }).format(new Date())

/**
 * Interne primke: premještaj robe između skladišta i salona.
 * Sustav bilježi dva kretanja po stavci (izlaz s jednog mjesta, ulaz na drugo), pa je stvarno stanje uvijek poznato.
 */

const LOC = (v: string): StockLocation => (v === 'skladiste' ? 'skladiste' : 'salon')

export async function listTransfers(): Promise<Transfer[]> {
  const rows = await db.select().from(t.transfers).orderBy(desc(t.transfers.id))
  if (!rows.length) return []
  const moves = await db
    .select()
    .from(t.stockMovements)
    .where(inArray(t.stockMovements.transferId, rows.map((r) => r.id)))
    .orderBy(asc(t.stockMovements.id))
  return rows.map((r) => ({
    id: String(r.id),
    number: r.number,
    date: r.date,
    from: LOC(r.fromLocation),
    to: LOC(r.toLocation),
    employeeId: r.employeeId ? String(r.employeeId) : null,
    note: r.note,
    // Izlazna kretanja (s mjesta „od”) daju stavke primke.
    lines: moves
      .filter((m) => m.transferId === r.id && m.qty < 0)
      .map((m) => ({ productId: String(m.productId), qty: -m.qty })),
  }))
}

export interface TransferInput {
  actorId: string | null
  date: string
  from: StockLocation
  to: StockLocation
  note: string
  lines: { productId: string; qty: number }[]
}

export async function createTransfer(input: TransferInput) {
  if (input.from === input.to) throw new Error('Mjesto „od” i „na” moraju biti različiti.')
  const lines = input.lines
    .map((l) => ({ productId: Number(l.productId), qty: Math.round(l.qty) }))
    .filter((l) => l.qty > 0)
  if (!lines.length) throw new Error('Interna primka mora imati barem jednu stavku.')
  const date = input.date || todayIso()

  return db.transaction(async (tx) => {
    // Provjera: na mjestu „od” mora biti dovoljno robe.
    const ids = [...new Set(lines.map((l) => l.productId))]
    const have = await tx
      .select({ productId: t.stockMovements.productId, qty: sql<number>`coalesce(sum(${t.stockMovements.qty}), 0)::int` })
      .from(t.stockMovements)
      .where(and(inArray(t.stockMovements.productId, ids), eq(t.stockMovements.location, input.from)))
      .groupBy(t.stockMovements.productId)
    const stockOf = new Map(have.map((h) => [h.productId, h.qty]))
    for (const pid of ids) {
      const need = lines.filter((l) => l.productId === pid).reduce((s, l) => s + l.qty, 0)
      const avail = stockOf.get(pid) ?? 0
      if (need > avail) {
        const [p] = await tx.select({ name: t.products.name }).from(t.products).where(eq(t.products.id, pid))
        const where = input.from === 'skladiste' ? 'u skladištu' : 'u salonu'
        throw new Error(`Premještaj nije moguć: „${p?.name ?? 'artikal'}” ima ${avail} kom ${where}, a upisano je ${need}.`)
      }
    }

    const [{ next }] = (await tx.execute(sql`select coalesce(max(id), 0) + 1 as next from transfers`)).rows as { next: number }[]
    const number = `IP-${date.slice(2, 4)}-${String(next).padStart(4, '0')}`
    const [tr] = await tx
      .insert(t.transfers)
      .values({
        number,
        date,
        fromLocation: input.from,
        toLocation: input.to,
        employeeId: input.actorId ? Number(input.actorId) : null,
        note: input.note.trim(),
      })
      .returning()
    const label = `${number} (${input.from === 'skladiste' ? 'skladište → salon' : 'salon → skladište'})`
    await tx.insert(t.stockMovements).values(
      lines.flatMap((l) => [
        {
          productId: l.productId,
          date,
          type: 'premjestaj',
          qty: -l.qty,
          unitCost: 0,
          transferId: tr.id,
          location: input.from,
          employeeId: input.actorId ? Number(input.actorId) : null,
          note: `Interna primka ${label}`,
        },
        {
          productId: l.productId,
          date,
          type: 'premjestaj',
          qty: l.qty,
          unitCost: 0,
          transferId: tr.id,
          location: input.to,
          employeeId: input.actorId ? Number(input.actorId) : null,
          note: `Interna primka ${label}`,
        },
      ]),
    )
    return { id: String(tr.id), number }
  })
}
