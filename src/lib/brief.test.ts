import { describe, expect, it } from 'vitest'
import { buildBrief, isBusinessQuestion, kmText } from './brief'
import type { Employee, Order, Product, StockMovement } from './types'

const product = (id: string, name: string, stock: number, minStock = 0): Product => ({
  id,
  sku: id,
  name,
  category: 'Sjedeće garniture',
  price: 1170,
  purchasePrice: 500,
  avgCost: 500,
  stock,
  minStock,
  supplierId: null,
  supplier: '—',
  leadTimeDays: 0,
  imageId: null,
  thumbId: null,
})
const emp: Employee = { id: 'e1', name: 'Marko', role: 'Prodavač', initials: 'MA', color: '#000', monthlyTarget: 10000, commissionRate: 0, phone: '' }
const order = (o: Partial<Order>): Order => ({
  id: '1',
  number: 'ARD-1',
  date: '2026-11-05',
  customerId: 'c1',
  employeeId: 'e1',
  items: [{ productId: 'sofa', qty: 1, unitPrice: 1170, discountPct: 0 }],
  status: 'isporučena',
  paymentMethod: 'Gotovina',
  paid: 1170,
  payments: [],
  delivery: null,
  note: '',
  issuedAt: '2026-11-06',
  ...o,
})
const move: StockMovement = {
  id: 'm',
  productId: 'sofa',
  date: '2026-11-06',
  type: 'izlaz',
  qty: -1,
  unitCost: 500,
  receiptId: null,
  orderId: '1',
  employeeId: null,
  note: '',
}

describe('kmText', () => {
  it('formatira kao u aplikaciji, bez Intl', () => {
    expect(kmText(1234567.5)).toBe('1.234.567,50 KM')
    expect(kmText(-20)).toBe('−20,00 KM')
  })
})

describe('buildBrief', () => {
  const text = buildBrief({
    today: '2026-11-17',
    orders: [
      order({}),
      order({ id: '2', number: 'ARD-2', date: '2026-10-01', issuedAt: '2026-10-02', paid: 170, customerId: 'c2' }),
    ],
    products: [product('sofa', 'Sofa Lena', 3, 5), product('stol', 'Stol Hrast', 2)],
    employees: [emp],
    customers: [
      { id: 'c1', name: 'Ana', phone: '', email: '', city: '', address: '' },
      { id: 'c2', name: 'Ivo Dužnik', phone: '', email: '', city: '', address: '' },
    ],
    movements: [move],
  })

  it('promet, plan i marža', () => {
    expect(text).toContain('novembar 2026.: 1.170,00 KM')
    expect(text).toContain('Plan za novembar 2026.: 10.000,00 KM; ostvareno 1.170,00 KM (12%)')
    // 1170 s PDV-om → neto 1000, nabavna 500 → marža 500 (50%)
    expect(text).toContain('prihod neto 1.000,00 KM, nabavna vrijednost 500,00 KM, marža 500,00 KM (50%)')
  })

  it('zalihe: minimum i artikli bez prodaje', () => {
    expect(text).toContain('Ispod minimuma (1): Sofa Lena (3/5)')
    expect(text).toContain('Bez prodaje 90 dana (1): Stol Hrast 2 kom')
  })

  it('naplata: dužnik koji kasni od dana isporuke', () => {
    expect(text).toContain('Ivo Dužnik (ARD-2): kasni 46 dana, dospjelo 1.000,00 KM')
  })

  it('nema plaća ni ugovora', () => {
    // cijele riječi („neplaćeno” i „Naplata” su u redu)
    expect(text).not.toMatch(/(^|[\s(])(plać|plat[ae]\s)|ugovor o radu|bruto/i)
  })
})

describe('isBusinessQuestion', () => {
  it('prepoznaje poslovna pitanja', () => {
    expect(isBusinessQuestion('Kakav je promet ovaj mjesec?')).toBe(true)
    expect(isBusinessQuestion('Ko nam najviše duguje?')).toBe(true)
    expect(isBusinessQuestion('kako upisati bolovanje')).toBe(false)
  })
})
