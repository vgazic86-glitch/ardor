/**
 * Priručnici po ulogama (Vladimir, 17. 11. 2026.): svaki zaposlenik vidi priručnik svoje uloge,
 * administrator i uprava (vlasnici) vide sve. PDF učitava administrator u Dokumentima (ne ide u repo).
 */
import type { CompanyDocument } from './types'

export const MANUAL_CATEGORY = 'Priručnici'

export type AppRole = 'admin' | 'uprava' | 'voditelj' | 'operativa' | 'trgovac' | 'dostava'

export const MANUALS: { slug: string; title: string; roles: AppRole[]; summary: string; sortOrder: number }[] = [
  { slug: 'prirucnik-trgovac', title: 'Priručnik za trgovca', roles: ['trgovac'], summary: 'Prodaja, rad s kupcima, ponude, popusti i naplata.', sortOrder: 10 },
  { slug: 'prirucnik-voditelj-salona', title: 'Priručnik za voditelja salona', roles: ['voditelj'], summary: 'Vođenje tima, plan prometa, dnevni pazar, zadaci i nabava.', sortOrder: 11 },
  { slug: 'prirucnik-uredjenje-salona', title: 'Priručnik: uređenje salona', roles: ['voditelj', 'trgovac'], summary: 'Izlaganje namještaja, red u salonu i prvi dojam kupca.', sortOrder: 12 },
  { slug: 'prirucnik-operativa-skladiste', title: 'Priručnik za operativu i skladište', roles: ['operativa'], summary: 'Prijem robe, nabava od dobavljača, zalihe i inventura.', sortOrder: 13 },
  { slug: 'prirucnik-dostava-montaza', title: 'Priručnik za dostavu i montažu', roles: ['dostava'], summary: 'Priprema dostave, montaža kod kupca, zapisnik i naplata pri preuzimanju.', sortOrder: 14 },
  { slug: 'prirucnik-voditelj-marketinga', title: 'Priručnik za voditelja marketinga', roles: [], summary: 'Društvene mreže, kampanje i vizualni identitet.', sortOrder: 15 },
  { slug: 'prirucnik-vlasnika', title: 'Priručnik vlasnika', roles: [], summary: 'Pregled poslovanja, zarada, odluke i kontrola.', sortOrder: 16 },
  { slug: 'nagradjivanje-stimulacija', title: 'Nagrađivanje i stimulacija radnika', roles: [], summary: 'Pravila nagrađivanja, bonusa i stimulacije radnika (samo vlasnici).', sortOrder: 17 },
]

/** Uloge iz baze („trgovac,voditelj”) u listu. */
export const parseRoles = (s: string | null | undefined) =>
  (s ?? '').split(',').map((x) => x.trim()).filter(Boolean)

const isFull = (role: string) => role === 'admin' || role === 'uprava'

/**
 * Smije li uloga vidjeti dokument. Priručnici bez navedenih uloga (vlasnik, marketing) vide samo
 * admin i uprava; ostali dokumenti bez uloga vide svi. Priručnik bez PDF-a vide samo admin i uprava (da ga učitaju).
 */
export function canSeeDocument(doc: Pick<CompanyDocument, 'category' | 'roles' | 'file'>, role: string) {
  if (isFull(role)) return true
  const roles = doc.roles ?? []
  if (doc.category === MANUAL_CATEGORY) return !!doc.file && roles.includes(role)
  return roles.length === 0 || roles.includes(role)
}

export function visibleDocuments<T extends Pick<CompanyDocument, 'category' | 'roles' | 'file'>>(docs: T[], role: string) {
  return docs.filter((d) => canSeeDocument(d, role))
}
