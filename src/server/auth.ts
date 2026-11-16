/**
 * Prijava korisnika: korisničko ime + lozinka, sesija u httpOnly kolačiću (HMAC potpis).
 * Prva prijava: korisnik unosi jednokratni aktivacijski kod i sam postavlja lozinku.
 */
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { and, asc, eq } from 'drizzle-orm'
import { deleteCookie, getCookie, getRequestProtocol, setCookie } from '@tanstack/react-start/server'
import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'
import { hashPassword, meta, setMeta, verifyPassword } from './hr'

/**
 * admin — sve, uključujući korisnike
 * uprava — sve osim korisnika (zarada, plaće, troškovi bez dodatne lozinke)
 * operativa — srednji pristup: primke, narudžbe dobavljačima, izvodi/kartice, artikli, inventura;
 *             bez tuđeg prometa, zarade, izvještaja, troškova i kadrovske
 * trgovac — prodaja, dostave, zalihe bez nabavnih cijena, radno vrijeme
 */
export type UserRole = 'admin' | 'uprava' | 'operativa' | 'trgovac'
const ROLES: UserRole[] = ['admin', 'uprava', 'operativa', 'trgovac']
/** Puni uvid u poslovanje (zarada, plaće, tuđi promet). */
export const isFull = (role: UserRole) => role === 'admin' || role === 'uprava'

export interface SessionUser {
  id: string
  username: string
  name: string
  role: UserRole
  hrAccess: boolean
  /** Za trgovce: njihov zaposlenik (prodaje se upisuju na njega). */
  employeeId: string | null
}

export interface UserAdminView extends SessionUser {
  active: boolean
  activated: boolean
  /** Jednokratni kod za prvu prijavu (vidljiv samo administratoru dok korisnik ne postavi lozinku). */
  activationCode: string | null
  lastLoginAt: string | null
  phone: string
  email: string
}

const COOKIE = 'ardor_sesija'
const SESSION_DAYS = 30

/** Početni korisnici: Vladimir je glavni administrator. */
const INITIAL_USERS: { username: string; name: string; role: UserRole; hrAccess: boolean }[] = [
  { username: 'vladimir', name: 'Vladimir', role: 'admin', hrAccess: true },
  { username: 'nebojsa', name: 'Nebojša', role: 'uprava', hrAccess: false },
  { username: 'ljubinka', name: 'Ljubinka', role: 'uprava', hrAccess: false },
  { username: 'mario', name: 'Mario', role: 'uprava', hrAccess: false },
]

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function newActivationCode() {
  const pick = () => Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('')
  return `${pick()}-${pick()}`
}

/** Korisničko ime: mala slova, bez dijakritike (Nebojša → nebojsa). */
export function normalizeUsername(u: string) {
  return u
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'dj')
    .replace(/[^a-z0-9._-]/g, '')
}
const normCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '')

async function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET
  let s = await meta('session_secret')
  if (!s) {
    s = randomBytes(32).toString('hex')
    await setMeta('session_secret', s)
  }
  return s
}

const sign = (key: string, payload: string) => createHmac('sha256', key).update(payload).digest('hex')

export async function ensureUsers() {
  if (await meta('users_seeded')) return
  const existing = await db.select({ id: t.users.id }).from(t.users)
  if (!existing.length)
    await db
      .insert(t.users)
      .values(INITIAL_USERS.map((u) => ({ ...u, activationCode: newActivationCode() })))
      .onConflictDoNothing()
  await setMeta('users_seeded', new Date().toISOString())
  await ensureTraders()
}

/**
 * Trgovci: prodavači u aplikaciji dobijaju privremene nazive „Trgovac 1, 2, …”
 * i svaki svoj račun s ograničenim pristupom (kasnije im se dodijele imena).
 */
async function ensureTraders() {
  if (await meta('trgovci_v1')) return
  const sellers = await db
    .select()
    .from(t.employees)
    .where(and(eq(t.employees.active, true), eq(t.employees.role, 'Prodavač')))
    .orderBy(asc(t.employees.id))
  let n = 0
  for (const e of sellers) {
    n += 1
    await db.update(t.employees).set({ name: `Trgovac ${n}`, initials: `T${n}` }).where(eq(t.employees.id, e.id))
    await db
      .insert(t.users)
      .values({ username: `trgovac${n}`, name: `Trgovac ${n}`, role: 'trgovac', employeeId: e.id, hrAccess: false, activationCode: newActivationCode() })
      .onConflictDoNothing()
  }
  await setMeta('trgovci_v1', String(n))
}

const toSession = (u: typeof t.users.$inferSelect): SessionUser => ({
  id: String(u.id),
  username: u.username,
  name: u.name,
  role: (ROLES.includes(u.role as UserRole) ? u.role : 'uprava') as UserRole,
  hrAccess: u.role === 'admin' || u.role === 'uprava',
  employeeId: u.employeeId ? String(u.employeeId) : null,
})

async function startSession(userId: number) {
  const exp = Date.now() + SESSION_DAYS * 86_400_000
  const payload = `${userId}.${exp}`
  setCookie(COOKIE, `${payload}.${sign(await secret(), payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: getRequestProtocol({ xForwardedProto: true }) === 'https',
    path: '/',
    maxAge: SESSION_DAYS * 86_400,
  })
  await db.update(t.users).set({ lastLoginAt: new Date() }).where(eq(t.users.id, userId))
}

/** Trenutno prijavljeni korisnik ili null. */
export async function currentUser(): Promise<SessionUser | null> {
  const raw = getCookie(COOKIE)
  if (!raw) return null
  const [id, exp, mac] = raw.split('.')
  if (!id || !exp || !mac || Number(exp) < Date.now()) return null
  const good = sign(await secret(), `${id}.${exp}`)
  if (good.length !== mac.length || !timingSafeEqual(Buffer.from(good), Buffer.from(mac))) return null
  const [u] = await db.select().from(t.users).where(eq(t.users.id, Number(id)))
  if (!u || !u.active || !u.passwordHash) return null
  return toSession(u)
}

export async function requireUser() {
  const u = await currentUser()
  if (!u) throw new Error('Niste prijavljeni. Prijavite se ponovo.')
  return u
}

/** Operativni poslovi: uprava, administrator i operativa (ne trgovci). */
export async function requireOperations() {
  const u = await requireUser()
  if (u.role === 'trgovac') throw new Error('Za ovu radnju nemate ovlaštenje.')
  return u
}

/** Uprava i administrator (puni uvid u poslovanje). */
export async function requireManager() {
  const u = await requireUser()
  if (!isFull(u.role)) throw new Error('Za ovu radnju nemate ovlaštenje.')
  return u
}

export async function requireAdminUser() {
  const u = await requireUser()
  if (u.role !== 'admin') throw new Error('Samo administrator može upravljati korisnicima.')
  return u
}

const fail = async (msg: string) => {
  await new Promise((r) => setTimeout(r, 700))
  throw new Error(msg)
}

export async function login(username: string, password: string): Promise<{ ok: true } | { needsActivation: true }> {
  await ensureUsers()
  const [u] = await db.select().from(t.users).where(eq(t.users.username, normalizeUsername(username)))
  if (!u || !u.active) return fail('Pogrešno korisničko ime ili lozinka.')
  if (!u.passwordHash) return { needsActivation: true }
  if (!verifyPassword(password, u.passwordHash)) return fail('Pogrešno korisničko ime ili lozinka.')
  await startSession(u.id)
  return { ok: true }
}

/**
 * Prva prijava: aktivacijski kod + nova lozinka.
 * Administrator može umjesto koda upisati i postojeću upravljačku lozinku.
 */
export async function activate(username: string, code: string, password: string) {
  await ensureUsers()
  if (password.length < 8) throw new Error('Lozinka mora imati najmanje 8 znakova.')
  const [u] = await db.select().from(t.users).where(eq(t.users.username, normalizeUsername(username)))
  if (!u || !u.active || u.passwordHash) return fail('Aktivacija nije moguća. Provjerite korisničko ime ili se prijavite lozinkom.')
  let ok = !!u.activationCode && normCode(code) === normCode(u.activationCode)
  if (!ok && u.role === 'admin') {
    const adminHash = await meta('admin_hash')
    ok = (!!adminHash && verifyPassword(code, adminHash)) || (!!process.env.ADMIN_LOZINKA && code === process.env.ADMIN_LOZINKA)
  }
  if (!ok) return fail('Aktivacijski kod nije tačan.')
  await db.update(t.users).set({ passwordHash: hashPassword(password), activationCode: null }).where(eq(t.users.id, u.id))
  await startSession(u.id)
  return { ok: true as const }
}

export async function logout() {
  deleteCookie(COOKIE, { path: '/' })
}

export async function changePassword(oldPassword: string, newPassword: string) {
  const me = await requireUser()
  if (newPassword.length < 8) throw new Error('Nova lozinka mora imati najmanje 8 znakova.')
  const [u] = await db.select().from(t.users).where(eq(t.users.id, Number(me.id)))
  if (!u?.passwordHash || !verifyPassword(oldPassword, u.passwordHash)) return fail('Trenutna lozinka nije tačna.')
  await db.update(t.users).set({ passwordHash: hashPassword(newPassword) }).where(eq(t.users.id, u.id))
}

/* ───────────────────────── administracija korisnika ───────────────────────── */

export async function listUsers(): Promise<UserAdminView[]> {
  await requireAdminUser()
  const rows = await db.select().from(t.users).orderBy(asc(t.users.id))
  return rows.map((u) => ({
    ...toSession(u),
    active: u.active,
    activated: !!u.passwordHash,
    activationCode: u.passwordHash ? null : u.activationCode,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    phone: u.phone,
    email: u.email,
  }))
}

export interface UserInput {
  id: string | null
  username: string
  name: string
  role: UserRole
  hrAccess: boolean
  employeeId: string | null
  active: boolean
  phone: string
  email: string
}

export async function saveUser(input: UserInput) {
  const me = await requireAdminUser()
  const username = normalizeUsername(input.username)
  if (username.length < 3) throw new Error('Korisničko ime mora imati najmanje 3 znaka (slova bez kvačica, brojevi).')
  if (!input.name.trim()) throw new Error('Unesite ime.')
  const role: UserRole = ROLES.includes(input.role) ? input.role : 'uprava'
  if (role === 'trgovac' && !input.employeeId) throw new Error('Trgovcu odaberite zaposlenika na kojeg se upisuju prodaje.')
  if (input.id === me.id && (role !== 'admin' || !input.active)) throw new Error('Ne možete sebi oduzeti administratorska prava niti se deaktivirati.')
  const [dup] = await db.select({ id: t.users.id }).from(t.users).where(eq(t.users.username, username))
  if (dup && String(dup.id) !== input.id) throw new Error(`Korisničko ime „${username}” je zauzeto.`)
  const values = {
    username,
    name: input.name.trim(),
    role,
    hrAccess: isFull(role),
    employeeId: input.employeeId ? Number(input.employeeId) : null,
    active: input.active,
    phone: (input.phone ?? '').trim(),
    email: (input.email ?? '').trim(),
  }
  if (input.id) await db.update(t.users).set(values).where(eq(t.users.id, Number(input.id)))
  else await db.insert(t.users).values({ ...values, activationCode: newActivationCode() })
}

/** Poništava lozinku korisnika i daje novi aktivacijski kod (npr. zaboravljena lozinka). */
export async function resetUser(id: string) {
  const me = await requireAdminUser()
  if (id === me.id) throw new Error('Vlastitu lozinku promijenite u „Moj račun”.')
  await db.update(t.users).set({ passwordHash: null, activationCode: newActivationCode() }).where(eq(t.users.id, Number(id)))
}

/** Kontakt podaci korisnika (za ispis na narudžbama). */
export async function userContact(id: string) {
  const [u] = await db.select({ name: t.users.name, phone: t.users.phone, email: t.users.email, employeeId: t.users.employeeId }).from(t.users).where(eq(t.users.id, Number(id)))
  return u ?? null
}
