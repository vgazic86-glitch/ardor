/**
 * Dokumenti, kadrovska evidencija i upravljačka lozinka. Uvozi se samo iz serverskih funkcija.
 * Plaće, ugovori i bonusi nikad ne idu u javni snapshot — dostupni su samo uz važeći token.
 */
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto'
import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'
import { KGS_BODY, seedDocuments } from '../../db/documents.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_POLICY, type BonusPolicy } from '../lib/bonus'
import { currentUser, requireManager } from './auth'
import type {
  Bonus,
  BonusStatus,
  CompanyDocument,
  EmployeeFile,
  Salary,
} from '../lib/types'

export const MAX_FILE_BYTES = 4 * 1024 * 1024
const TOKEN_HOURS = 12

const str = (v: number | null) => (v === null ? null : String(v))
const r2 = (v: number) => Math.round(v * 100) / 100
const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sarajevo' }).format(
    new Date(),
  )

export async function meta(key: string) {
  const [row] = await db.select().from(t.appMeta).where(eq(t.appMeta.key, key))
  return row?.value ?? null
}
export async function setMeta(key: string, value: string) {
  await db
    .insert(t.appMeta)
    .values({ key, value })
    .onConflictDoUpdate({ target: t.appMeta.key, set: { value } })
}

/* ───────────────────────── lozinka ───────────────────────── */

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(pw, salt, 32).toString('hex')}`
}
export function verifyPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const a = scryptSync(pw, salt, 32)
  const b = Buffer.from(hash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Lozinka iz okruženja (ADMIN_LOZINKA) ima prednost; inače se postavlja u aplikaciji. */
async function secret(): Promise<{ hash: string; env: boolean } | null> {
  const env = process.env.ADMIN_LOZINKA
  if (env)
    return {
      hash: `env:${createHmac('sha256', 'ardor').update(env).digest('hex')}`,
      env: true,
    }
  const h = await meta('admin_hash')
  return h ? { hash: h, env: false } : null
}

function sign(hash: string, exp: number) {
  return createHmac('sha256', hash).update(String(exp)).digest('hex')
}

export async function adminStatus() {
  const s = await secret()
  return { configured: !!s, fromEnv: !!s?.env }
}

export async function adminSetup(password: string) {
  if (await secret()) throw new Error('Lozinka je već postavljena.')
  if (password.length < 8)
    throw new Error('Lozinka mora imati najmanje 8 znakova.')
  await setMeta('admin_hash', hashPassword(password))
  return adminLogin(password)
}

export async function adminLogin(password: string) {
  const s = await secret()
  if (!s) throw new Error('Lozinka još nije postavljena.')
  const ok = s.env
    ? password === process.env.ADMIN_LOZINKA
    : verifyPassword(password, s.hash)
  if (!ok) {
    await new Promise((r) => setTimeout(r, 600))
    throw new Error('Pogrešna lozinka.')
  }
  const exp = Date.now() + TOKEN_HOURS * 3600_000
  return { token: `${exp}.${sign(s.hash, exp)}` }
}

export async function requireAdmin(token: string | null | undefined) {
  // Administrator i uprava ulaze bez posebne lozinke; ostali nemaju pristup.
  const user = await currentUser()
  if (user?.hrAccess) return
  if (user) throw new Error('Nemate pristup ovom dijelu.')
  const s = await secret()
  const [exp, mac] = String(token ?? '').split('.')
  const n = Number(exp)
  if (!s || !n || !mac || n < Date.now())
    throw new Error('Potrebna je prijava u zaštićeni dio (lozinka).')
  const good = sign(s.hash, n)
  if (
    good.length !== mac.length ||
    !timingSafeEqual(Buffer.from(good), Buffer.from(mac))
  )
    throw new Error('Prijava je istekla. Unesite lozinku ponovo.')
}

export async function adminChange(
  token: string,
  oldPassword: string,
  newPassword: string,
) {
  await requireAdmin(token)
  const s = await secret()
  if (s?.env)
    throw new Error(
      'Lozinka je postavljena na poslužitelju (ADMIN_LOZINKA) i mijenja se tamo.',
    )
  if (!s || !verifyPassword(oldPassword, s.hash))
    throw new Error('Trenutna lozinka nije tačna.')
  if (newPassword.length < 8)
    throw new Error('Nova lozinka mora imati najmanje 8 znakova.')
  await setMeta('admin_hash', hashPassword(newPassword))
  return adminLogin(newPassword)
}

/* ───────────────────────── datoteke ───────────────────────── */

export async function storeFile(name: string, mime: string, dataB64: string) {
  const data = Buffer.from(dataB64, 'base64')
  if (!data.length) throw new Error('Datoteka je prazna.')
  if (data.length > MAX_FILE_BYTES) throw new Error('Datoteka je veća od 4 MB.')
  const [f] = await db
    .insert(t.files)
    .values({
      name: name.slice(0, 200) || 'datoteka',
      mime: mime || 'application/octet-stream',
      size: data.length,
      data,
    })
    .returning()
  return f.id
}

export async function readFile(id: number) {
  const [f] = await db.select().from(t.files).where(eq(t.files.id, id))
  if (!f) throw new Error('Datoteka nije pronađena.')
  return {
    name: f.name,
    mime: f.mime,
    dataB64: Buffer.from(f.data as Uint8Array).toString('base64'),
  }
}

const fileMeta = (row: {
  fid: number | null
  fname: string | null
  fmime: string | null
  fsize: number | null
}) =>
  row.fid
    ? {
        id: String(row.fid),
        name: row.fname ?? '',
        mime: row.fmime ?? '',
        size: row.fsize ?? 0,
      }
    : null

/* ───────────────────────── opći dokumenti ───────────────────────── */

export async function ensureDocumentsSeeded() {
  if (await meta('docs_seeded')) return
  for (const d of seedDocuments)
    await db.insert(t.documents).values(d).onConflictDoNothing()
  await setMeta('docs_seeded', today())
}

/**
 * Knjiga grafičkih standarda: zamjenjuje radni prijedlog sažetkom službene knjige (2019)
 * i prilaže originalni PDF (public/brand) ako je dostupan na poslužitelju.
 */
export async function ensureBrandBook() {
  if (await meta('kgs_2019')) return
  const [doc] = await db
    .select()
    .from(t.documents)
    .where(eq(t.documents.slug, 'knjiga-grafickih-standarda'))
  if (!doc) return
  let fileId = doc.fileId
  if (!fileId) {
    const name = 'ardor-knjiga-grafickih-standarda.pdf'
    const path = [
      join(process.cwd(), 'public', 'brand', name),
      join(process.cwd(), 'dist', 'client', 'brand', name),
    ].find((p) => existsSync(p))
    if (path)
      fileId = await storeFile(
        'ARDOR Knjiga grafičkih standarda (2019).pdf',
        'application/pdf',
        readFileSync(path).toString('base64'),
      )
  }
  await db
    .update(t.documents)
    .set({
      body: KGS_BODY,
      version: '2019',
      summary:
        'Službena knjiga grafičkih standarda ARDOR namještaj (2019): logotip, znak, boje, tipografija i primjena. Originalni PDF je u prilogu.',
      fileId,
      updatedAt: new Date(),
    })
    .where(eq(t.documents.id, doc.id))
  await setMeta('kgs_2019', fileId ? 'pdf' : 'tekst')
}

export async function listDocuments(): Promise<CompanyDocument[]> {
  const rows = await db
    .select({
      d: t.documents,
      fid: t.files.id,
      fname: t.files.name,
      fmime: t.files.mime,
      fsize: t.files.size,
    })
    .from(t.documents)
    .leftJoin(t.files, eq(t.documents.fileId, t.files.id))
    .where(eq(t.documents.archived, false))
    .orderBy(t.documents.sortOrder, t.documents.title)
  return rows.map((r) => ({
    id: String(r.d.id),
    slug: r.d.slug,
    title: r.d.title,
    category: r.d.category,
    summary: r.d.summary,
    body: r.d.body,
    version: r.d.version,
    sortOrder: r.d.sortOrder,
    file: fileMeta(r),
    updatedAt: (r.d.updatedAt ?? new Date()).toISOString().slice(0, 10),
    updatedBy: str(r.d.updatedBy),
  }))
}

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'dj')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'dokument'
  )
}

export interface DocumentInput {
  token: string
  actorId: string | null
  id: string | null
  title: string
  category: string
  summary: string
  body: string
  version: string
  file: { name: string; mime: string; dataB64: string } | null
}

export async function saveDocument(input: DocumentInput) {
  await requireManager()
  const title = input.title.trim()
  if (!title) throw new Error('Naslov dokumenta je obavezan.')
  const fileId = input.file
    ? await storeFile(input.file.name, input.file.mime, input.file.dataB64)
    : undefined
  const values = {
    title,
    category: input.category.trim() || 'Ostalo',
    summary: input.summary.trim(),
    body: input.body,
    version: input.version.trim() || '1.0',
    updatedBy: input.actorId ? Number(input.actorId) : null,
    updatedAt: new Date(),
    ...(fileId ? { fileId } : {}),
  }
  if (input.id) {
    await db
      .update(t.documents)
      .set(values)
      .where(eq(t.documents.id, Number(input.id)))
    const [d] = await db
      .select({ slug: t.documents.slug })
      .from(t.documents)
      .where(eq(t.documents.id, Number(input.id)))
    return { slug: d.slug }
  }
  let slug = slugify(title)
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(t.documents)
    .where(sql`${t.documents.slug} like ${slug + '%'}`)
  if (n) slug = `${slug}-${n + 1}`
  await db.insert(t.documents).values({ ...values, slug, sortOrder: 200 })
  return { slug }
}

export async function archiveDocument(_token: string, id: string) {
  await requireManager()
  await db
    .update(t.documents)
    .set({ archived: true })
    .where(eq(t.documents.id, Number(id)))
}

export async function downloadDocumentFile(documentId: string) {
  const [d] = await db
    .select()
    .from(t.documents)
    .where(eq(t.documents.id, Number(documentId)))
  if (!d?.fileId) throw new Error('Dokument nema priloženu datoteku.')
  return readFile(d.fileId)
}

/* ───────────────────────── kadrovska evidencija ───────────────────────── */

export interface HrData {
  files: EmployeeFile[]
  salaries: Salary[]
  bonuses: Bonus[]
  policy: BonusPolicy
}

export async function getPolicy(): Promise<BonusPolicy> {
  const raw = await meta('bonus_policy')
  try {
    return { ...DEFAULT_POLICY, ...(raw ? JSON.parse(raw) : {}) }
  } catch {
    return DEFAULT_POLICY
  }
}

export async function getHr(token: string): Promise<HrData> {
  await requireAdmin(token)
  const [files, sals, bons, policy] = await Promise.all([
    db
      .select({
        f: t.employeeFiles,
        fid: t.files.id,
        fname: t.files.name,
        fmime: t.files.mime,
        fsize: t.files.size,
      })
      .from(t.employeeFiles)
      .leftJoin(t.files, eq(t.employeeFiles.fileId, t.files.id))
      .orderBy(desc(t.employeeFiles.createdAt)),
    db
      .select()
      .from(t.salaries)
      .orderBy(desc(t.salaries.validFrom), desc(t.salaries.id)),
    db.select().from(t.bonuses).orderBy(desc(t.bonuses.month)),
    getPolicy(),
  ])
  return {
    files: files.map((r) => ({
      id: String(r.f.id),
      employeeId: String(r.f.employeeId),
      category: r.f.category,
      title: r.f.title,
      validFrom: r.f.validFrom,
      validUntil: r.f.validUntil,
      note: r.f.note,
      file: fileMeta(r),
      createdAt: (r.f.createdAt ?? new Date()).toISOString().slice(0, 10),
    })),
    salaries: sals.map((s) => ({
      id: String(s.id),
      employeeId: String(s.employeeId),
      validFrom: s.validFrom,
      gross: s.gross,
      net: s.net,
      meal: s.meal,
      transport: s.transport,
      note: s.note,
    })),
    bonuses: bons.map((b) => ({
      id: String(b.id),
      employeeId: String(b.employeeId),
      month: b.month,
      fixedGross: b.fixedGross,
      proposed: b.proposed,
      approved: b.approved,
      status: b.status as BonusStatus,
      basis: b.basis,
      note: b.note,
    })),
    policy,
  }
}

export interface EmployeeFileInput {
  token: string
  actorId: string | null
  employeeId: string
  category: string
  title: string
  validFrom: string | null
  validUntil: string | null
  note: string
  file: { name: string; mime: string; dataB64: string } | null
}

export async function addEmployeeFile(input: EmployeeFileInput) {
  await requireAdmin(input.token)
  if (!input.title.trim() && !input.file)
    throw new Error('Unesite naziv dokumenta ili priložite datoteku.')
  const fileId = input.file
    ? await storeFile(input.file.name, input.file.mime, input.file.dataB64)
    : null
  await db.insert(t.employeeFiles).values({
    employeeId: Number(input.employeeId),
    category: input.category,
    title: input.title.trim() || input.file?.name || input.category,
    validFrom: input.validFrom || null,
    validUntil: input.validUntil || null,
    note: input.note.trim(),
    fileId,
    uploadedBy: input.actorId ? Number(input.actorId) : null,
  })
}

export async function deleteEmployeeFile(token: string, id: string) {
  await requireAdmin(token)
  const [row] = await db
    .delete(t.employeeFiles)
    .where(eq(t.employeeFiles.id, Number(id)))
    .returning()
  if (row?.fileId) await db.delete(t.files).where(eq(t.files.id, row.fileId))
}

export async function downloadEmployeeFile(token: string, id: string) {
  await requireAdmin(token)
  const [row] = await db
    .select()
    .from(t.employeeFiles)
    .where(eq(t.employeeFiles.id, Number(id)))
  if (!row?.fileId) throw new Error('Nema priložene datoteke.')
  return readFile(row.fileId)
}

export interface SalaryInput {
  token: string
  employeeId: string
  validFrom: string
  gross: number
  net: number
  meal: number
  transport: number
  note: string
}

export async function saveSalary(input: SalaryInput) {
  await requireAdmin(input.token)
  if (!input.validFrom) throw new Error('Unesite datum od kojeg plaća vrijedi.')
  if (!(input.gross > 0) || !(input.net > 0))
    throw new Error('Unesite bruto i neto iznos.')
  if (input.net > input.gross)
    throw new Error('Neto ne može biti veći od bruto iznosa.')
  await db.insert(t.salaries).values({
    employeeId: Number(input.employeeId),
    validFrom: input.validFrom,
    gross: r2(input.gross),
    net: r2(input.net),
    meal: r2(Math.max(0, input.meal)),
    transport: r2(Math.max(0, input.transport)),
    note: input.note.trim(),
  })
}

export async function deleteSalary(token: string, id: string) {
  await requireAdmin(token)
  await db.delete(t.salaries).where(eq(t.salaries.id, Number(id)))
}

export interface BonusRowInput {
  employeeId: string
  fixedGross: number
  proposed: number
  approved: number | null
  status: BonusStatus
  basis: string
  note: string
}

export async function saveBonuses(
  token: string,
  month: string,
  rows: BonusRowInput[],
  actorId: string | null,
) {
  await requireAdmin(token)
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Neispravan mjesec.')
  await db.transaction(async (tx) => {
    for (const r of rows) {
      const values = {
        fixedGross: r2(r.fixedGross),
        proposed: r2(r.proposed),
        approved: r.approved === null ? null : r2(Math.max(0, r.approved)),
        status: r.status,
        basis: r.basis,
        note: r.note,
        decidedBy: r.status === 'odobreno' && actorId ? Number(actorId) : null,
        updatedAt: new Date(),
      }
      const [ex] = await tx
        .select({ id: t.bonuses.id })
        .from(t.bonuses)
        .where(
          and(
            eq(t.bonuses.employeeId, Number(r.employeeId)),
            eq(t.bonuses.month, month),
          ),
        )
      if (ex)
        await tx.update(t.bonuses).set(values).where(eq(t.bonuses.id, ex.id))
      else
        await tx
          .insert(t.bonuses)
          .values({ ...values, employeeId: Number(r.employeeId), month })
    }
  })
}

export async function savePolicy(token: string, policy: BonusPolicy) {
  await requireAdmin(token)
  const clean = Object.fromEntries(
    Object.entries({ ...DEFAULT_POLICY, ...policy }).map(([k, v]) => [
      k,
      Math.max(0, Number(v) || 0),
    ]),
  )
  await setMeta('bonus_policy', JSON.stringify(clean))
}

/** Primjerne plaće za demo zaposlenike (samo dok baza ima primjerne podatke). */
export async function ensureHrSeeded() {
  if ((await meta('hr_seeded')) || (await meta('cleared'))) return
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(t.salaries)
  if (!n) {
    const emps = await db
      .select()
      .from(t.employees)
      .where(eq(t.employees.active, true))
    const base: Record<string, [number, number]> = {
      'Voditelj salona': [2600, 1700],
      Prodavač: [1900, 1250],
      'Dostava i montaža': [1700, 1120],
    }
    const year = today().slice(0, 4)
    for (const e of emps) {
      const [g, nt] = base[e.role] ?? [1800, 1180]
      await db.insert(t.salaries).values({
        employeeId: e.id,
        validFrom: `${year}-01-01`,
        gross: g,
        net: nt,
        meal: 286,
        transport: 60,
        note: 'Primjerni podatak',
      })
    }
  }
  await setMeta('hr_seeded', today())
}
