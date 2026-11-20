import { describe, expect, it } from 'vitest'
import { parseAmount } from './format'

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
