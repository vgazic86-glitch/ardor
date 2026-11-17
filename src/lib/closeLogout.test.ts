import { describe, expect, it } from 'vitest'
import { otherTabsOpen } from './closeLogout'

describe('otherTabsOpen — odjava samo kad se zatvara zadnja kartica', () => {
  const now = 1_000_000
  it('jedina kartica → nema drugih', () => {
    expect(otherTabsOpen({ a: now }, 'a', now)).toBe(false)
  })
  it('druga živa kartica → ne odjavljuj', () => {
    expect(otherTabsOpen({ a: now, b: now - 4_000 }, 'a', now)).toBe(true)
  })
  it('stara (mrtva) kartica se ne računa', () => {
    expect(otherTabsOpen({ a: now, b: now - 60_000 }, 'a', now)).toBe(false)
  })
})
