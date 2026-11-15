/**
 * Prijedlog mjesečnog bonusa: fiksni dio (bruto plaća) + varijabilni dio.
 *
 * Prodavači: varijabilni dio raste od praga ostvarenja cilja (npr. 80 %) do
 * punog iznosa na 100 % cilja (npr. 20 % fiksne plaće); iznad cilja dodaje
 * se postotak od prometa preko cilja. Ako je prosječni popust prodavača
 * iznad dozvoljene granice, varijabilni dio se umanjuje.
 * Voditelj salona: isto pravilo, ali na ukupni promet i cilj salona.
 * Dostava i montaža: iznos po završenoj dostavi i po montaži.
 * Sve je ograničeno gornjom granicom (postotak fiksne plaće).
 */
import { employeeStats, isRevenue, monthKey, orderTotal } from './stats'
import type { Employee, Order } from './types'

export interface BonusPolicy {
  /** Prag ostvarenja cilja od kojeg počinje varijabilni dio (0,8 = 80 %). */
  salesThreshold: number
  /** Varijabilni dio na 100 % cilja, kao udio fiksne bruto plaće. */
  salesMaxPct: number
  /** Postotak od prometa iznad cilja. */
  overTargetRate: number
  /** Dozvoljeni prosječni popust; iznad toga varijabilni dio se umanjuje. */
  discountLimit: number
  /** Umanjenje varijabilnog dijela kod prekoračenja popusta (0,25 = −25 %). */
  discountPenalty: number
  /** Varijabilni dio voditelja na 100 % cilja salona, kao udio fiksne plaće. */
  managerMaxPct: number
  /** Iznos po završenoj dostavi (KM). */
  deliveryPerJob: number
  /** Dodatni iznos po montaži (KM). */
  assemblyPerJob: number
  /** Gornja granica varijabilnog dijela, kao udio fiksne plaće. */
  capPct: number
}

export const DEFAULT_POLICY: BonusPolicy = {
  salesThreshold: 0.8,
  salesMaxPct: 0.2,
  overTargetRate: 0.02,
  discountLimit: 0.08,
  discountPenalty: 0.25,
  managerMaxPct: 0.15,
  deliveryPerJob: 8,
  assemblyPerJob: 12,
  capPct: 0.5,
}

export interface BonusProposal {
  employee: Employee
  fixedGross: number
  variable: number
  /** Ostvarenje cilja (0–…) ili null za dostavu. */
  achievement: number | null
  basis: string
  capped: boolean
  penalized: boolean
}

const r2 = (v: number) => Math.round(v * 100) / 100
const pctTxt = (v: number) => `${Math.round(v * 100)} %`

/** Iznos varijabilnog dijela prema ostvarenju cilja. */
export function targetVariable(
  revenue: number,
  target: number,
  fixed: number,
  maxPct: number,
  p: BonusPolicy,
) {
  if (!target || !fixed) return 0
  const a = revenue / target
  if (a < p.salesThreshold) return 0
  if (a < 1)
    return fixed * maxPct * ((a - p.salesThreshold) / (1 - p.salesThreshold))
  return fixed * maxPct + p.overTargetRate * (revenue - target)
}

export function proposeBonus(
  employee: Employee,
  month: string,
  orders: Order[],
  salesPeople: Employee[],
  fixedGross: number,
  p: BonusPolicy,
): BonusProposal {
  const cap = fixedGross * p.capPct
  let variable = 0
  let achievement: number | null = null
  let basis = ''
  let penalized = false

  if (employee.role === 'Dostava i montaža') {
    const mine = orders.filter(
      (o) =>
        o.delivery?.driverId === employee.id &&
        o.delivery.status === 'dostavljeno' &&
        monthKey(o.delivery.date) === month,
    )
    const assemblies = mine.filter((o) => o.delivery!.assembly).length
    variable = mine.length * p.deliveryPerJob + assemblies * p.assemblyPerJob
    basis = `${mine.length} dostava × ${p.deliveryPerJob} + ${assemblies} montaža × ${p.assemblyPerJob}`
  } else if (employee.role === 'Voditelj salona') {
    const revenue = orders
      .filter((o) => isRevenue(o) && monthKey(o.date) === month)
      .reduce((s, o) => s + orderTotal(o), 0)
    const target = salesPeople.reduce((s, e) => s + e.monthlyTarget, 0)
    achievement = target ? revenue / target : 0
    variable = targetVariable(revenue, target, fixedGross, p.managerMaxPct, p)
    basis = `salon ${pctTxt(achievement)} cilja (${Math.round(revenue)} / ${Math.round(target)})`
  } else {
    const st = employeeStats(orders, month, [employee])[0]
    achievement = st.targetPct
    variable = targetVariable(
      st.revenue,
      employee.monthlyTarget,
      fixedGross,
      p.salesMaxPct,
      p,
    )
    const discountShare =
      st.revenue + st.discounts ? st.discounts / (st.revenue + st.discounts) : 0
    basis = `${pctTxt(achievement)} cilja (${Math.round(st.revenue)} / ${Math.round(employee.monthlyTarget)}), popusti ${pctTxt(discountShare)}`
    if (variable > 0 && discountShare > p.discountLimit) {
      variable *= 1 - p.discountPenalty
      penalized = true
      basis += ` → −${pctTxt(p.discountPenalty)} zbog popusta`
    }
  }

  const capped = fixedGross > 0 && variable > cap
  return {
    employee,
    fixedGross,
    variable: r2(capped ? cap : variable),
    achievement,
    basis: capped
      ? `${basis} (ograničeno na ${pctTxt(p.capPct)} plaće)`
      : basis,
    capped,
    penalized,
  }
}
