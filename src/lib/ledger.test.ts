import { describe, expect, it } from 'vitest'
import { ledgerRows, ledgerTotals } from './ledger'
import type { LedgerEntry, Receipt } from './types'

const rec = (id: string, date: string, net: number, supplierId = '1'): Receipt => ({
  id, number: `PR-${id}`, date, supplierId, documentNumber: '', note: '', employeeId: null,
  lines: [{ productId: '1', qty: 1, unitCost: net }],
})
const e = (id: string, date: string, kind: LedgerEntry['kind'], amount: number): LedgerEntry => ({
  id, supplierId: '1', date, kind, amount, document: '', note: '', createdByName: '',
})

describe('kartica dobavljača', () => {
  it('primke zadužuju s PDV-om, uplate razdužuju, saldo hronološki', () => {
    const rows = ledgerRows('1', [rec('1', '2026-11-02', 1000), rec('2', '2026-11-01', 100, '2')], [
      e('1', '2026-11-01', 'pocetno', 500),
      e('2', '2026-11-05', 'uplata', 1170),
      e('3', '2026-11-06', 'odobrenje', 100),
    ])
    expect(rows.map((r) => r.kind)).toEqual(['pocetno', 'primka', 'uplata', 'odobrenje'])
    expect(rows[1].debit).toBe(1170)
    expect(rows.map((r) => r.balance)).toEqual([500, 1670, 500, 400])
    expect(ledgerTotals(rows)).toMatchObject({ debit: 1670, credit: 1270, balance: 400 })
  })
  it('negativno početno stanje = preplata', () => {
    const rows = ledgerRows('1', [], [e('1', '2026-01-01', 'pocetno', -200)])
    expect(rows[0].credit).toBe(200)
    expect(rows[0].balance).toBe(-200)
  })
})
