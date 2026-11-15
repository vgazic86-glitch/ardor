/** Računanje sati iz evidencije radnog vremena. */
import type { WorkDay } from './types'

export const STANDARD_DAY_MIN = 8 * 60

export function toMin(hhmm: string): number | null {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(hhmm.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 24 || min > 59) return null
  return h * 60 + min
}

/** Odrađene minute za dan (rad preko ponoći se računa do jutra). */
export function workedMin(d: Pick<WorkDay, 'kind' | 'start' | 'end' | 'breakMin'>) {
  if (d.kind !== 'rad') return 0
  const a = toMin(d.start)
  const b = toMin(d.end)
  if (a == null || b == null) return 0
  const span = b >= a ? b - a : b + 1440 - a
  return Math.max(0, span - Math.max(0, d.breakMin || 0))
}

export function hours(min: number) {
  const sign = min < 0 ? '−' : ''
  const m = Math.abs(Math.round(min))
  return `${sign}${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

/** Radni dani u mjesecu (pon–pet, po želji i subote), za fond sati. */
export function workingDaysInMonth(month: string, saturdays = false) {
  const [y, m] = month.split('-').map(Number)
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  let n = 0
  for (let d = 1; d <= days; d++) {
    const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
    if (wd !== 0 && (saturdays || wd !== 6)) n++
  }
  return n
}

export interface MonthSummary {
  workedMin: number
  daysWorked: number
  overtimeMin: number
  vacation: number
  sick: number
  holiday: number
  off: number
}

export function summarize(days: WorkDay[]): MonthSummary {
  const s: MonthSummary = { workedMin: 0, daysWorked: 0, overtimeMin: 0, vacation: 0, sick: 0, holiday: 0, off: 0 }
  for (const d of days) {
    if (d.kind === 'rad') {
      const w = workedMin(d)
      if (w > 0) {
        s.workedMin += w
        s.daysWorked++
        s.overtimeMin += Math.max(0, w - STANDARD_DAY_MIN)
      }
    } else if (d.kind === 'godisnji') s.vacation++
    else if (d.kind === 'bolovanje') s.sick++
    else if (d.kind === 'praznik') s.holiday++
    else s.off++
  }
  return s
}

/** Svi datumi u mjesecu (YYYY-MM-DD). */
export function monthDates(month: string) {
  const [y, m] = month.split('-').map(Number)
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
}
