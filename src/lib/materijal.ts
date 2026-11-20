/** Radionica: repromaterijal (iverica, ABS traka, okovi…) — zaliha s decimalama. Čista logika. */

export const MATERIAL_UNITS = ['kom', 'm', 'm²', 'kg', 'l', 'pak', 'ploča'] as const

export const MATERIAL_CATEGORIES = ['Ploče (iverica, MDF)', 'Radne ploče', 'ABS traka', 'Okovi', 'Ručke', 'Vodilice i mehanizmi', 'Ljepila i potrošno', 'Ostalo']

export type MaterialMoveType = 'ulaz' | 'izlaz' | 'korekcija'

export const MOVE_LABEL: Record<MaterialMoveType, string> = {
  ulaz: 'Prijem',
  izlaz: 'Utrošak na nalog',
  korekcija: 'Inventura / korekcija',
}

const r3 = (v: number) => Math.round((v + Number.EPSILON) * 1000) / 1000
const r4 = (v: number) => Math.round((v + Number.EPSILON) * 10000) / 10000
const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

export interface MoveLike {
  type: string
  qty: number
  unitCost: number
}

/** Stanje = zbir kretanja (3 decimale). */
export const stockOf = (moves: MoveLike[]) => r3(moves.reduce((s, m) => s + m.qty, 0))

/** Prosječna nabavna cijena po jedinici: ponderisano po prijemima; bez prijema = zadnja cijena iz šifarnika. */
export function avgCost(moves: MoveLike[], fallback: number) {
  let q = 0
  let v = 0
  for (const m of moves)
    if (m.type === 'ulaz' && m.qty > 0) {
      q += m.qty
      v += m.qty * m.unitCost
    }
  return q > 0 ? r4(v / q) : fallback
}

/** Vrijednost utroška/zalihe na 2 decimale. */
export const valueOf = (qty: number, unitCost: number) => r2(qty * unitCost)

/** Količina za prikaz: do 3 decimale, decimalni zarez, bez suvišnih nula (bez Intl). */
export function fmtQty(v: number) {
  const neg = v < 0
  const [i, d = ''] = Math.abs(r3(v)).toFixed(3).split('.')
  const dec = d.replace(/0+$/, '')
  return `${neg ? '-' : ''}${i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${dec ? `,${dec}` : ''}`
}

/** Količina iz polja: „4,25”, „1.250,5”, „3.5” → broj (3 decimale). */
export function parseQty(v: string) {
  const t = String(v ?? '').replace(/\s/g, '')
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t)
  return Number.isFinite(n) ? r3(n) : 0
}

/** Sljedeća šifra materijala: MAT-0001, popunjava rupe kao i interne šifre artikala. */
export function nextMaterialCode(codes: Iterable<string>) {
  const used = new Set<number>()
  for (const c of codes) {
    const m = /^MAT-(\d+)$/i.exec(c.trim())
    if (m) used.add(Number(m[1]))
  }
  let n = 1
  while (used.has(n)) n++
  return `MAT-${String(n).padStart(4, '0')}`
}

/** Ispod minimuma (samo kad je minimum upisan). */
export const isLow = (stock: number, minQty: number) => minQty > 0 && stock <= minQty
