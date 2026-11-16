import { describe, expect, it } from 'vitest'
import { bookTotals, inputBook, vatFromGross } from './kuf'
import { receiptVat } from './reports'
import type { Expense, LedgerEntry, Receipt, Supplier } from './types'

const sup: Supplier[] = [{ id: '1', name: 'Dream Line', phone: '', email: '', leadTimeDays: 7 }]
const rec = (id: string, date: string, net: number, vat?: number | null): Receipt => ({
  id, number: `PR-${id}`, date, supplierId: '1', documentNumber: `RN ${id}`, note: '', employeeId: null, vat,
  lines: [{ productId: '1', qty: 1, unitCost: net }],
})
const exp = (date: string, net: number, vat: number): Expense => ({
  id: 'e1', date, category: 'Režije', description: 'Struja', supplier: 'Elektro', documentNumber: '12', net, vat, paymentMethod: 'Virman', recurring: false, file: null,
})
const led = (kind: LedgerEntry['kind'], amount: number, vat: number): LedgerEntry => ({
  id: kind, supplierId: '1', date: '2026-11-10', kind, amount, vat, document: 'X', note: '', createdByName: '',
})

describe('knjiga ulaznih računa', () => {
  it('PDV primke: s računa ili 17 %', () => {
    expect(receiptVat(rec('1', '2026-11-01', 1000))).toBe(170)
    expect(receiptVat(rec('2', '2026-11-01', 1000, 0))).toBe(0)
    expect(receiptVat(rec('3', '2026-11-01', 1000, 169.5))).toBe(169.5)
  })
  it('spaja primke, troškove, račune i odobrenja u periodu', () => {
    const rows = inputBook(
      {
        receipts: [rec('1', '2026-11-02', 1000), rec('2', '2026-10-30', 500), rec('3', '2026-11-05', 200, 34.5)],
        expenses: [exp('2026-11-03', 100, 17)],
        ledger: [led('zaduzenje', 117, 17), led('odobrenje', 58.5, 8.5), led('uplata', 1000, 0)],
        suppliers: sup,
      },
      '2026-11-01',
      '2026-11-30',
    )
    expect(rows.map((r) => r.source).slice(0, 3)).toEqual(['primka', 'trosak', 'primka'])
    expect(rows.length).toBe(5)
    const t = bookTotals(rows)
    expect(t.all.vat).toBe(170 + 17 + 34.5 + 17 - 8.5)
    expect(t.odobrenje.total).toBe(-58.5)
    expect(rows.find((r) => r.key === 'p1')!.exactVat).toBe(false)
  })
  it('PDV iz bruto iznosa', () => {
    expect(vatFromGross(117)).toBe(17)
  })
})
