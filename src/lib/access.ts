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

/** Trgovac: samo ono što treba za prodaju i rad s kupcima. */
const TRADER: Area[] = ['pregled', 'narudzbe', 'dostave', 'zalihe', 'radno', 'dokumenti']

export function canSee(user: SessionUser | null, area: Area) {
  if (!user) return false
  if (area === 'korisnici') return user.role === 'admin'
  if (user.role === 'trgovac') return TRADER.includes(area)
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
  }
  return map[seg] ?? null
}

export const ROLE_LABEL: Record<SessionUser['role'], string> = {
  admin: 'Administrator',
  uprava: 'Uprava',
  trgovac: 'Trgovac',
}
