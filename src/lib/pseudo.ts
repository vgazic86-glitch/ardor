/**
 * Šifriranje imena prije slanja vanjskom AI-ju (Gemini, besplatni ključ — Google smije koristiti podatke).
 * Odluka Vladimira (17. 11. 2026.): osobni podaci ne idu van. Imena kupaca i zaposlenika zamijene se
 * šiframa (Kupac-12, Zaposlenik-3), a u odgovoru AI-ja šifre se vrate u prava imena na našem serveru.
 */
import type { Customer, Employee } from './types'

export interface Pseudonyms {
  customers: Customer[]
  employees: Employee[]
  /** Šifra zaposlenika po imenu (za kontakte koji nemaju id). */
  codeForName: (name: string) => string
  /** Vrati prava imena u tekst odgovora. */
  restore: (text: string) => string
}

export function pseudonymize(customers: Customer[], employees: Employee[]): Pseudonyms {
  const map = new Map<string, string>()
  const byName = new Map<string, string>()
  const anonCustomers = customers.map((c) => {
    const code = `Kupac-${c.id}`
    map.set(code, c.name)
    // Bez telefona, e-pošte i adrese — grad ostaje (korisno za dostave, nije osoban).
    return { ...c, name: code, phone: '', email: '', address: '', note: '' }
  })
  const anonEmployees = employees.map((e) => {
    const code = `Zaposlenik-${e.id}`
    map.set(code, e.name)
    byName.set(e.name, code)
    return { ...e, name: code, phone: '', initials: '' }
  })
  let extra = 0
  const codeForName = (name: string) => {
    let code = byName.get(name)
    if (!code) {
      code = `Osoba-${++extra}`
      byName.set(name, code)
      map.set(code, name)
    }
    return code
  }
  return {
    customers: anonCustomers,
    employees: anonEmployees,
    codeForName,
    restore: (text: string) =>
      // AI ponekad skloni šifru („Kupcu-6”, „Zaposleniku-3”), pa se prepoznaju i padeži.
      // (?!\d) da „Kupac-1” ne pogodi početak „Kupac-12”.
      text.replace(/\b(Kup(?:ac|ca|cu|cem|če)|Zaposleni(?:k|ka|ku|kom|če)|Osob(?:a|e|i|u|om))-(\d+)(?!\d)/g, (m, word: string, n: string) => {
        const base = word.startsWith('Kup') ? 'Kupac' : word.startsWith('Zap') ? 'Zaposlenik' : 'Osoba'
        return map.get(`${base}-${n}`) ?? m
      }),
  }
}
