/** Što koja uloga smije vidjeti u aplikaciji. Server dodatno provjerava svaku radnju. */
import type { SessionUser } from '../server/auth'

export type Area =
  | 'pregled'
  | 'narudzbe'
  | 'dostave'
  | 'zalihe'
  | 'primke'
  | 'artikli'
  | 'inventura'
  | 'izvjestaji'
  | 'troskovi'
  | 'dobavljaci'
  | 'zaposlenici'
  | 'kadrovska'
  | 'dokumenti'
  | 'korisnici'
  | 'nabava'
  | 'radno'
  | 'zadaci'
  | 'kupci'
  | 'pazar'
  | 'reklamacije'

/** Trgovac: samo ono što treba za prodaju i rad s kupcima. */
const TRADER: Area[] = ['pregled', 'zadaci', 'narudzbe', 'kupci', 'reklamacije', 'dostave', 'zalihe', 'radno', 'dokumenti']

/** Operativa (srednji pristup): roba, nabava, primke, kartice dobavljača — bez tuđeg prometa i zarade. */
const OPERATIONS: Area[] = [...TRADER, 'nabava', 'primke', 'artikli', 'inventura', 'dobavljaci']

/** Voditelj salona: kao operativa + promet tima i dnevni pazar; bez zarade, troškova, plaća i izvještaja. */
const MANAGER: Area[] = [...OPERATIONS, 'zaposlenici', 'pazar']

export function canSee(user: SessionUser | null, area: Area) {
  if (!user) return false
  if (area === 'korisnici') return user.role === 'admin'
  if (user.role === 'trgovac') return TRADER.includes(area)
  if (user.role === 'operativa') return OPERATIONS.includes(area)
  if (user.role === 'voditelj') return MANAGER.includes(area)
  return true
}

export function areaOf(path: string): Area | null {
  const seg = path.split('/')[1] ?? ''
  if (seg === '') return 'pregled'
  const map: Record<string, Area> = {
    narudzbe: 'narudzbe',
    dostave: 'dostave',
    zalihe: 'zalihe',
    primke: 'primke',
    artikli: 'artikli',
    inventura: 'inventura',
    izvjestaji: 'izvjestaji',
    troskovi: 'troskovi',
    dobavljaci: 'dobavljaci',
    zaposlenici: 'zaposlenici',
    kadrovska: 'kadrovska',
    dokumenti: 'dokumenti',
    korisnici: 'korisnici',
    nabava: 'nabava',
    'radno-vrijeme': 'radno',
    zadaci: 'zadaci',
    kupci: 'kupci',
    pazar: 'pazar',
    reklamacije: 'reklamacije',
    naljepnice: 'artikli',
    kuf: 'izvjestaji',
  }
  return map[seg] ?? null
}

export const ROLE_LABEL: Record<SessionUser['role'], string> = {
  admin: 'Administrator',
  uprava: 'Uprava',
  voditelj: 'Voditelj salona',
  operativa: 'Operativa',
  trgovac: 'Trgovac',
}
