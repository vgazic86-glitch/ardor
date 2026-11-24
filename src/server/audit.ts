/** Dnevnik izmjena i zaštita prijave od pogađanja lozinke. */
import { and, desc, eq, gte, ilike, lt, or, sql } from 'drizzle-orm'
import { getRequestHeader } from '@tanstack/react-start/server'
import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'
import type { SessionUser } from './auth'
import { isSalonEvent } from '../lib/inbox'
import { notifyManagers } from './inbox'

export const MAX_FAILS = 5
export const LOCK_MINUTES = 15
const MAX_FAILS_IP = 20

export function clientIp() {
  try {
    const f = getRequestHeader('x-forwarded-for') ?? ''
    return (f.split(',')[0] || getRequestHeader('x-real-ip') || '').trim().slice(0, 60)
  } catch {
    return ''
  }
}

export async function record(e: {
  user?: Pick<SessionUser, 'id' | 'name'> | null
  entity: string
  action: string
  detail?: string
  subject?: string
  ok?: boolean
}) {
  try {
    await db.insert(t.auditLog).values({
      at: new Date(),
      userId: e.user ? Number(e.user.id) : null,
      userName: e.user?.name ?? '',
      entity: e.entity,
      action: e.action,
      detail: (e.detail ?? '').slice(0, 300),
      subject: (e.subject ?? '').slice(0, 80),
      ip: clientIp(),
      ok: e.ok ?? true,
    })
  } catch (err) {
    // Dnevnik nikad ne smije srušiti radnju.
    console.error('Dnevnik: upis nije uspio', err)
  }
}

/** Baca grešku ako je za korisničko ime ili IP previše pogrešnih prijava u zadnjih 15 min. */
export async function checkLock(username: string) {
  const since = new Date(Date.now() - LOCK_MINUTES * 60_000)
  const ip = clientIp()
  const [u] = await db
    .select({ n: sql<number>`count(*)::int`, last: sql<number>`(extract(epoch from max(${t.auditLog.at})) * 1000)::float8` })
    .from(t.auditLog)
    .where(and(eq(t.auditLog.entity, 'Prijava'), eq(t.auditLog.ok, false), eq(t.auditLog.subject, username), gte(t.auditLog.at, since)))
  const [i] = ip
    ? await db
        .select({ n: sql<number>`count(*)::int` })
        .from(t.auditLog)
        .where(and(eq(t.auditLog.entity, 'Prijava'), eq(t.auditLog.ok, false), eq(t.auditLog.ip, ip), gte(t.auditLog.at, since)))
    : [{ n: 0 }]
  if ((u?.n ?? 0) >= MAX_FAILS || (i?.n ?? 0) >= MAX_FAILS_IP) {
    const last = u?.last ? Number(u.last) : Date.now()
    const wait = Math.max(1, Math.ceil((last + LOCK_MINUTES * 60_000 - Date.now()) / 60_000))
    throw new Error(`Previše pogrešnih pokušaja prijave. Račun je privremeno zaključan — pokušajte ponovo za ${wait} min ili se javite administratoru.`)
  }
}

/** Koliko je pogrešnih pokušaja ostalo prije zaključavanja (za poruku). */
export async function failsLeft(username: string) {
  const since = new Date(Date.now() - LOCK_MINUTES * 60_000)
  const [u] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(t.auditLog)
    .where(and(eq(t.auditLog.entity, 'Prijava'), eq(t.auditLog.ok, false), eq(t.auditLog.subject, username), gte(t.auditLog.at, since)))
  return Math.max(0, MAX_FAILS - (u?.n ?? 0))
}

/** Administrator ručno otključava račun (briše nedavne neuspjele pokušaje iz brojanja). */
export async function unlock(username: string, by: SessionUser) {
  const since = new Date(Date.now() - LOCK_MINUTES * 60_000)
  await db
    .update(t.auditLog)
    .set({ action: 'neuspjela (otključano)', subject: `${username}·` })
    .where(and(eq(t.auditLog.entity, 'Prijava'), eq(t.auditLog.ok, false), eq(t.auditLog.subject, username), gte(t.auditLog.at, since)))
  await record({ user: by, entity: 'Korisnik', action: 'otključan', detail: username })
}

/** Sigurnosni sažetak za zvonce administratora: zaključani računi i neuspjele prijave (24 h). */
export async function securitySummary() {
  const day = new Date(Date.now() - 86_400_000)
  const since = new Date(Date.now() - LOCK_MINUTES * 60_000)
  const fails = await db
    .select({ subject: t.auditLog.subject, n: sql<number>`count(*)::int`, recent: sql<number>`count(*) filter (where ${t.auditLog.at} >= ${since.toISOString()}::timestamp)::int` })
    .from(t.auditLog)
    .where(and(eq(t.auditLog.entity, 'Prijava'), eq(t.auditLog.ok, false), gte(t.auditLog.at, day)))
    .groupBy(t.auditLog.subject)
  return {
    failed24h: fails.reduce((s, f) => s + f.n, 0),
    locked: fails.filter((f) => f.recent >= MAX_FAILS).map((f) => f.subject),
  }
}

export interface AuditRow {
  id: number
  at: string
  userName: string
  entity: string
  action: string
  detail: string
  subject: string
  ip: string
  ok: boolean
}

export async function list(f: { q?: string; entity?: string; before?: number; onlyFails?: boolean }): Promise<AuditRow[]> {
  const conds = []
  if (f.entity) conds.push(eq(t.auditLog.entity, f.entity))
  if (f.before) conds.push(lt(t.auditLog.id, f.before))
  if (f.onlyFails) conds.push(eq(t.auditLog.ok, false))
  if (f.q?.trim()) {
    const q = `%${f.q.trim()}%`
    conds.push(or(ilike(t.auditLog.userName, q), ilike(t.auditLog.detail, q), ilike(t.auditLog.subject, q), ilike(t.auditLog.action, q))!)
  }
  const rows = await db
    .select()
    .from(t.auditLog)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(t.auditLog.id))
    .limit(200)
  return rows.map((r) => ({ id: r.id, at: r.at.toISOString(), userName: r.userName, entity: r.entity, action: r.action, detail: r.detail, subject: r.subject, ip: r.ip, ok: r.ok }))
}

export async function entities() {
  const rows = await db.selectDistinct({ e: t.auditLog.entity }).from(t.auditLog).orderBy(t.auditLog.entity)
  return rows.map((r) => r.e)
}

// ---------- opis radnje iz ulaznih podataka ----------

const SKIP = /password|lozink|token|data$|base64|content|file|image|policy|settings/i

/** Kratak, siguran opis iz ulaznih podataka (bez lozinki, datoteka i tokena). */
export function describe(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const d = data as Record<string, unknown>
  const parts: string[] = []
  const take = (label: string, v: unknown) => {
    if (v === undefined || v === null || v === '') return
    if (typeof v === 'object') return
    parts.push(label ? `${label} ${String(v)}` : String(v))
  }
  const cust = d.customer as Record<string, unknown> | undefined
  take('', d.number)
  take('', d.title)
  take('', d.name)
  take('', cust?.name)
  take('', d.username)
  take('status', d.status)
  take('iznos', d.amount)
  take('', d.kind)
  take('datum', d.date)
  take('mjesec', d.month)
  take('kol.', d.qty)
  if (Array.isArray(d.items)) parts.push(`${d.items.length} stavki`)
  if (!parts.length) for (const [k, v] of Object.entries(d)) if (!SKIP.test(k) && (typeof v === 'string' || typeof v === 'number') && String(v).length < 60) take(k, v)
  return parts.join(' · ').slice(0, 300)
}

/** Brojevi narudžbi i nazivi artikala umjesto golih id-eva. */
export async function resolve(kind: 'order' | 'product' | 'purchase' | 'user' | 'task', id: unknown) {
  const n = Number(id)
  if (!n) return ''
  try {
    if (kind === 'order') return (await db.select({ v: t.orders.number }).from(t.orders).where(eq(t.orders.id, n)))[0]?.v ?? `#${n}`
    if (kind === 'product') return (await db.select({ v: t.products.name }).from(t.products).where(eq(t.products.id, n)))[0]?.v ?? `#${n}`
    if (kind === 'purchase') return (await db.select({ v: t.purchaseOrders.number }).from(t.purchaseOrders).where(eq(t.purchaseOrders.id, n)))[0]?.v ?? `#${n}`
    if (kind === 'user') return (await db.select({ v: t.users.username }).from(t.users).where(eq(t.users.id, n)))[0]?.v ?? `#${n}`
    if (kind === 'task') return (await db.select({ v: t.tasks.title }).from(t.tasks).where(eq(t.tasks.id, n)))[0]?.v ?? `#${n}`
  } catch {
    /* nije važno */
  }
  return `#${n}`
}

type Detail = (d: Record<string, any>) => string | Promise<string>
const byOrder: Detail = async (d) => [await resolve('order', d.id ?? d.orderId), audit2(d)].filter(Boolean).join(' · ')
const byProduct: Detail = async (d) => [await resolve('product', d.id ?? d.productId), audit2(d)].filter(Boolean).join(' · ')
const byPurchase: Detail = async (d) => [await resolve('purchase', d.id), audit2(d)].filter(Boolean).join(' · ')
const byUser: Detail = async (d) => [await resolve('user', d.id), d.username ?? ''].filter(Boolean).join(' ')
const byTask: Detail = async (d) => [await resolve('task', d.id), d.status ? `status ${d.status}` : ''].filter(Boolean).join(' · ')
function audit2(d: Record<string, any>) {
  const p: string[] = []
  if (d.status) p.push(`status ${d.status}`)
  if (d.amount !== undefined) p.push(`iznos ${d.amount}`)
  if (d.method) p.push(String(d.method))
  if (d.qty !== undefined) p.push(`kol. ${d.qty}`)
  if (d.note) p.push(String(d.note).slice(0, 80))
  if (d.count !== undefined) p.push(d.count ? `${d.count} rata od ${d.first}` : 'plan rata obrisan')
  if (d.dueDate !== undefined) p.push(d.dueDate ? `rok ${d.dueDate}` : 'rok = dan isporuke')
  if (d.channel) p.push(String(d.channel))
  return p.join(' · ')
}

/** Koje serverske radnje se upisuju u dnevnik: [cjelina, radnja, opis]. Čitanja se ne upisuju. */
const MAP: Record<string, [string, string, Detail?]> = {
  createOrderFn: ['Narudžba', 'nova'],
  saveMaterialFn: ['Radionica', 'materijal', (d) => `${d.name ?? ''}${d.id ? '' : ' · novi'}`],
  receiveMaterialsFn: ['Radionica', 'prijem materijala', (d) => `${Array.isArray(d.lines) ? d.lines.length : 0} stavki${d.documentNumber ? ' · račun ' + d.documentNumber : ''}`],
  countMaterialFn: ['Radionica', 'inventura materijala', (d) => `${d.name ?? 'materijal ' + (d.materialId ?? '')} → ${d.counted ?? ''}`],
  addWorkCostFn: ['Radni nalog', 'trošak', (d) => `${d.number ?? 'nalog ' + (d.workOrderId ?? '')} · ${d.kind ?? ''} · ${d.qty ?? ''} × ${d.unitPrice ?? ''} KM${d.description ? ' · ' + String(d.description).slice(0, 60) : ''}`],
  deleteWorkCostFn: ['Radni nalog', 'trošak obrisan', (d) => `${d.number ?? ''}${d.amount ? ' · ' + d.amount + ' KM' : ''}`],
  setHourlyRateFn: ['Radni nalog', 'satnica radionice', (d) => `${d.rate ?? ''} KM/h`],
  updateWorkOrderFn: ['Radni nalog', 'izmjena', (d) => [d.number ?? 'nalog ' + (d.id ?? ''), d.status && 'status ' + d.status, d.dueDate !== undefined && 'rok ' + (d.dueDate || '—'), d.note !== undefined && 'bilješka'].filter(Boolean).join(' · ')],
  saveExportOfferFn: ['Izvoz', 'ponuda spremljena', (d) => `${d.buyerName ?? ''}${d.id ? '' : ' · nova'}`],
  setExportOfferStatusFn: ['Izvoz', 'status ponude', (d) => `${d.number ?? 'ponuda ' + (d.id ?? '')} → ${d.status ?? ''}${d.status === 'prihvacena' ? ' (izdan račun)' : ''}`],
  deleteExportOfferFn: ['Izvoz', 'ponuda obrisana', (d) => `${d.number ?? 'ponuda ' + (d.id ?? '')}`],
  setExportInvoiceStatusFn: ['Izvoz', 'status računa', (d) => `${d.number ?? 'račun ' + (d.id ?? '')} → ${d.status ?? ''}`],
  saveWebItemFn: ['Web stranica', 'artikal na webu', (d) => `${d.id ? 'izmjena' : 'novi'}: ${d.name ?? ''} · ${d.price ?? ''} KM · ${d.visible === false ? 'skriven' : 'vidljiv'}${d.oldPrice ? ` · akcija, stara cijena ${d.oldPrice} KM` : ''}`],
  deleteWebItemFn: ['Web stranica', 'artikal obrisan s weba', (d) => `${d.name ?? 'artikal ' + (d.id ?? '')}`],
  setWebInquiryStatusFn: ['Web stranica', 'upit obrađen', (d) => `${d.name ?? 'upit ' + (d.id ?? '')} → ${d.status ?? ''}`],
  saveWebTextsFn: ['Web stranica', 'tekstovi weba', (d) => `${({ naslovna: 'Naslovnica', traka: 'Obavijest na vrhu', onama: 'O nama', kontakt: 'Kontakt i radno vrijeme' } as Record<string, string>)[String(d.group)] ?? 'tekstovi'}: ${Object.entries((d.values ?? {}) as Record<string, string>).map(([k, v]) => `${k} = „${String(v).slice(0, 60)}”`).join('; ')}`.slice(0, 500)],
  setWebTextImageFn: ['Web stranica', 'fotografija weba', (d) => `${d.key ?? ''} · ${d.image ? 'nova fotografija' : 'vraćena zadana'}`],
  saveWebArticleFn: ['Web stranica', 'članak', (d) => `„${d.title ?? ''}” · ${({ nacrt: 'nacrt', ceka: 'poslan na odobrenje', objavljen: 'objavljen' } as Record<string, string>)[String(d.status)] ?? d.status}`],
  deleteWebArticleFn: ['Web stranica', 'članak obrisan', (d) => `„${d.title ?? d.id ?? ''}”`],
  webInquiryToCustomerFn: ['Web stranica', 'upit → kupac', (d) => `${d.name ?? 'upit ' + (d.id ?? '')}`],
  setOrderStatusFn: ['Narudžba', 'promjena statusa', byOrder],
  setDeliveryStatusFn: ['Dostava', 'promjena statusa', byOrder],
  addPaymentFn: ['Uplata', 'nova', byOrder],
  createReceiptFn: ['Primka', 'nova'],
  updateReceiptFn: ['Primka', 'izmijenjena'],
  addCategoryFn: ['Kategorije artikala', 'dodana'],
  deleteCategoryFn: ['Kategorije artikala', 'obrisana'],
  createTransferFn: ['Interna primka', 'nova'],
  setReceiptVatFn: ['Primka', 'PDV upisan'],
  saveProductFn: ['Artikal', 'spremljen', (d) => `${d.name ?? ''} · ${d.sku ?? ''} · cijena ${d.price ?? ''} KM`],
  archiveProductFn: ['Artikal', 'arhiviran', byProduct],
  setProductImageFn: ['Artikal', 'slika', byProduct],
  adjustStockFn: ['Zaliha', 'korekcija', byProduct],
  adjustStockManyFn: ['Zaliha', 'inventura'],
  saveSupplierFn: ['Dobavljač', 'spremljen'],
  saveEmployeeFn: ['Zaposlenik', 'spremljen'],
  deactivateEmployeeFn: ['Zaposlenik', 'deaktiviran'],
  clearTransactionsFn: ['Podaci', 'OBRISANI PRIMJERNI PODACI (promet, kupci, primke…)'],
  saveDocumentFn: ['Dokument', 'spremljen'],
  archiveDocumentFn: ['Dokument', 'arhiviran'],
  addEmployeeFileFn: ['Kadrovska', 'dodana datoteka'],
  deleteEmployeeFileFn: ['Kadrovska', 'obrisana datoteka'],
  saveSalaryFn: ['Plaća', 'upisana'],
  deleteSalaryFn: ['Plaća', 'obrisana'],
  saveBonusesFn: ['Bonus', 'spremljen'],
  savePolicyFn: ['Bonus', 'pravila promijenjena'],
  saveExpenseFn: ['Trošak', 'spremljen'],
  deleteExpenseFn: ['Trošak', 'obrisan'],
  copyRecurringFn: ['Trošak', 'kopirani ponavljajući'],
  saveFinanceSettingsFn: ['Finansije', 'postavke promijenjene'],
  changePasswordFn: ['Korisnik', 'promijenio lozinku'],
  saveUserFn: ['Korisnik', 'spremljen'],
  resetUserFn: ['Korisnik', 'reset lozinke', byUser],
  saveCompanyFn: ['Firma', 'podaci promijenjeni'],
  savePurchaseOrderFn: ['Narudžba dobavljaču', 'spremljena'],
  setPurchaseStatusFn: ['Narudžba dobavljaču', 'promjena statusa', byPurchase],
  deletePurchaseOrderFn: ['Narudžba dobavljaču', 'obrisana', byPurchase],
  linkPurchaseReceiptFn: ['Narudžba dobavljaču', 'povezana s primkom', byPurchase],
  saveLedgerEntryFn: ['Kartica dobavljača', 'stavka spremljena'],
  deleteLedgerEntryFn: ['Kartica dobavljača', 'stavka obrisana'],
  saveWorkDayFn: ['Radno vrijeme', 'dan upisan'],
  clockFn: ['Radno vrijeme', 'dolazak/odlazak'],
  saveWorkRangeFn: ['Radno vrijeme', 'odsustvo upisano'],
  saveTargetsFn: ['Plan prometa', 'promijenjen'],
  saveTaskFn: ['Zadatak', 'spremljen'],
  setTaskStatusFn: ['Zadatak', 'promjena statusa', byTask],
  deleteTaskFn: ['Zadatak', 'obrisan', byTask],
  saveCustomerFn: ['Kupac', 'spremljen'],
  exportAllFn: ['Podaci', 'izvoz svih podataka'],
  weeklySendTestFn: ['Izvještaj', 'probni sedmični poslan'],
  uploadManualFn: ['Dokument', 'priručnik učitan (PDF)'],
  setInstallmentPlanFn: ['Naplata', 'plan rata', byOrder],
  setDueDateFn: ['Naplata', 'rok plaćanja', byOrder],
  recordReminderFn: ['Naplata', 'podsjetnik kupcu', byOrder],
  unlockUserFn: ['Korisnik', 'otključan'],
  saveComplaintFn: ['Reklamacija', 'spremljena', async (d) => [d.id ? await resolveComplaint(d.id) : 'nova', String(d.description ?? '').slice(0, 80)].join(' · ')],
  setComplaintStatusFn: ['Reklamacija', 'promjena statusa', async (d) => [await resolveComplaint(d.id), `status ${d.status}`, d.status === 'rijesena' || d.status === 'odbijena' ? (d.resolution ?? '') : ''].filter(Boolean).join(' · ')],
  addComplaintPhotoFn: ['Reklamacija', 'dodana fotografija', async (d) => resolveComplaint(d.id)],
  deleteComplaintPhotoFn: ['Reklamacija', 'obrisana fotografija'],
  deleteComplaintFn: ['Reklamacija', 'obrisana', async (d) => `#${d.id}`],
  postAnnouncementFn: ['Oglasna ploča', 'objava', (d) => String(d.title ?? '').slice(0, 80)],
  confirmAnnouncementFn: ['Oglasna ploča', 'pročitano', (d) => `#${d.id}`],
  saveShiftsFn: ['Smjene', 'upisane', (d) => `${d.date}: ${(d.assignments ?? []).filter((a: { shift: string }) => a.shift).length} trgovaca`],
  // Trezor: u dnevnik ide samo naziv zapisa — NIKAD lozinka ni bilješka (zato svaka stavka ima svoj opis).
  vaultSetupFn: ['Pristupni podaci', 'trezor postavljen', () => ''],
  vaultUnlockFn: ['Pristupni podaci', 'trezor otključan', () => ''],
  vaultSaveFn: ['Pristupni podaci', 'zapis spremljen', (d) => `${String(d.entry?.title ?? '').slice(0, 80)}${d.entry?.id ? '' : ' · novi'}`],
  vaultDeleteFn: ['Pristupni podaci', 'zapis obrisan', (d) => String(d.title ?? `#${d.id}`).slice(0, 80)],
  vaultChangeMasterFn: ['Pristupni podaci', 'promijenjena lozinka trezora', () => ''],
}

/** Poziva se iz middlewarea nakon uspješne serverske radnje. */
export async function afterCall(fn: string | undefined, user: SessionUser, data: unknown) {
  const m = fn ? MAP[fn] : undefined
  if (!m || fn === 'unlockUserFn') return
  let detail = ''
  try {
    detail = m[2] ? await m[2]((data ?? {}) as Record<string, any>) : describe(data)
  } catch {
    detail = describe(data)
  }
  await record({ user, entity: m[0], action: m[1], detail })
  // Voditelj salona dobiva obavijest o svakom događaju iz salona.
  if (isSalonEvent(m[0])) await notifyManagers(`${m[0]} · ${m[1]}`, [detail, `radi: ${user.name}`].filter(Boolean).join(' · '))
}

async function resolveComplaint(id: unknown) {
  const n = Number(id)
  if (!n) return ''
  const [r] = await db.select({ v: t.complaints.number }).from(t.complaints).where(eq(t.complaints.id, n))
  return r?.v ?? `#${n}`
}
