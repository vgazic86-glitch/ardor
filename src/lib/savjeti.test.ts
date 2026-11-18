import { describe, expect, it } from 'vitest'
import { SAVJETI, tipsFor } from './savjeti'

describe('savjeti za dom', () => {
  it('daje četiri savjeta iz liste, bez ponavljanja', () => {
    const tips = tipsFor('2026-11-17')
    expect(tips).toHaveLength(4)
    expect(new Set(tips).size).toBe(4)
    tips.forEach((t) => expect(SAVJETI).toContain(t))
  })
  it('se mijenjaju iz dana u dan', () => {
    expect(tipsFor('2026-11-17')).not.toEqual(tipsFor('2026-11-18'))
  })
  it('isti dan uvijek daje iste savjete', () => {
    expect(tipsFor('2026-11-17')).toEqual(tipsFor('2026-11-17'))
  })
})
