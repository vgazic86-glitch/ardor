import { describe, expect, it } from 'vitest'
import { addMonths, planInstallments, receivable, receivables, receivableState, reminderText } from './collection'
import type { Customer, Order } from './types'

const order = (o: Partial<Order>): Order => ({
  id: '1',
  number: 'ARD-1',
  date: '2026-10-01',
  customerId: 'c1',
  employeeId: 'e1',
  items: [{ productId: 'p', qty: 1, unitPrice: 1200, discountPct: 0 }],
  status: 'isporučena',
  paymentMethod: 'Gotovina',
  paid: 0,
  payments: [],
  delivery: null,
  note: '',
  issuedAt: '2026-11-01',
  ...o,
})
const ana: Customer = { id: 'c1', name: 'Ana Babić', phone: '', email: '', city: '', address: '' }

describe('addMonths i plan rata', () => {
  it('kraj mjeseca ostaje u mjesecu', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-15')
  })
  it('jednake rate, zadnja preuzima zaokruživanje', () => {
    const p = planInstallments(1000, 3, '2026-12-01')
    expect(p.map((i) => i.amount)).toEqual([333.33, 333.33, 333.34])
    expect(p.map((i) => i.date)).toEqual(['2026-12-01', '2027-01-01', '2027-02-01'])
    expect(planInstallments(1000, 0, '2026-12-01')).toEqual([])
  })
})

describe('receivable — rok je dan isporuke', () => {
  it('plaćeno u cijelosti = nema potraživanja', () => {
    expect(receivable(order({ paid: 1200 }), '2026-11-20')).toBeNull()
  })
  it('isporučeno, neplaćeno: kasni od dana isporuke', () => {
    const r = receivable(order({ paid: 200 }), '2026-11-20')!
    expect(r.left).toBe(1000)
    expect(r.overdue).toBe(1000)
    expect(r.daysLate).toBe(19)
    expect(receivableState(r)).toBe('kasni')
  })
  it('na dan isporuke dospijeva, ali još ne kasni', () => {
    const r = receivable(order({}), '2026-11-01')!
    expect(r.daysLate).toBe(0)
    expect(receivableState(r)).toBe('dospijeva')
  })
  it('roba nije isporučena: nije dospjelo', () => {
    const r = receivable(order({ status: 'potvrđena', issuedAt: null, paid: 300 }), '2026-11-20')!
    expect(r.overdue).toBe(0)
    expect(receivableState(r)).toBe('nije_dospjelo')
  })
  it('upisani rok ima prednost pred danom isporuke', () => {
    const r = receivable(order({ dueDate: '2026-11-30' }), '2026-11-20')!
    expect(receivableState(r)).toBe('nije_dospjelo')
    expect(r.next).toEqual({ date: '2026-11-30', amount: 1200 })
  })
  it('ponuda i otkazana nisu potraživanje', () => {
    expect(receivable(order({ status: 'ponuda' }), '2026-11-20')).toBeNull()
    expect(receivable(order({ status: 'otkazana' }), '2026-11-20')).toBeNull()
  })
})

describe('receivable — rate', () => {
  const rate = (paid: number) =>
    order({
      paymentMethod: 'Rate',
      paid,
      installments: planInstallments(900, 3, '2026-10-15'), // 300 + 300 + 300, avans 300
    })
  it('avans i prva rata plaćeni, druga kasni', () => {
    const r = receivable(rate(600), '2026-11-20')!
    expect(r.plan).toEqual({ paid: 1, count: 3 })
    expect(r.overdue).toBe(300)
    expect(r.oldestDue).toBe('2026-11-15')
    expect(r.daysLate).toBe(5)
    expect(r.next).toEqual({ date: '2026-12-15', amount: 300 })
  })
  it('sve dospjele rate plaćene: ne kasni, sljedeća rata poznata', () => {
    const r = receivable(rate(900), '2026-11-20')!
    expect(r.daysLate).toBe(0)
    expect(r.overdue).toBe(0)
    expect(r.next?.date).toBe('2026-12-15')
  })
  it('djelomično plaćena rata', () => {
    const r = receivable(rate(750), '2026-11-20')!
    expect(r.overdue).toBe(150)
  })
})

describe('popis i podsjetnik', () => {
  it('najduže kašnjenje prvo', () => {
    const list = receivables(
      [order({ id: 'a', issuedAt: '2026-11-15' }), order({ id: 'b', issuedAt: '2026-10-01' }), order({ id: 'c', paid: 1200 })],
      '2026-11-20',
    )
    expect(list.map((r) => r.order.id)).toEqual(['b', 'a'])
  })
  it('podsjetnik navodi iznos, rok i sljedeću ratu', () => {
    const r = receivable(
      order({ paymentMethod: 'Rate', paid: 600, installments: planInstallments(900, 3, '2026-10-15') }),
      '2026-11-20',
    )!
    const t = reminderText(r, ana)
    expect(t).toContain('Poštovani/a Ana')
    expect(t).toContain('dospjelo za uplatu 300 KM (rok: 15. nov 2026.)')
    expect(t).toContain('Sljedeća rata: 300 KM do 15. dec 2026.')
  })
})
