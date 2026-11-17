import { describe, expect, it } from 'vitest'
import { pseudonymize } from './pseudo'
import type { Customer, Employee } from './types'

const customers: Customer[] = [
  { id: '1', name: 'Ana Babić', phone: '061 111 222', email: 'ana@primjer.test', city: 'Zenica', address: 'Ulica 1' },
  { id: '12', name: 'Ivo Ivić', phone: '062 333 444', email: '', city: 'Tuzla', address: 'Ulica 2' },
]
const employees: Employee[] = [
  { id: '3', name: 'Marko Jurić', role: 'Prodavač', initials: 'MJ', color: '#000', monthlyTarget: 0, commissionRate: 0, phone: '065 555 666' },
]

describe('pseudonymize', () => {
  const p = pseudonymize(customers, employees)

  it('van ne idu imena, telefoni, e-pošta ni adrese', () => {
    const out = JSON.stringify([p.customers, p.employees])
    for (const secret of ['Ana', 'Babić', 'Ivo', 'Marko', '061', '062', '065', 'ana@', 'Ulica', 'MJ'])
      expect(out).not.toContain(secret)
    expect(p.customers[0].city).toBe('Zenica')
  })

  it('odgovor dobije prava imena; Kupac-1 ne pogađa Kupac-12', () => {
    expect(p.restore('Najviše kasni Kupac-12, zatim Kupac-1. Prodavač Zaposlenik-3 ima najviše.')).toBe(
      'Najviše kasni Ivo Ivić, zatim Ana Babić. Prodavač Marko Jurić ima najviše.',
    )
  })

  it('prepoznaje i sklonjene šifre (padeže)', () => {
    expect(p.restore('Pošaljite podsjetnik Kupcu-12 i javite Zaposleniku-3 da nazove Kupca-1.')).toBe(
      'Pošaljite podsjetnik Ivo Ivić i javite Marko Jurić da nazove Ana Babić.',
    )
  })

  it('nepoznata šifra ostaje kakva jest', () => {
    expect(p.restore('Kupac-99')).toBe('Kupac-99')
  })

  it('kontakt bez zaposlenika dobije šifru Osoba-N', () => {
    const code = p.codeForName('Vanjski Saradnik')
    expect(code).toBe('Osoba-1')
    expect(p.codeForName('Marko Jurić')).toBe('Zaposlenik-3')
    expect(p.restore(`Javite se ${code}.`)).toBe('Javite se Vanjski Saradnik.')
  })
})
