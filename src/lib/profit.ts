/**
 * Mjesečni obračun zarade (upravljački račun dobiti i gubitka):
 *   prihod bez PDV-a (realizacija)
 * − nabavna vrijednost prodane robe
 * = bruto marža
 * − troškovi poslovanja (uneseni troškovi, bez PDV-a)
 * − troškovi zaposlenih (bruto plaće, topli obrok, prijevoz, doprinosi poslodavca, odobreni bonusi)
 * = dobit prije poreza
 * − procjena poreza na dobit
 * = neto dobit
 *
 * Ovo je upravljački izračun za praćenje poslovanja, ne zvanični finansijski izvještaj.
 */
import { VAT_RATE } from './format'
import { salaryOn, monthEnd } from './hr'
import { monthRange, realized, receiptNet, sum } from './reports'
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

export interface MonthProfit {
  month: string
  revenueNet: number
  revenueGross: number
  cogs: number
  grossMargin: number
  expenses: number
  expensesByCategory: [string, number][]
  payroll: {
    gross: number
    allowances: number
    contributions: number
    bonuses: number
    total: number
  }
  costsTotal: number
  profitBeforeTax: number
  tax: number
  netProfit: number
  /** Neto marža = dobit prije poreza / prihod bez PDV-a. */
  margin: number
  vat: {
    output: number
    inputReceipts: number
    inputExpenses: number
    due: number
  }
  orders: number
}

export interface ProfitInput {
  orders: Order[]
  movements: StockMovement[]
  receipts: Receipt[]
  expenses: Expense[]
  salaries: Salary[]
  bonuses: Bonus[]
  employees: Employee[]
  settings: FinanceSettings
}

export function payrollFor(
  month: string,
  x: Pick<ProfitInput, 'salaries' | 'bonuses' | 'employees' | 'settings'>,
) {
  const end = monthEnd(month)
  let gross = 0
  let allowances = 0
  for (const e of x.employees) {
    const s = salaryOn(x.salaries, e.id, end)
    if (!s) continue
    gross += s.gross
    allowances += s.meal + s.transport
  }
  const bonuses = sum(
    x.bonuses.filter((b) => b.month === month && b.status === 'odobreno'),
    (b) => b.approved ?? 0,
  )
  const contributions = (gross + bonuses) * x.settings.employerContribPct
  return {
    gross,
    allowances,
    contributions,
    bonuses,
    total: gross + allowances + contributions + bonuses,
  }
}

export function monthProfit(month: string, x: ProfitInput): MonthProfit {
  const p = monthRange(month)
  const sales = realized(x.orders, x.movements, p)
  const revenueNet = sum(sales, (s) => s.net)
  const revenueGross = sum(sales, (s) => s.gross)
  const cogs = sum(sales, (s) => s.cogs)
  const exp = x.expenses.filter((e) => e.date >= p.from && e.date <= p.to)
  const byCat = new Map<string, number>()
  for (const e of exp)
    byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.net)
  const expenses = sum(exp, (e) => e.net)
  const payroll = x.settings.includePayroll
    ? payrollFor(month, x)
    : { gross: 0, allowances: 0, contributions: 0, bonuses: 0, total: 0 }
  const grossMargin = revenueNet - cogs
  const profitBeforeTax = grossMargin - expenses - payroll.total
  const tax = Math.max(0, profitBeforeTax) * x.settings.profitTaxPct
  const inputReceipts = sum(
    x.receipts.filter((r) => r.date >= p.from && r.date <= p.to),
    (r) => receiptNet(r) * VAT_RATE,
  )
  const inputExpenses = sum(exp, (e) => e.vat)
  const output = revenueGross - revenueNet
  return {
    month,
    revenueNet,
    revenueGross,
    cogs,
    grossMargin,
    expenses,
    expensesByCategory: [...byCat.entries()].sort((a, b) => b[1] - a[1]),
    payroll,
    costsTotal: cogs + expenses + payroll.total,
    profitBeforeTax,
    tax,
    netProfit: profitBeforeTax - tax,
    margin: revenueNet ? profitBeforeTax / revenueNet : 0,
    vat: {
      output,
      inputReceipts,
      inputExpenses,
      due: output - inputReceipts - inputExpenses,
    },
    orders: sales.length,
  }
}
