/** Čitanje dokumenta dobavljača (računa/otpremnice) za prijem robe: razumijevanje odgovora i povezivanje artikala. */

export interface ParsedLine {
  sifra: string
  naziv: string
  kolicina: number
  cijena: number
}

export interface ParsedDoc {
  dobavljac: string
  brojDokumenta: string
  datum: string
  stavke: ParsedLine[]
}

/** Broj iz odgovora: prihvaća 12.5, „12,5” i „1.234,50”. */
export function toNumber(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (typeof v !== 'string') return 0
  let s = v.replace(/\s/g, '').replace(/KM|BAM/gi, '')
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  // Decimalni je onaj znak koji je zadnji (1.234,50 i 1,234.50).
  if (lastComma > -1 && lastDot > -1) {
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (lastComma > -1) {
    s = s.replace(',', '.')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim())

/** Datum iz odgovora u obliku YYYY-MM-DD; prihvaća i 19.11.2026. ili 19/11/2026. */
export function toIsoDate(v: unknown): string {
  const s = text(v)
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const dm = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/.exec(s)
  if (dm) return `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`
  return ''
}

/** Odgovor modela (tekst JSON-a, eventualno u ``` oznakama) pretvara u sigurnu strukturu. */
export function parseDocJson(raw: string): ParsedDoc {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  let obj: Record<string, unknown>
  try {
    obj = JSON.parse(cleaned) as Record<string, unknown>
  } catch {
    throw new Error('Dokument nije prepoznat. Unesite primku ručno ili pokušajte s jasnijom slikom.')
  }
  const list = Array.isArray(obj.stavke) ? (obj.stavke as Record<string, unknown>[]) : []
  const stavke = list
    .map((l) => ({
      sifra: text(l.sifra),
      naziv: text(l.naziv),
      kolicina: toNumber(l.kolicina),
      cijena: toNumber(l.cijena),
    }))
    .filter((l) => (l.sifra || l.naziv) && l.kolicina > 0)
  return {
    dobavljac: text(obj.dobavljac),
    brojDokumenta: text(obj.brojDokumenta),
    datum: toIsoDate(obj.datum),
    stavke,
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

/** Artikal iz kataloga za stavku: prvo po šifri, pa po nazivu (bez razmaka i interpunkcije). */
export function matchProduct(line: { sifra: string; naziv: string }, products: { id: string; sku: string; name: string }[]): string | null {
  const sku = norm(line.sifra)
  if (sku) {
    const bySku = products.find((p) => norm(p.sku) === sku)
    if (bySku) return bySku.id
  }
  const name = norm(line.naziv)
  if (name) {
    const byName = products.find((p) => norm(p.name) === name)
    if (byName) return byName.id
  }
  return null
}

/** Dobavljač iz kataloga čiji se naziv podudara s nazivom na dokumentu. */
export function matchSupplier(name: string, suppliers: { id: string; name: string }[]): string | null {
  const n = norm(name)
  if (!n) return null
  return suppliers.find((s) => norm(s.name) === n)?.id ?? null
}
