import { describe, expect, it } from 'vitest'
import { addDaysIso, dotDate, isSalonEvent, listTitle } from './inbox'

describe('obavijesti za voditelja', () => {
  it('događaji iz salona idu voditelju', () => {
    expect(isSalonEvent('Narudžba')).toBe(true)
    expect(isSalonEvent('Dostava')).toBe(true)
    expect(isSalonEvent('Radno vrijeme')).toBe(true)
  })
  it('plaće, bonusi, troškovi, prijave i korisnici ne idu voditelju', () => {
    for (const e of ['Plaća', 'Bonus', 'Trošak', 'Prijava', 'Korisnik', 'Finansije', 'Podaci', 'Kadrovska', 'Oglasna ploča'])
      expect(isSalonEvent(e)).toBe(false)
  })
})

describe('dnevne liste po smjeni', () => {
  it('naslov liste zavisi od smjene i dana', () => {
    expect(listTitle('otvaranje', '2026-11-17')).toBe('Dnevna lista: otvaranje salona (17.11.2026)')
    expect(listTitle('zatvaranje', '2026-11-17')).toBe('Dnevna lista: zatvaranje salona (17.11.2026)')
  })
})

describe('datumi', () => {
  it('pomak preko kraja mjeseca i godine', () => {
    expect(addDaysIso('2026-11-17', 1)).toBe('2026-11-18')
    expect(addDaysIso('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01')
  })
  it('ispis datuma', () => {
    expect(dotDate('2026-11-18')).toBe('18.11.2026')
  })
})
