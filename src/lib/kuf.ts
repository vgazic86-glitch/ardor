/** Knjiga ulaznih računa (kontrolna): primke, troškovi i ručni računi dobavljača na jednom mjestu. */
import { VAT_RATE } from './format'
import { receiptNet, receiptVat } from './reports'
import type { Expense, LedgerEntry, Receipt, Supplier } from './types'

export type InputSource = 'primka' | 'trosak' | 'racun' | 'odobrenje'

export const INPUT_SOURCE_LABEL: Record<InputSource, string> = {
  primka: 'Primka (roba)',
  trosak: 'Trošak',
  racun: 'Račun dobavljača',
  odobrenje: 'Odobrenje (umanjenje)',
}

export interface InputRow {
  key: string
  date: string
  source: InputSource
  supplier: string
  document: string
  description: string
  base: number
  vat: number
  total: number
  /** PDV upisan s računa (ne procijenjen 17 %). */
  exactVat: boolean
}

const r2 = (v: number) => Math.round(v * 100) / 100

export function inputBook(
  { receipts, expenses, ledger, suppliers }: { receipts: Receipt[]; expenses: Expense[]; ledger: LedgerEntry[]; suppliers: Supplier[] },
  from: string,
  to: string,
): InputRow[] {
  const sup = new Map(suppliers.map((s) => [s.id, s.name]))
  const inP = (d: string) => d >= from && d <= to
  const rows: InputRow[] = []
  for (const r of receipts) {
    if (!inP(r.date)) continue
    const base = receiptNet(r)
    const vat = receiptVat(r)
    rows.push({
      key: `p${r.id}`,
      date: r.date,
      source: 'primka',
      supplier: sup.get(r.supplierId ?? '') ?? '—',
      document: r.documentNumber || r.number,
      description: `${r.number}${r.note ? ` · ${r.note}` : ''}`,
      base: r2(base),
      vat: r2(vat),
      total: r2(base + vat),
      exactVat: r.vat != null,
    })
  }
  for (const e of expenses) {
    if (!inP(e.date)) continue
    rows.push({
      key: `t${e.id}`,
      date: e.date,
      source: 'trosak',
      supplier: e.supplier || '—',
      document: e.documentNumber,
      description: [e.category, e.description].filter(Boolean).join(' · '),
      base: r2(e.net),
      vat: r2(e.vat),
      total: r2(e.net + e.vat),
      exactVat: true,
    })
  }
  for (const l of ledger) {
    if (!inP(l.date) || (l.kind !== 'zaduzenje' && l.kind !== 'odobrenje')) continue
    const sign = l.kind === 'odobrenje' ? -1 : 1
    const vat = l.vat ?? 0
    rows.push({
      key: `l${l.id}`,
      date: l.date,
      source: l.kind === 'zaduzenje' ? 'racun' : 'odobrenje',
      supplier: sup.get(l.supplierId) ?? '—',
      document: l.document,
      description: l.note,
      base: r2(sign * (l.amount - vat)),
      vat: r2(sign * vat),
      total: r2(sign * l.amount),
      exactVat: true,
    })
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key))
}

export function bookTotals(rows: InputRow[]) {
  const by = (src?: InputSource) => {
    const list = src ? rows.filter((r) => r.source === src) : rows
    return {
      count: list.length,
      base: r2(list.reduce((s, r) => s + r.base, 0)),
      vat: r2(list.reduce((s, r) => s + r.vat, 0)),
      total: r2(list.reduce((s, r) => s + r.total, 0)),
    }
  }
  return { all: by(), primka: by('primka'), trosak: by('trosak'), racun: by('racun'), odobrenje: by('odobrenje') }
}

/** Prijedlog PDV-a iz iznosa s PDV-om (17 %). */
export const vatFromGross = (gross: number) => r2(gross - gross / (1 + VAT_RATE))
