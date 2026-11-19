/** Obavijesti: koji događaji iz salona idu voditelju salona i pomoćne funkcije za datume. */

export interface InboxData {
  notifications: { id: string; at: string; title: string; text: string; read: boolean }[]
  unread: number
  announcements: { id: string; title: string; body: string; authorName: string; createdAt: string; confirmed: boolean; confirmedCount: number; total: number }[]
  canPost: boolean
}

/** Dijelovi dnevnika koji su događaji iz salona (prodaja, dostava, roba, ljudi na smjeni, zadaci, kupci, naplata). Plaće, bonusi, troškovi, prijave i korisnici nisu tu. */
export const SALON_ENTITIES = new Set([
  'Narudžba',
  'Dostava',
  'Uplata',
  'Primka',
  'Artikal',
  'Zaliha',
  'Dobavljač',
  'Narudžba dobavljaču',
  'Kartica dobavljača',
  'Radno vrijeme',
  'Zadatak',
  'Kupac',
  'Reklamacija',
  'Naplata',
  'Plan prometa',
  'Dokument',
  'Smjene',
  'Interna primka',
])

export const isSalonEvent = (entity: string) => SALON_ENTITIES.has(entity)

/** Datum (YYYY-MM-DD) pomaknut za n dana. */
export function addDaysIso(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Datum za ispis u poruci: 2026-11-18 → 18.11.2026. */
export const dotDate = (iso: string) => iso.split('-').reverse().join('.')

/** Smjene trgovaca: otvaranje ili zatvaranje salona. */
export const SHIFT_LABEL = { otvaranje: 'Prva smjena (otključava)', zatvaranje: 'Druga smjena (zaključava)' } as const
export type ShiftKind = keyof typeof SHIFT_LABEL

/** Naslov dnevne liste za smjenu i dan (po njemu se zadatak ne pravi dvaput). */
export const listTitle = (shift: ShiftKind, day: string) =>
  shift === 'otvaranje' ? `Dnevna lista: otvaranje salona (${dotDate(day)})` : `Dnevna lista: zatvaranje salona (${dotDate(day)})`

export interface ShiftsData {
  /** Dani koji se prikazuju, s trgovcima i njihovom smjenom (null = nije upisan). */
  days: { date: string; rows: { userId: string; name: string; shift: ShiftKind | null }[] }[]
  traders: { id: string; name: string }[]
  canEdit: boolean
}
