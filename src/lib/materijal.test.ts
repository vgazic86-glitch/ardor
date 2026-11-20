import { describe, expect, it } from 'vitest'
import { avgCost, fmtQty, isLow, nextMaterialCode, parseQty, stockOf, valueOf } from './materijal'

describe('materijal radionice', () => {
  const moves = [
    { type: 'ulaz', qty: 10, unitCost: 20 },
    { type: 'ulaz', qty: 5.5, unitCost: 26 },
    { type: 'izlaz', qty: -4.25, unitCost: 22.129 },
    { type: 'korekcija', qty: -0.125, unitCost: 0 },
  ]
  it('stanje s decimalama', () => {
    expect(stockOf(moves)).toBe(11.125)
    expect(stockOf([])).toBe(0)
  })
  it('prosječna nabavna cijena po prijemima', () => {
    expect(avgCost(moves, 99)).toBe(22.129)
    expect(avgCost([{ type: 'izlaz', qty: -1, unitCost: 5 }], 18.5)).toBe(18.5)
    expect(valueOf(4.25, 22.129)).toBe(94.05)
  })
  it('prikaz i unos količina', () => {
    expect(fmtQty(11.125)).toBe('11,125')
    expect(fmtQty(1250.5)).toBe('1.250,5')
    expect(fmtQty(3)).toBe('3')
    expect(fmtQty(-0.25)).toBe('-0,25')
    expect(parseQty('4,25')).toBe(4.25)
    expect(parseQty('1.250,5')).toBe(1250.5)
    expect(parseQty('3.5')).toBe(3.5)
    expect(parseQty('x')).toBe(0)
  })
  it('šifre i minimum', () => {
    expect(nextMaterialCode([])).toBe('MAT-0001')
    expect(nextMaterialCode(['MAT-0001', 'MAT-0003'])).toBe('MAT-0002')
    expect(isLow(2, 5)).toBe(true)
    expect(isLow(2, 0)).toBe(false)
  })
})
