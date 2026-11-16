/** Kartica dobavljača: zaduženja (primke + računi) i razduženja (uplate, odobrenja). */
import { receiptNet, receiptVat } from './reports'
import type { LedgerEntry, Receipt } from './types'

export interface LedgerRow {
  key: string
  date: string
  kind: LedgerEntry['kind'] | 'primka'
  document: string
  note: string
  /** Duguje (obaveza prema dobavljaču raste). */
  debit: number
  /** Potražuje (plaćeno / odobreno). */
  credit: number
  balance: number
  entry: LedgerEntry | null
  receipt: Receipt | null
}

const r2 = (v: number) => Math.round(v * 100) / 100

/**
 * Redovi kartice za jednog dobavljača, hronološki, sa saldom.
 * Saldo > 0 znači da salon duguje dobavljaču.
 * `receiptsAsDebt` = primke se automatski knjiže kao zaduženje (s PDV-om).
 */
export function ledgerRows(supplierId: string, receipts: Receipt[], entries: LedgerEntry[], receiptsAsDebt = true): LedgerRow[] {
  const rows: Omit<LedgerRow, 'balance'>[] = []
  if (receiptsAsDebt)
    for (const r of receipts) {
      if (r.supplierId !== supplierId) continue
      const gross = r2(receiptNet(r) + receiptVat(r))
      if (!gross) continue
      rows.push({
        key: `r${r.id}`,
        date: r.date,
        kind: 'primka',
        document: [r.number, r.documentNumber].filter(Boolean).join(' · '),
        note: r.note,
        debit: gross,
        credit: 0,
        entry: null,
        receipt: r,
      })
    }
  for (const e of entries) {
    if (e.supplierId !== supplierId) continue
    const debit = e.kind === 'zaduzenje' || (e.kind === 'pocetno' && e.amount > 0) ? Math.abs(e.amount) : 0
    const credit = e.kind === 'uplata' || e.kind === 'odobrenje' || (e.kind === 'pocetno' && e.amount < 0) ? Math.abs(e.amount) : 0
    rows.push({ key: `e${e.id}`, date: e.date, kind: e.kind, document: e.document, note: e.note, debit, credit, entry: e, receipt: null })
  }
  const order = (k: LedgerRow['kind']) => (k === 'pocetno' ? 0 : 1)
  rows.sort((a, b) => a.date.localeCompare(b.date) || order(a.kind) - order(b.kind) || a.key.localeCompare(b.key))
  let bal = 0
  return rows.map((r) => {
    bal = r2(bal + r.debit - r.credit)
    return { ...r, balance: bal }
  })
}

export function ledgerTotals(rows: LedgerRow[]) {
  const debit = rows.reduce((s, r) => s + r.debit, 0)
  const credit = rows.reduce((s, r) => s + r.credit, 0)
  return { debit: r2(debit), credit: r2(credit), balance: r2(debit - credit), last: rows[rows.length - 1] ?? null }
}
