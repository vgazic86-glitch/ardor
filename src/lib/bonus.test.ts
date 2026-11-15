import { describe, expect, it } from 'vitest'
import { DEFAULT_POLICY, proposeBonus, targetVariable } from './bonus'
import { contractState, monthEnd, salaryOn } from './hr'
import type { Employee, EmployeeFile, Order, Salary } from './types'

const p = DEFAULT_POLICY
const seller: Employee = {
  id: 's',
  name: 'Lejla',
  role: 'Prodavač',
  initials: 'L',
  color: '#000',
  monthlyTarget: 20000,
  commissionRate: 0.03,
  phone: '',
}
const manager: Employee = {
  ...seller,
  id: 'm',
  name: 'Amra',
  role: 'Voditelj salona',
  monthlyTarget: 0,
}
const driver: Employee = {
  ...seller,
  id: 'd',
  name: 'Saša',
  role: 'Dostava i montaža',
  monthlyTarget: 0,
}

const order = (o: Partial<Order>): Order => ({
  id: 'o',
  number: 'A',
  date: '2026-10-10',
  customerId: 'c',
  employeeId: 's',
  items: [{ productId: 'p', qty: 1, unitPrice: 10000, discountPct: 0 }],
  status: 'isporučena',
  paymentMethod: 'Kartica',
  paid: 0,
  payments: [],
  delivery: null,
  note: '',
  issuedAt: '2026-10-11',
  ...o,
})

describe('targetVariable', () => {
  it('is zero below threshold, linear to max at target, plus over-target share', () => {
    expect(targetVariable(15000, 20000, 2000, 0.2, p)).toBe(0)
    expect(targetVariable(18000, 20000, 2000, 0.2, p)).toBeCloseTo(200)
    expect(targetVariable(20000, 20000, 2000, 0.2, p)).toBeCloseTo(400)
    expect(targetVariable(25000, 20000, 2000, 0.2, p)).toBeCloseTo(500)
  })
})

describe('proposeBonus', () => {
  it('seller at 100 % of target gets max share of fixed pay', () => {
    const orders = [order({ id: '1' }), order({ id: '2' })]
    const b = proposeBonus(seller, '2026-10', orders, [seller], 2000, p)
    expect(b.achievement).toBe(1)
    expect(b.variable).toBe(400)
    expect(b.penalized).toBe(false)
  })

  it('reduces variable part when discounts exceed the limit', () => {
    const disc = { productId: 'p', qty: 1, unitPrice: 12500, discountPct: 20 }
    const orders = [
      order({ id: '1', items: [disc] }),
      order({ id: '2', items: [disc] }),
    ]
    const b = proposeBonus(seller, '2026-10', orders, [seller], 2000, p)
    expect(b.penalized).toBe(true)
    expect(b.variable).toBe(300)
  })

  it('caps the variable part', () => {
    const orders = [
      order({
        id: '1',
        items: [{ productId: 'p', qty: 1, unitPrice: 200000, discountPct: 0 }],
      }),
    ]
    const b = proposeBonus(seller, '2026-10', orders, [seller], 2000, p)
    expect(b.capped).toBe(true)
    expect(b.variable).toBe(1000)
  })

  it('manager uses salon total against team target', () => {
    const b = proposeBonus(
      manager,
      '2026-10',
      [order({ id: '1' }), order({ id: '2' })],
      [seller, manager],
      2600,
      p,
    )
    expect(b.achievement).toBe(1)
    expect(b.variable).toBeCloseTo(390)
  })

  it('driver is paid per completed delivery and assembly', () => {
    const del = (
      id: string,
      assembly: boolean,
      status: 'dostavljeno' | 'zakazana' = 'dostavljeno',
    ) =>
      order({
        id,
        delivery: {
          date: '2026-10-12',
          slot: '08–12',
          address: '',
          city: '',
          driverId: 'd',
          assembly,
          status,
        },
      })
    const b = proposeBonus(
      driver,
      '2026-10',
      [del('1', true), del('2', false), del('3', true, 'zakazana')],
      [seller],
      1700,
      p,
    )
    expect(b.variable).toBe(2 * 8 + 12)
  })
})

describe('hr helpers', () => {
  const sal = (validFrom: string, gross: number): Salary => ({
    id: validFrom,
    employeeId: 's',
    validFrom,
    gross,
    net: gross * 0.65,
    meal: 0,
    transport: 0,
    note: '',
  })
  it('picks the salary valid on a date', () => {
    const list = [sal('2026-01-01', 1800), sal('2026-07-01', 2000)]
    expect(salaryOn(list, 's', '2026-06-30')?.gross).toBe(1800)
    expect(salaryOn(list, 's', '2026-07-01')?.gross).toBe(2000)
    expect(salaryOn(list, 's', '2025-12-31')).toBeNull()
  })

  it('reports contract state', () => {
    const f = (validUntil: string | null): EmployeeFile => ({
      id: '1',
      employeeId: 's',
      category: 'Ugovor o radu',
      title: 'U',
      validFrom: '2026-01-01',
      validUntil,
      note: '',
      file: null,
      createdAt: '2026-01-01',
    })
    expect(contractState([], 's', '2026-11-15').label).toBe('Nema ugovora')
    expect(contractState([f(null)], 's', '2026-11-15').tone).toBe('good')
    expect(contractState([f('2026-12-01')], 's', '2026-11-15')).toMatchObject({
      tone: 'warn',
      days: 16,
    })
    expect(contractState([f('2026-11-01')], 's', '2026-11-15').tone).toBe('bad')
  })

  it('monthEnd handles February', () => {
    expect(monthEnd('2026-02')).toBe('2026-02-28')
  })
})
