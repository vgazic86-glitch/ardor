/**
 * Sedmični izvještaj upravi: sastavljanje iz baze i slanje preko Resenda (HTTPS API).
 * Okidač je GitHub Action koji ponedjeljkom zove /api/izvjestaj-sedmicni s tajnim tokenom.
 */
import { timingSafeEqual } from 'node:crypto'
import { and, eq, inArray, ne } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'
import { buildWeekly, weeklyHtml, weeklySubject, weeklyText, type Weekly } from '../lib/weekly'
import { record } from './audit'
import { listComplaints } from './complaints'
import { loadSnapshot } from './logic'

const SENT_KEY = 'sedmicni_izvjestaj_poslan'
const APP_URL = () => process.env.APP_URL || 'https://ardor-4mdu.onrender.com'
const FROM = () => process.env.IZVJESTAJ_OD || 'ARDOR izvještaji <izvjestaji@ardornamjestaj.com>'

/** Primaoci: aktivni administratori i uprava s upisanom e-poštom (Korisnici i pristup). */
export async function recipients() {
  const rows = await db
    .select({ name: t.users.name, email: t.users.email })
    .from(t.users)
    .where(and(eq(t.users.active, true), inArray(t.users.role, ['admin', 'uprava']), ne(t.users.email, '')))
  return rows.filter((r) => /.+@.+\..+/.test(r.email.trim())).map((r) => ({ name: r.name, email: r.email.trim() }))
}

export async function composeWeekly(): Promise<{ weekly: Weekly; subject: string; html: string; text: string }> {
  const snap = await loadSnapshot()
  const { complaints } = await listComplaints()
  const weekly = buildWeekly({ ...snap, complaints })
  return {
    weekly,
    subject: weeklySubject(weekly),
    html: weeklyHtml(weekly, APP_URL()),
    text: weeklyText(weekly, APP_URL()),
  }
}

/** Stanje podešenosti (bez otkrivanja tajni) — za stranicu Izvještaji. */
export async function weeklyStatus() {
  const [sent] = await db.select().from(t.appMeta).where(eq(t.appMeta.key, SENT_KEY))
  return {
    resend: !!process.env.RESEND_API_KEY,
    token: !!process.env.IZVJESTAJ_TOKEN,
    from: FROM(),
    recipients: await recipients(),
    lastWeekSent: sent?.value ?? null,
  }
}

async function sendEmail(to: string[], subject: string, html: string, text: string) {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('E-pošta nije podešena: na Renderu nedostaje RESEND_API_KEY.')
  // RESEND_API_URL služi samo za lokalno testiranje (lažni server); na Renderu se ne postavlja.
  const res = await fetch(`${process.env.RESEND_API_URL || 'https://api.resend.com'}/emails`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM(), to, subject, html, text }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend je odbio poruku (${res.status}). ${body.slice(0, 200)}`)
  }
}

/** Sat i dan u sedmici po vremenu Sarajeva. */
function localNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Sarajevo',
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  return {
    weekday: parts.find((p) => p.type === 'weekday')?.value ?? '',
    hour: Number(parts.find((p) => p.type === 'hour')?.value ?? 0),
  }
}

/**
 * Pošalji izvještaj za prošlu sedmicu.
 * - `scheduled`: poziv iz GitHub Actiona — šalje najviše jednom po sedmici i ne prije ponedjeljka u 7:00
 *   (GitHub cron je u UTC-u, pa se zove dvaput: zimsko i ljetno vrijeme).
 * - inače: ručno slanje iz aplikacije (probni primjerak), bez oznake „poslano”.
 */
export async function sendWeekly(opts: { scheduled: boolean }) {
  const to = await recipients()
  if (!to.length)
    throw new Error('Nema primalaca: upišite e-poštu administratoru ili upravi u Korisnici i pristup.')
  const msg = await composeWeekly()
  const week = msg.weekly.period.from
  if (opts.scheduled) {
    const now = localNow()
    if (now.weekday === 'Mon' && now.hour < 7) return { sent: false, reason: 'prerano (prije 7:00)', week }
    const [row] = await db.select().from(t.appMeta).where(eq(t.appMeta.key, SENT_KEY))
    if (row?.value === week) return { sent: false, reason: 'već poslano za ovu sedmicu', week }
  }
  await sendEmail(
    to.map((r) => r.email),
    opts.scheduled ? msg.subject : `[Probni primjerak] ${msg.subject}`,
    msg.html,
    msg.text,
  )
  if (opts.scheduled)
    await db
      .insert(t.appMeta)
      .values({ key: SENT_KEY, value: week })
      .onConflictDoUpdate({ target: t.appMeta.key, set: { value: week } })
  // Ručno slanje upisuje dnevnik preko MAP-a u audit.ts (s imenom korisnika); automatsko ovdje.
  if (opts.scheduled)
    await record({
      user: null,
      entity: 'Izvještaj',
      action: 'sedmični poslan',
      detail: `${msg.subject} → ${to.length} primalaca`,
    })
  return { sent: true, week, recipients: to.length }
}

/** Provjera tajnog tokena iz zaglavlja `Authorization: Bearer …` (stalno vrijeme usporedbe). */
export function tokenOk(header: string | null) {
  const secret = process.env.IZVJESTAJ_TOKEN
  if (!secret || !header?.startsWith('Bearer ')) return false
  const a = Buffer.from(header.slice(7))
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}
