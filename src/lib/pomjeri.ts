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

/* ───────────── faza 2: troškovi naloga i zarada po komadu ───────────── */

export type CostKind = 'partner' | 'materijal' | 'rad' | 'ostalo'

export const COST_KIND_LABEL: Record<CostKind, string> = {
  partner: 'Krojenje kod partnera',
  materijal: 'Materijal i okovi',
  rad: 'Sati rada',
  ostalo: 'Ostalo (prijevoz, usluge…)',
}

/** Zadana satnica radionice (KM/h, bez PDV-a) dok je uprava ne promijeni. */
export const DEFAULT_HOURLY_RATE = 15

const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

/** Iznos stavke troška = količina (ili sati) × cijena; obje se prvo zaokruže na 2 decimale (kao u bazi). */
export const costAmount = (qty: number, unitPrice: number) => r2(r2(qty || 0) * r2(unitPrice || 0))

export interface CostTotals {
  /** Vanjski troškovi: partner + materijal + ostalo — ulaze u nabavnu vrijednost prodaje (Troškovi i zarada). */
  external: number
  /** Vlastiti rad (sati × satnica) — samo za kalkulaciju po komadu; plaće su već trošak u mjesecu. */
  labor: number
  total: number
}

export function costTotals(rows: { kind: string; amount: number }[]): CostTotals {
  let external = 0
  let labor = 0
  for (const r of rows) {
    if (r.kind === 'rad') labor += r.amount
    else external += r.amount
  }
  return { external: r2(external), labor: r2(labor), total: r2(external + labor) }
}

/**
 * Zarada po komadu: prodajna cijena bez PDV-a (iznos stavke s PDV-om / 1,17) minus troškovi.
 * Vraća i maržu (udio zarade u neto cijeni).
 */
export function workMargin(grossLine: number, totals: CostTotals, vatRate = 0.17) {
  const net = r2(grossLine / (1 + vatRate))
  const profit = r2(net - totals.total)
  return { net, profit, pct: net > 0 ? profit / net : 0 }
}
