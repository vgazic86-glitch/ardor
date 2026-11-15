import { describe, expect, it } from 'vitest'
import { monthProfit, payrollFor } from './profit'
import type {
  Bonus,
  Employee,
  Expense,
  FinanceSettings,
  Order,
  Receipt,
  Salary,
  StockMovement,
} from './types'

const emp: Employee = {
  id: 'e1',
  name: 'A',
  role: 'Prodavač',
  initials: 'A',
  color: '#000',
  monthlyTarget: 0,
  commissionRate: 0,
  phone: '',
}
const order: Order = {
  id: 'o1',
  number: 'A-1',
  date: '2026-10-02',
  customerId: 'c',
  employeeId: 'e1',
  items: [{ productId: 'p', qty: 1, unitPrice: 11700, discountPct: 0 }],
  status: 'isporučena',
  paymentMethod: 'Kartica',
  paid: 11700,
  payments: [],
  delivery: null,
  note: '',
  issuedAt: '2026-10-05',
}
const move: StockMovement = {
  id: 'm',
  productId: 'p',
  date: '2026-10-05',
  type: 'izlaz',
  qty: -1,
  unitCost: 6000,
  receiptId: null,
  orderId: 'o1',
  employeeId: null,
  note: '',
}
const exp = (date: string, net: number, vat = 0): Expense => ({
  id: date + net,
  date,
  category: 'Zakup prostora',
  description: '',
  supplier: '',
  documentNumber: '',
  net,
  vat,
  paymentMethod: 'Virman',
  recurring: true,
  file: null,
})
const sal: Salary = {
  id: 's',
  employeeId: 'e1',
  validFrom: '2026-01-01',
  gross: 2000,
  net: 1300,
  meal: 200,
  transport: 50,
  note: '',
}
const bonus: Bonus = {
  id: 'b',
  employeeId: 'e1',
  month: '2026-10',
  fixedGross: 2000,
  proposed: 300,
  approved: 250,
  status: 'odobreno',
  basis: '',
  note: '',
}
const rec: Receipt = {
  id: 'r',
  number: 'PR',
  date: '2026-10-03',
  supplierId: null,
  documentNumber: '',
  note: '',
  employeeId: null,
  lines: [{ productId: 'p', qty: 1, unitCost: 1000 }],
}
const settings: FinanceSettings = {
  includePayroll: true,
  employerContribPct: 0,
  profitTaxPct: 0.1,
}

const base = {
  orders: [order],
  movements: [move],
  receipts: [rec],
  expenses: [exp('2026-10-01', 1500, 255), exp('2026-09-01', 999)],
  salaries: [sal],
  bonuses: [bonus],
  employees: [emp],
  settings,
}

describe('monthProfit', () => {
  it('builds the monthly profit statement', () => {
    const p = monthProfit('2026-10', base)
    expect(p.revenueNet).toBeCloseTo(10000)
    expect(p.cogs).toBe(6000)
    expect(p.grossMargin).toBeCloseTo(4000)
    expect(p.expenses).toBe(1500) // septembarski trošak ne ulazi
    expect(p.payroll).toMatchObject({
      gross: 2000,
      allowances: 250,
      bonuses: 250,
      total: 2500,
    })
    expect(p.profitBeforeTax).toBeCloseTo(0)
    expect(p.tax).toBe(0)
  })

  it('estimates tax only on positive profit and nets VAT', () => {
    const p = monthProfit('2026-10', {
      ...base,
      expenses: [exp('2026-10-01', 500, 85)],
    })
    expect(p.profitBeforeTax).toBeCloseTo(1000)
    expect(p.tax).toBeCloseTo(100)
    expect(p.netProfit).toBeCloseTo(900)
    expect(p.vat.output).toBeCloseTo(1700)
    expect(p.vat.inputReceipts).toBeCloseTo(170)
    expect(p.vat.inputExpenses).toBe(85)
    expect(p.vat.due).toBeCloseTo(1445)
  })

  it('can exclude payroll and add employer contributions', () => {
    expect(
      monthProfit('2026-10', {
        ...base,
        settings: { ...settings, includePayroll: false },
      }).payroll.total,
    ).toBe(0)
    expect(
      payrollFor('2026-10', {
        ...base,
        settings: { ...settings, employerContribPct: 0.1 },
      }).contributions,
    ).toBeCloseTo(225)
  })

  it('ignores salaries that start after the month', () => {
    expect(payrollFor('2025-12', base).gross).toBe(0)
  })
})
