import { describe, expect, it } from 'vitest'
import { matchProduct, matchSupplier, parseDocJson, toIsoDate, toNumber } from './receiptdoc'

describe('toNumber — brojevi s računa', () => {
  it('razumije tačku i zarez kao decimalni', () => {
    expect(toNumber(12.5)).toBe(12.5)
    expect(toNumber('12,5')).toBe(12.5)
    expect(toNumber('1.234,50')).toBe(1234.5)
    expect(toNumber('1,234.50')).toBe(1234.5)
    expect(toNumber('85 KM')).toBe(85)
    expect(toNumber('nešto')).toBe(0)
  })
})

describe('toIsoDate', () => {
  it('pretvara datume u YYYY-MM-DD', () => {
    expect(toIsoDate('2026-11-19')).toBe('2026-11-19')
    expect(toIsoDate('19.11.2026.')).toBe('2026-11-19')
    expect(toIsoDate('5/3/2026')).toBe('2026-03-05')
    expect(toIsoDate('')).toBe('')
  })
})

describe('parseDocJson', () => {
  it('čita JSON, uklanja ``` oznake i preskače prazne stavke', () => {
    const raw = '```json\n{"dobavljac":"Kauč d.o.o.","brojDokumenta":"RF-77","datum":"19.11.2026","stavke":[{"sifra":"K-1","naziv":"Kauč Oslo","kolicina":2,"cijena":"450,00"},{"sifra":"","naziv":"","kolicina":1,"cijena":5},{"sifra":"X","naziv":"Nula","kolicina":0,"cijena":3}]}\n```'
    const d = parseDocJson(raw)
    expect(d.dobavljac).toBe('Kauč d.o.o.')
    expect(d.brojDokumenta).toBe('RF-77')
    expect(d.datum).toBe('2026-11-19')
    expect(d.stavke).toEqual([{ sifra: 'K-1', naziv: 'Kauč Oslo', kolicina: 2, cijena: 450 }])
  })
  it('neispravan odgovor daje poruku za korisnika', () => {
    expect(() => parseDocJson('ovo nije json')).toThrow(/nije prepoznat/)
  })
})

describe('matchProduct / matchSupplier', () => {
  const products = [
    { id: '1', sku: 'K-1', name: 'Kauč Oslo' },
    { id: '2', sku: 'S-9', name: 'Stolica Bela' },
  ]
  it('povezuje po šifri pa po nazivu', () => {
    expect(matchProduct({ sifra: 'k-1', naziv: '' }, products)).toBe('1')
    expect(matchProduct({ sifra: '', naziv: 'Stolica  Bela' }, products)).toBe('2')
    expect(matchProduct({ sifra: 'NEPOZNATO', naziv: 'Nepoznato' }, products)).toBeNull()
  })
  it('dobavljač po nazivu', () => {
    expect(matchSupplier('Kauč d.o.o.', [{ id: '5', name: 'Kauč d.o.o.' }])).toBe('5')
    expect(matchSupplier('Drugi', [{ id: '5', name: 'Kauč d.o.o.' }])).toBeNull()
  })
})
