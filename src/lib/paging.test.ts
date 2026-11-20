import { describe, expect, it } from 'vitest'
import { clampPage, pageButtons, pageCount, pageSlice } from './paging'

describe('straničenje', () => {
  it('broji stranice po 50', () => {
    expect(pageCount(0)).toBe(1)
    expect(pageCount(50)).toBe(1)
    expect(pageCount(51)).toBe(2)
    expect(pageCount(2727)).toBe(55)
  })

  it('drži stranicu u granicama', () => {
    expect(clampPage(0, 120)).toBe(1)
    expect(clampPage(9, 120)).toBe(3)
    expect(clampPage(2, 0)).toBe(1)
  })

  it('daje redove stranice', () => {
    const rows = Array.from({ length: 120 }, (_, i) => i + 1)
    expect(pageSlice(rows, 1)).toHaveLength(50)
    expect(pageSlice(rows, 3)).toEqual(rows.slice(100))
    expect(pageSlice(rows, 7)[0]).toBe(101)
  })

  it('gumbi stranica s preskokom', () => {
    expect(pageButtons(1, 3)).toEqual([1, 2, 3])
    expect(pageButtons(10, 55)).toEqual([1, null, 8, 9, 10, 11, 12, null, 55])
    expect(pageButtons(1, 55)).toEqual([1, 2, 3, null, 55])
  })
})
