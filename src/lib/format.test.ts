import { describe, expect, it } from 'vitest'
import { date, dateShort, parseAmount } from './format'

describe('parseAmount', () => {
  it('čita iznose s hiljadama i decimalnim zarezom', () => {
    expect(parseAmount('8.450,00')).toBe(8450)
    expect(parseAmount('8 450,5')).toBe(8450.5)
    expect(parseAmount('1250,75')).toBe(1250.75)
    expect(parseAmount('99.5')).toBe(99.5)
    expect(parseAmount('')).toBe(0)
    expect(parseAmount('abc')).toBe(0)
  })
})

describe('date', () => {
  it('prima i puni ISO zapis s vremenom (oglasna ploča)', () => {
    expect(date('2026-11-17T09:30:00.000Z')).toBe(date('2026-11-17'))
    expect(date('2026-11-17T09:30:00.000Z')).not.toContain('NaN')
    expect(dateShort('2026-11-17T09:30:00.000Z')).toBe(dateShort('2026-11-17'))
  })
})
