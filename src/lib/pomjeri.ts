/** Namještaj po mjeri: opći artikli (bez zalihe) i radni nalozi radionice. Čista logika. */

export type WorkStatus = 'novi' | 'krojenje' | 'sklapanje' | 'gotovo'

export const WORK_STATUSES: WorkStatus[] = ['novi', 'krojenje', 'sklapanje', 'gotovo']

export const WORK_STATUS_LABEL: Record<WorkStatus, string> = {
  novi: 'Čeka početak',
  krojenje: 'Krojenje kod partnera',
  sklapanje: 'Sklapanje u radionici',
  gotovo: 'Gotovo',
}

export type CustomKind = 'kuhinja' | 'plakar' | 'ostalo'

/** Opći artikli „po mjeri” — prave se sami pri prvoj prodaji po mjeri. */
export const CUSTOM_KINDS: Record<CustomKind, { sku: string; name: string }> = {
  kuhinja: { sku: 'PM-KUHINJA', name: 'Kuhinja po mjeri' },
  plakar: { sku: 'PM-PLAKAR', name: 'Plakar po mjeri' },
  ostalo: { sku: 'PM-OSTALO', name: 'Namještaj po mjeri' },
}

export const CUSTOM_CATEGORY = 'Po mjeri'

/** Statusi prodaje u kojima radionica radi (nalog postoji). */
export const needsWorkOrder = (status: string) => status === 'potvrđena' || status === 'u_izradi' || status === 'spremna' || status === 'isporučena'

export interface WorkLink {
  number: string
  status: WorkStatus
  name: string
}

/**
 * Prodaja po mjeri smije biti „Spremna”/„Isporučena” tek kad su svi njeni radni nalozi gotovi.
 * Vraća poruku ili null.
 */
export function workBlockMessage(links: WorkLink[]) {
  const open = links.filter((l) => l.status !== 'gotovo')
  if (!open.length) return null
  const what = open.map((l) => `${l.number} ${l.name} (${WORK_STATUS_LABEL[l.status].toLowerCase()})`).join(', ')
  return `Namještaj po mjeri još nije gotov: ${what}. „Spremna” i isporuka su mogući kad radionica označi nalog kao „Gotovo” (stranica Radni nalozi).`
}

/** Je li nalog kasni (rok prošao, a nije gotov). */
export const isLate = (w: { status: WorkStatus; dueDate: string | null }, today: string) => w.status !== 'gotovo' && !!w.dueDate && w.dueDate < today

/** Naziv stavke za prikaz: vlastiti naziv po mjeri ili naziv artikla. */
export const itemName = (i: { customName?: string }, productName: string) => (i.customName?.trim() ? i.customName.trim() : productName)
