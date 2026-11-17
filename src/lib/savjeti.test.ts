import { describe, expect, it } from 'vitest'
import { SAVJETI, tipFor } from './savjeti'

describe('savjet za dom', () => {
  it('daje savjet iz liste i mijenja se iz dana u dan', () => {
    expect(SAVJETI).toContain(tipFor('2026-11-17'))
    expect(tipFor('2026-11-17')).not.toBe(tipFor('2026-11-18'))
  })
  it('isti dan uvijek daje isti savjet', () => {
    expect(tipFor('2026-11-17')).toBe(tipFor('2026-11-17'))
  })
})
