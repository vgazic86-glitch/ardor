import { describe, expect, it } from 'vitest'
import { hours, summarize, workedMin, workingDaysInMonth } from './worktime'
import type { WorkDay } from './types'

const d = (p: Partial<WorkDay>): WorkDay => ({ id: '1', employeeId: '1', date: '2026-11-02', kind: 'rad', start: '', end: '', breakMin: 0, note: '', updatedByName: '', ...p })

describe('radno vrijeme', () => {
  it('računa odrađene minute s pauzom i preko ponoći', () => {
    expect(workedMin(d({ start: '08:00', end: '16:30', breakMin: 30 }))).toBe(480)
    expect(workedMin(d({ start: '22:00', end: '06:00' }))).toBe(480)
    expect(workedMin(d({ kind: 'godisnji', start: '08:00', end: '16:00' }))).toBe(0)
    expect(workedMin(d({ start: '08:00', end: '' }))).toBe(0)
  })
  it('sažetak mjeseca i prekovremeni', () => {
    const s = summarize([
      d({ start: '08:00', end: '18:00', breakMin: 30 }),
      d({ start: '08:00', end: '16:00' }),
      d({ kind: 'godisnji' }),
      d({ kind: 'bolovanje' }),
    ])
    expect(s).toMatchObject({ workedMin: 570 + 480, daysWorked: 2, overtimeMin: 90, vacation: 1, sick: 1 })
    expect(hours(570)).toBe('9:30')
  })
  it('radni dani u mjesecu', () => {
    expect(workingDaysInMonth('2026-11')).toBe(21)
    expect(workingDaysInMonth('2026-11', true)).toBe(25)
  })
})
