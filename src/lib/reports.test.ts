import { describe, expect, it } from 'vitest'
import { money, money2 } from './format'
import {
  advances,
  debts,
  marginBy,
  monthRange,
  realized,
  vatSummary,
} from './reports'
import type { Customer, Order, Product, Receipt, StockMovement } from './types'

const product: Product = {
  id: '1',
  sku: 'A-1',
  name: 'Fotelja',
  category: 'Sjedeće garniture',
  price: 1170,
  purchasePrice: 500,
  avgCost: 500,
  stock: 5,
  minStock: 1,
  supplierId: null,
  supplier: '—',
  leadTimeDays: 0,
  imageId: null,
  thumbId: null,
}
const order = (o: Partial<Order>): Order => ({
  id: '10',
  number: 'ARD-1',
  date: '2026-11-02',
  customerId: 'c1',
  employeeId: 'e1',
  items: [{ productId: '1', qty: 2, unitPrice: 1170, discountPct: 0 }],
  status: 'isporučena',
  paymentMethod: 'Kartica',
  paid: 0,
  payments: [],
  delivery: null,
  note: '',
  issuedAt: '2026-11-05',
  ...o,
})
const move = (m: Partial<StockMovement>): StockMovement => ({
  id: 'm',
  productId: '1',
  date: '2026-11-05',
  type: 'izlaz',
  qty: -2,
  unitCost: 500,
  receiptId: null,
  orderId: '10',
  employeeId: null,
  note: '',
  ...m,
})
const nov = monthRange('2026-11')

describe('reports', () => {
  it('monthRange gives first and last day', () => {
    expect(monthRange('2026-02')).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    })
  })

  it('recognises revenue when goods leave the salon and computes margin from stock movements', () => {
    const [s] = realized([order({})], [move({})], nov)
    expect(s.gross).toBe(2340)
    expect(s.net).toBeCloseTo(2000)
    expect(s.vat).toBeCloseTo(340)
    expect(s.cogs).toBe(1000)
    expect(s.margin).toBeCloseTo(1000)
  })

  it('ignores orders not yet issued, issued in another period, or cancelled', () => {
    const list = [
      order({ id: '1', issuedAt: null }),
      order({ id: '2', issuedAt: '2026-10-30' }),
      order({ id: '3', status: 'otkazana' }),
    ]
    expect(realized(list, [], nov)).toHaveLength(0)
  })

  it('nets out returns in cost of goods sold', () => {
    const [s] = realized(
      [order({})],
      [move({}), move({ type: 'povrat', qty: 1 }), move({ qty: -1 })],
      nov,
    )
    expect(s.cogs).toBe(1000)
  })

  it('VAT due = output VAT − input VAT from receipts in period', () => {
    const sales = realized([order({})], [move({})], nov)
    const rec: Receipt = {
      id: 'r',
      number: 'PR-1',
      date: '2026-11-03',
      supplierId: null,
      documentNumber: '',
      note: '',
      employeeId: null,
      lines: [{ productId: '1', qty: 2, unitCost: 500 }],
    }
    const v = vatSummary(sales, [rec], nov)
    expect(v.inVat).toBeCloseTo(170)
    expect(v.due).toBeCloseTo(170)
  })

  it('splits customer debt into due (delivered) and not yet due', () => {
    const c: Customer = {
      id: 'c1',
      name: 'Kupac',
      phone: '',
      email: '',
      city: '',
      address: '',
    }
    const list = [
      order({ id: '1', paid: 340 }),
      order({ id: '2', status: 'potvrđena', issuedAt: null, paid: 500 }),
    ]
    const [d] = debts(list, () => c, '2026-11-15')
    expect(d.due).toBe(2000 + 1840)
    expect(d.issuedDue).toBe(2000)
    expect(d.days).toBe(13)
    expect(advances(list)).toBe(500)
  })

  it('groups margin by category', () => {
    const g = marginBy(
      realized([order({})], [move({})], nov),
      [move({})],
      () => product,
      'category',
    )
    expect(g[0]).toMatchObject({
      label: 'Sjedeće garniture',
      qty: 2,
      cogs: 1000,
    })
  })

  it('formats money the same way on server and client', () => {
    expect(money(1234567.4)).toBe('1.234.567 KM')
    expect(money2(1234.5)).toBe('1.234,50 KM')
  })
})

describe('namještaj po mjeri u zaradi', () => {
  it('vanjski troškovi naloga ulaze u nabavnu vrijednost', async () => {
    const { realized } = await import('./reports')
    const order = {
      id: '9', number: 'X', date: '2026-11-20', customerId: '1', employeeId: '1', status: 'isporučena', paymentMethod: 'Gotovina', paid: 0, payments: [], delivery: null, note: '', issuedAt: '2026-11-20',
      items: [{ id: '5', productId: 'pm', qty: 1, unitPrice: 5850, discountPct: 0, customName: 'Kuhinja', work: { id: '1', number: 'RN', status: 'gotovo', dueDate: null, cost: 1700 } }],
    } as never
    const [row] = realized([order], [], { from: '2026-11-01', to: '2026-11-30' })
    expect(row.net).toBeCloseTo(5000)
    expect(row.cogs).toBe(1700)
    expect(row.margin).toBeCloseTo(3300)
  })
})
