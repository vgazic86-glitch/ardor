/** Pomoćne funkcije za kadrovsku evidenciju (čiste, bez pristupa serveru). */
import { daysBetween } from './reports'
import type { EmployeeFile, Salary } from './types'

/** Plaća koja vrijedi na dan `on` (zadnja s validFrom ≤ on), ili null. */
export function salaryOn(
  salaries: Salary[],
  employeeId: string,
  on: string,
): Salary | null {
  const mine = salaries
    .filter((s) => s.employeeId === employeeId)
    .sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1))
  return mine.find((s) => s.validFrom <= on) ?? null
}

export type ContractState = {
  label: string
  tone: 'good' | 'warn' | 'bad' | 'neutral'
  days: number | null
}

/** Stanje ugovora o radu: na neodređeno, ističe uskoro, istekao ili nema ugovora. */
export function contractState(
  files: EmployeeFile[],
  employeeId: string,
  today: string,
): ContractState {
  const contracts = files
    .filter(
      (f) =>
        f.employeeId === employeeId &&
        (f.category === 'Ugovor o radu' || f.category === 'Aneks ugovora'),
    )
    .sort((a, b) =>
      (a.validFrom ?? a.createdAt) < (b.validFrom ?? b.createdAt) ? 1 : -1,
    )
  if (!contracts.length)
    return { label: 'Nema ugovora', tone: 'bad', days: null }
  const c = contracts[0]
  if (!c.validUntil) return { label: 'Neodređeno', tone: 'good', days: null }
  const days = daysBetween(today, c.validUntil)
  if (days < 0) return { label: `Istekao prije ${-days} d.`, tone: 'bad', days }
  if (days <= 30) return { label: `Ističe za ${days} d.`, tone: 'warn', days }
  return {
    label: `Određeno do ${c.validUntil.split('-').reverse().join('.')}.`,
    tone: 'neutral',
    days,
  }
}

/** Zadnji dan mjeseca 'YYYY-MM'. */
export function monthEnd(key: string) {
  const [y, m] = key.split('-').map(Number)
  return `${key}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`
}
