/**
 * Prijava korisnika: korisničko ime + lozinka, sesija u httpOnly kolačiću (HMAC potpis).
 * Prva prijava: korisnik unosi jednokratni aktivacijski kod i sam postavlja lozinku.
 */
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { and, asc, eq, lt } from 'drizzle-orm'
import { deleteCookie, getCookie, getRequestHeader, getRequestProtocol, setCookie } from '@tanstack/react-start/server'
import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'
import { hashPassword, meta, setMeta, verifyPassword } from './hr'
import * as audit from './audit'

/**
 * admin — sve, uključujući korisnike
 * uprava — sve osim korisnika (zarada, plaće, troškovi bez dodatne lozinke)
 * voditelj — voditelj salona: promet tima, plan, zadaci trgovcima, nabava i roba; bez zarade, plaća i troškova
 * operativa — srednji pristup: primke, narudžbe dobavljačima, izvodi/kartice, artikli, inventura;
 *             bez tuđeg prometa, zarade, izvještaja, troškova i kadrovske
 * trgovac — prodaja, dostave, zalihe bez nabavnih cijena, radno vrijeme
 */
export type UserRole = 'admin' | 'uprava' | 'voditelj' | 'operativa' | 'trgovac'
const ROLES: UserRole[] = ['admin', 'uprava', 'voditelj', 'operativa', 'trgovac']
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
/** Prijava traje dok je preglednik otvoren, a najduže jedan radni dan. */
const SESSION_HOURS = 14

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

/**
 * Aplikacija javlja „živ sam” svake minute dok je otvorena. Ako se ne javi duže od ovoga
 * (zatvoren preglednik, aplikacija, ugašen mobitel), prijava prestaje važiti.
 */
const IDLE_MINUTES = 10
/** Korisnik se smatra „online” ako se javio u zadnje 2 minute. */
export const ONLINE_MINUTES = 2

async function startSession(userId: number) {
  const exp = Date.now() + SESSION_HOURS * 3_600_000
  const sid = randomBytes(18).toString('base64url')
  const ua = (getRequestHeader('user-agent') ?? '').slice(0, 300)
  await db.insert(t.sessions).values({ id: sid, userId, userAgent: ua, createdAt: new Date(), lastSeenAt: new Date() })
  // stare sesije (starije od dana) čistimo usput
  await db.delete(t.sessions).where(lt(t.sessions.lastSeenAt, new Date(Date.now() - 86_400_000)))
  const payload = `${userId}.${exp}.${sid}`
  setCookie(COOKIE, `${payload}.${sign(await secret(), payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: getRequestProtocol({ xForwardedProto: true }) === 'https',
    path: '/',
    // Bez maxAge: kolačić sesije nestaje kad se zatvori preglednik (automatska odjava).
  })
  await db.update(t.users).set({ lastLoginAt: new Date() }).where(eq(t.users.id, userId))
}

/** Trenutno prijavljeni korisnik ili null. */
export async function currentUser(): Promise<SessionUser | null> {
  const raw = getCookie(COOKIE)
  if (!raw) return null
  const [id, exp, sid, mac] = raw.split('.')
  if (!id || !exp || !sid || !mac || Number(exp) < Date.now()) return null
  const good = sign(await secret(), `${id}.${exp}.${sid}`)
  if (good.length !== mac.length || !timingSafeEqual(Buffer.from(good), Buffer.from(mac))) return null
  const [sess] = await db.select().from(t.sessions).where(eq(t.sessions.id, sid))
  if (!sess || sess.userId !== Number(id)) return null
  const idle = Date.now() - sess.lastSeenAt.getTime()
  if (idle > IDLE_MINUTES * 60_000) {
    await db.delete(t.sessions).where(eq(t.sessions.id, sid))
    return null
  }
  const [u] = await db.select().from(t.users).where(eq(t.users.id, Number(id)))
  if (!u || !u.active || !u.passwordHash) return null
  // Svaka radnja (i otkucaj) produžava sesiju; u bazu pišemo najviše jednom u 30 s.
  if (idle > 30_000) await db.update(t.sessions).set({ lastSeenAt: new Date() }).where(eq(t.sessions.id, sid))
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
  const name = normalizeUsername(username)
  await audit.checkLock(name)
  const [u] = await db.select().from(t.users).where(eq(t.users.username, name))
  if (u?.active && !u.passwordHash) return { needsActivation: true }
  if (!u || !u.active || !verifyPassword(password, u.passwordHash!)) {
    await audit.record({ entity: 'Prijava', action: 'neuspjela', subject: name, detail: u ? (u.active ? 'pogrešna lozinka' : 'neaktivan račun') : 'nepostojeće korisničko ime', ok: false })
    const left = await audit.failsLeft(name)
    if (left === 0) {
      await audit.checkLock(name)
    }
    return fail(left <= 2 ? `Pogrešno korisničko ime ili lozinka. Još ${left} ${left === 1 ? 'pokušaj' : 'pokušaja'} prije privremenog zaključavanja.` : 'Pogrešno korisničko ime ili lozinka.')
  }
  await startSession(u.id)
  await audit.record({ user: { id: String(u.id), name: u.name }, entity: 'Prijava', action: 'uspješna', subject: name })
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
  await audit.checkLock(normalizeUsername(username))
  if (!u || !u.active || u.passwordHash) return fail('Aktivacija nije moguća. Provjerite korisničko ime ili se prijavite lozinkom.')
  let ok = !!u.activationCode && normCode(code) === normCode(u.activationCode)
  if (!ok && u.role === 'admin') {
    const adminHash = await meta('admin_hash')
    ok = (!!adminHash && verifyPassword(code, adminHash)) || (!!process.env.ADMIN_LOZINKA && code === process.env.ADMIN_LOZINKA)
  }
  if (!ok) {
    await audit.record({ entity: 'Prijava', action: 'neuspjela aktivacija', subject: u.username, detail: 'pogrešan aktivacijski kod', ok: false })
    return fail('Aktivacijski kod nije tačan.')
  }
  await db.update(t.users).set({ passwordHash: hashPassword(password), activationCode: null }).where(eq(t.users.id, u.id))
  await startSession(u.id)
  return { ok: true as const }
}

export async function logout() {
  const sid = getCookie(COOKIE)?.split('.')[2]
  if (sid) await db.delete(t.sessions).where(eq(t.sessions.id, sid))
  deleteCookie(COOKIE, { path: '/' })
}

/** Ko je trenutno u aplikaciji i kad je zadnji put bio aktivan (za administratora). */
export async function presence() {
  await requireAdminUser()
  const rows = await db.select({ userId: t.sessions.userId, lastSeenAt: t.sessions.lastSeenAt, userAgent: t.sessions.userAgent }).from(t.sessions)
  const by = new Map<string, { lastSeenAt: string; online: boolean; devices: number; mobile: boolean }>()
  for (const r of rows) {
    if (Date.now() - r.lastSeenAt.getTime() > IDLE_MINUTES * 60_000) continue
    const k = String(r.userId)
    const prev = by.get(k)
    const seen = r.lastSeenAt.toISOString()
    const online = Date.now() - r.lastSeenAt.getTime() <= ONLINE_MINUTES * 60_000
    by.set(k, {
      lastSeenAt: !prev || seen > prev.lastSeenAt ? seen : prev.lastSeenAt,
      online: online || !!prev?.online,
      devices: (prev?.devices ?? 0) + 1,
      mobile: !!prev?.mobile || /mobi|android|iphone/i.test(r.userAgent),
    })
  }
  return Object.fromEntries(by)
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
  if (input.id) {
    await db.update(t.users).set(values).where(eq(t.users.id, Number(input.id)))
    // Isključen korisnik odmah gubi pristup na svim uređajima.
    if (!values.active) await db.delete(t.sessions).where(eq(t.sessions.userId, Number(input.id)))
  } else await db.insert(t.users).values({ ...values, activationCode: newActivationCode() })
}

/** Poništava lozinku korisnika i daje novi aktivacijski kod (npr. zaboravljena lozinka). */
export async function resetUser(id: string) {
  const me = await requireAdminUser()
  if (id === me.id) throw new Error('Vlastitu lozinku promijenite u „Moj račun”.')
  await db.update(t.users).set({ passwordHash: null, activationCode: newActivationCode() }).where(eq(t.users.id, Number(id)))
  await db.delete(t.sessions).where(eq(t.sessions.userId, Number(id)))
}

/** Kontakt podaci korisnika (za ispis na narudžbama). */
export async function userContact(id: string) {
  const [u] = await db.select({ name: t.users.name, phone: t.users.phone, email: t.users.email, employeeId: t.users.employeeId }).from(t.users).where(eq(t.users.id, Number(id)))
  return u ?? null
}
