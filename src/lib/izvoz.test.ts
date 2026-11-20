import { describe, expect, it } from 'vitest'
import { addDays, canMoveOffer, fmtAmount, isExpired, lineTotal, nextNumber, offerTotal, suggestPrice, toKm } from './izvoz'

describe('izvoz', () => {
  it('iznos stavke s popustom i zaokruživanjem', () => {
    expect(lineTotal({ qty: 3, unitPrice: 10.005, discountPct: 0 })).toBe(30.02)
    expect(lineTotal({ qty: 2, unitPrice: 100, discountPct: 15 })).toBe(170)
    expect(lineTotal({ qty: 1, unitPrice: 50, discountPct: 150 })).toBe(0)
  })
  it('ukupno je zbir zaokruženih stavki', () => {
    expect(offerTotal([{ qty: 1, unitPrice: 0.335, discountPct: 0 }, { qty: 1, unitPrice: 0.335, discountPct: 0 }])).toBe(0.68)
    expect(offerTotal([])).toBe(0)
  })
  it('protuvrijednost u KM i prijedlog cijene', () => {
    expect(toKm(1000, 1.95583)).toBe(1955.83)
    expect(suggestPrice(1170, 1.95583)).toBe(511.29)
    expect(suggestPrice(1170, 1)).toBe(1000)
    expect(suggestPrice(1170, 0)).toBe(0)
  })
  it('brojevi idu redom po godini', () => {
    expect(nextNumber('IZR', 2026, [])).toBe('IZR-2026-0001')
    expect(nextNumber('IZR', 2026, ['IZR-2026-0001', 'IZR-2026-0009', 'IZR-2025-0044', 'IZP-2026-0050'])).toBe('IZR-2026-0010')
    expect(nextNumber('IZR', 2027, ['IZR-2026-0010'])).toBe('IZR-2027-0001')
  })
  it('rokovi preko kraja mjeseca i godine', () => {
    expect(addDays('2026-12-20', 15)).toBe('2027-01-04')
    expect(addDays('2026-02-20', 10)).toBe('2026-03-02')
    expect(addDays('2026-11-20', 0)).toBe('2026-11-20')
  })
  it('istek i dopušteni statusi', () => {
    expect(isExpired({ status: 'poslana', validUntil: '2026-11-19' }, '2026-11-20')).toBe(true)
    expect(isExpired({ status: 'poslana', validUntil: '2026-11-20' }, '2026-11-20')).toBe(false)
    expect(isExpired({ status: 'prihvacena', validUntil: '2026-01-01' }, '2026-11-20')).toBe(false)
    expect(canMoveOffer('poslana', 'prihvacena')).toBe(true)
    expect(canMoveOffer('prihvacena', 'odbijena')).toBe(false)
    expect(canMoveOffer('nacrt', 'nacrt')).toBe(false)
  })
  it('iznos s valutom', () => {
    expect(fmtAmount(1234.5, 'EUR')).toBe('1.234,50 EUR')
    expect(fmtAmount(-5, 'KM')).toBe('-5,00 KM')
  })
})
