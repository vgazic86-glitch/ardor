/**
 * Trezor pristupnih podataka — samo administrator.
 * Otključavanje lozinkom trezora daje kratkotrajni token; ključ ostaje samo u memoriji servera
 * (restart servera ili 15 min bez rada = trezor se zaključa).
 */
import { randomBytes } from 'node:crypto'
import { asc, eq, sql } from 'drizzle-orm'
import { db, type Tx } from '../../db/index.js'
import * as t from '../../db/schema.js'
import type { SessionUser } from './auth'
import { record } from './audit'
import { meta } from './hr'
import { CHECK_TEXT, checkKey, decrypt, deriveKey, encrypt, masterProblem, newSalt } from './vaultCrypto'
import { VAULT_KINDS, type VaultEntry, type VaultInput } from '../lib/vault'

const IDLE_MS = 15 * 60_000
const open = new Map<string, { key: Buffer; userId: string; exp: number }>()

function requireVaultUser(user: SessionUser) {
  if (user.role !== 'admin') throw new Error('Pristupne podatke vidi samo administrator.')
}

function keyFor(user: SessionUser, token: string): Buffer {
  requireVaultUser(user)
  const now = Date.now()
  for (const [k, v] of open) if (v.exp < now) open.delete(k)
  const s = open.get(String(token ?? ''))
  if (!s || s.userId !== user.id) throw new Error('Trezor je zaključan. Upišite lozinku trezora.')
  s.exp = now + IDLE_MS
  return s.key
}

function issue(user: SessionUser, key: Buffer) {
  const token = randomBytes(24).toString('base64url')
  open.set(token, { key, userId: user.id, exp: Date.now() + IDLE_MS })
  return { token }
}

async function upsertMeta(q: Tx | typeof db, key: string, value: string) {
  await q.insert(t.appMeta).values({ key, value }).onConflictDoUpdate({ target: t.appMeta.key, set: { value } })
}

export async function vaultStatus(user: SessionUser) {
  requireVaultUser(user)
  return { configured: !!(await meta('trezor_check')) }
}

export async function vaultSetup(user: SessionUser, master: string) {
  requireVaultUser(user)
  if (await meta('trezor_check')) throw new Error('Trezor je već postavljen.')
  const problem = masterProblem(String(master ?? ''))
  if (problem) throw new Error(problem)
  const salt = newSalt()
  const key = deriveKey(master, salt)
  await db.transaction(async (tx) => {
    await upsertMeta(tx, 'trezor_salt', salt)
    await upsertMeta(tx, 'trezor_check', encrypt(key, CHECK_TEXT))
  })
  return issue(user, key)
}

async function verifyMaster(master: string) {
  const [salt, check] = await Promise.all([meta('trezor_salt'), meta('trezor_check')])
  if (!salt || !check) throw new Error('Trezor još nije postavljen.')
  const key = deriveKey(String(master ?? ''), salt)
  return checkKey(key, check) ? key : null
}

export async function vaultUnlock(user: SessionUser, master: string) {
  requireVaultUser(user)
  const key = await verifyMaster(master)
  if (!key) {
    await record({ user, entity: 'Pristupni podaci', action: 'pogrešna lozinka trezora', ok: false })
    await new Promise((r) => setTimeout(r, 800))
    throw new Error('Pogrešna lozinka trezora.')
  }
  return issue(user, key)
}

export function vaultLock(user: SessionUser, token: string) {
  requireVaultUser(user)
  open.delete(String(token ?? ''))
}

export async function vaultList(user: SessionUser, token: string): Promise<VaultEntry[]> {
  keyFor(user, token)
  const rows = await db.select().from(t.vaultEntries).orderBy(asc(t.vaultEntries.kind), asc(t.vaultEntries.title))
  return rows.map((r) => ({
    id: String(r.id),
    kind: r.kind,
    title: r.title,
    username: r.username,
    url: r.url,
    hasSecret: !!r.secretEnc,
    hasNote: !!r.noteEnc,
    updatedBy: r.updatedBy,
    updatedAt: (r.updatedAt ?? r.createdAt ?? new Date(0)).toISOString(),
  }))
}

export async function vaultReveal(user: SessionUser, token: string, id: string) {
  const key = keyFor(user, token)
  const [r] = await db.select().from(t.vaultEntries).where(eq(t.vaultEntries.id, Number(id)))
  if (!r) throw new Error('Zapis ne postoji.')
  await record({ user, entity: 'Pristupni podaci', action: 'prikazana lozinka', detail: r.title })
  return { secret: decrypt(key, r.secretEnc), note: decrypt(key, r.noteEnc) }
}

export async function vaultSave(user: SessionUser, token: string, input: VaultInput) {
  const key = keyFor(user, token)
  const title = String(input.title ?? '').trim().slice(0, 120)
  if (!title) throw new Error('Upišite naziv (npr. info@ardornamjestaj.com).')
  const values = {
    kind: (VAULT_KINDS as readonly string[]).includes(input.kind) ? input.kind : 'ostalo',
    title,
    username: String(input.username ?? '').trim().slice(0, 200),
    url: String(input.url ?? '').trim().slice(0, 300),
    secretEnc: encrypt(key, String(input.secret ?? '').slice(0, 500)),
    noteEnc: encrypt(key, String(input.note ?? '').slice(0, 4000)),
    updatedBy: user.name,
    updatedAt: new Date(),
  }
  if (input.id) {
    await db.update(t.vaultEntries).set(values).where(eq(t.vaultEntries.id, Number(input.id)))
    return { id: input.id }
  }
  const [row] = await db.insert(t.vaultEntries).values({ ...values, createdAt: new Date() }).returning()
  return { id: String(row.id) }
}

export async function vaultDelete(user: SessionUser, token: string, id: string) {
  keyFor(user, token)
  await db.delete(t.vaultEntries).where(eq(t.vaultEntries.id, Number(id)))
}

/** Nova lozinka trezora: svi zapisi se ponovo šifriraju u jednoj transakciji. */
export async function vaultChangeMaster(user: SessionUser, token: string, oldMaster: string, newMaster: string) {
  keyFor(user, token)
  const oldKey = await verifyMaster(oldMaster)
  if (!oldKey) throw new Error('Trenutna lozinka trezora nije tačna.')
  const problem = masterProblem(String(newMaster ?? ''))
  if (problem) throw new Error(problem)
  const salt = newSalt()
  const key = deriveKey(newMaster, salt)
  await db.transaction(async (tx) => {
    const rows = await tx.select().from(t.vaultEntries)
    for (const r of rows)
      await tx
        .update(t.vaultEntries)
        .set({ secretEnc: encrypt(key, decrypt(oldKey, r.secretEnc)), noteEnc: encrypt(key, decrypt(oldKey, r.noteEnc)) })
        .where(eq(t.vaultEntries.id, r.id))
    await upsertMeta(tx, 'trezor_salt', salt)
    await upsertMeta(tx, 'trezor_check', encrypt(key, CHECK_TEXT))
  })
  open.clear()
  return issue(user, key)
}

/** Broj zapisa (za provjeru pri selidbi baze) — bez sadržaja. */
export async function vaultCount() {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(t.vaultEntries)
  return r?.n ?? 0
}
