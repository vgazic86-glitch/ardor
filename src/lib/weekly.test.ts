import { describe, expect, it } from 'vitest'
import { buildWeekly, previousWeek, weeklyHtml, weeklySubject, weeklyText } from './weekly'
import type { Customer, Employee, Order, Product } from './types'

const product = (id: string, name: string, stock: number): Product => ({
  id,
  sku: id,
  name,
  category: 'Sjedeće garniture',
  price: 1000,
  purchasePrice: 500,
  avgCost: 500,
  stock,
  minStock: 0,
  supplierId: null,
  supplier: '—',
  leadTimeDays: 0,
  imageId: null,
  thumbId: null,
})
const emp = (id: string, name: string, target = 10000): Employee => ({
  id,
  name,
  role: 'Prodavač',
  initials: name.slice(0, 2),
  color: '#000',
  monthlyTarget: target,
  commissionRate: 0,
  phone: '',
})
const order = (o: Partial<Order>): Order => ({
  id: '1',
  number: 'ARD-1',
  date: '2026-11-10',
  customerId: 'c1',
  employeeId: 'e1',
  items: [{ productId: 'sofa', qty: 1, unitPrice: 1000, discountPct: 0 }],
  status: 'potvrđena',
  paymentMethod: 'Gotovina',
  paid: 0,
  payments: [],
  delivery: null,
  note: '',
  issuedAt: null,
  ...o,
})
const customers: Customer[] = [{ id: 'c1', name: 'Ana <Test>', phone: '', email: '', city: '', address: '' }]

describe('previousWeek', () => {
  it('u ponedjeljak daje prošli ponedjeljak–nedjelju', () => {
    expect(previousWeek('2026-11-16')).toEqual({ from: '2026-11-09', to: '2026-11-15' })
  })
  it('i usred sedmice daje prethodnu punu sedmicu', () => {
    expect(previousWeek('2026-11-18')).toEqual({ from: '2026-11-09', to: '2026-11-15' })
    expect(previousWeek('2026-11-22')).toEqual({ from: '2026-11-09', to: '2026-11-15' })
  })
})

describe('buildWeekly', () => {
  const orders = [
    order({ id: '1', number: 'ARD-1', date: '2026-11-10', paid: 200, payments: [{ id: 'p', date: '2026-11-10', amount: 200, method: 'Gotovina', employeeId: null }] }),
    order({ id: '2', number: 'ARD-2', date: '2026-11-12', employeeId: 'e2', items: [{ productId: 'stol', qty: 2, unitPrice: 500, discountPct: 10 }] }),
    order({ id: '3', number: 'ARD-3', date: '2026-11-14', status: 'ponuda' }),
    order({ id: '4', number: 'ARD-4', date: '2026-11-03', status: 'otkazana' }),
    order({ id: '5', number: 'ARD-5', date: '2026-11-04' }),
  ]
  const w = buildWeekly({
    today: '2026-11-16',
    orders,
    products: [product('sofa', 'Sofa Lena', 1), product('stol', 'Stol Hrast', 5)],
    employees: [emp('e1', 'Marko'), emp('e2', 'Lejla')],
    customers,
    movements: [],
    complaints: [
      { number: 'R-1', customerName: 'Ana', productName: 'Sofa', status: 'u_obradi', dueDate: '2026-11-12' },
      { number: 'R-2', customerName: 'Ivo', productName: 'Stol', status: 'prijavljena', dueDate: '2026-11-30' },
      { number: 'R-3', customerName: 'Edo', productName: 'Stol', status: 'rijesena', dueDate: '2026-11-01' },
    ],
  })

  it('prodaja sedmice bez ponuda i otkazanih, uz poređenje s prethodnom', () => {
    expect(w.sales.count).toBe(2)
    expect(w.sales.value).toBe(1900)
    expect(w.sales.prevValue).toBe(1000)
    expect(w.collected).toBe(200)
  })

  it('plan mjeseca zbraja ciljeve prodavača', () => {
    expect(w.month.key).toBe('2026-11')
    expect(w.month.target).toBe(20000)
    expect(w.month.revenue).toBe(2900)
  })

  it('prodavači i artikli poredani po iznosu', () => {
    expect(w.sellers.map((s) => s.name)).toEqual(['Marko', 'Lejla'])
    expect(w.topProducts[0]).toEqual({ name: 'Sofa Lena', qty: 1, value: 1000 })
    expect(w.topProducts[1]).toEqual({ name: 'Stol Hrast', qty: 2, value: 900 })
  })

  it('narudžbe kupaca koje čekaju robu', () => {
    // Sofa: zaliha 1 ide najstarijoj prodaji (ARD-5), ARD-1 čeka robu.
    expect(w.waiting.count).toBe(1)
    expect(w.waiting.oldestDays).toBe(6)
  })

  it('reklamacije: otvorene i s probijenim rokom', () => {
    expect(w.complaints.open).toBe(2)
    expect(w.complaints.overdue).toBe(1)
    expect(w.complaints.overdueList[0].number).toBe('R-1')
  })

  it('poruka ima naslov, tekst i HTML bez ubačenog koda', () => {
    expect(weeklySubject(w)).toContain('9. nov 2026.')
    expect(weeklyText(w, 'https://x')).toContain('Prodaja sedmice: 1.900 KM')
    const html = weeklyHtml(w, 'https://x')
    expect(html).toContain('Sofa Lena')
    expect(html).toContain('Ana &lt;Test&gt;')
    expect(html).not.toContain('Ana <Test>')
  })
})
