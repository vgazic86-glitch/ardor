import { describe, expect, it } from 'vitest'
import { isFreshStart, otherTabsOpen } from './closeLogout'

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

describe('isFreshStart — nova kartica bez živih ostalih poništava prijavu', () => {
  const now = 1_000_000
  it('nova kartica, nijedna druga živa → odjava', () => {
    expect(isFreshStart(false, {}, 'a', now)).toBe(true)
  })
  it('nova kartica, druga živa kartica → bez odjave (drugi prozor radi)', () => {
    expect(isFreshStart(false, { b: now - 2_000 }, 'a', now)).toBe(false)
  })
  it('osvježavanje (kartica već pokrenuta) → bez odjave', () => {
    expect(isFreshStart(true, {}, 'a', now)).toBe(false)
  })
  it('stara kartica iz prošlosti ne sprječava odjavu', () => {
    expect(isFreshStart(false, { b: now - 60_000 }, 'a', now)).toBe(true)
  })
})
