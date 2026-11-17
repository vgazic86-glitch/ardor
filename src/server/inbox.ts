/** Obavijesti u zvonu, oglasna ploča i automatski dnevni zadaci (lista otvaranja/zatvaranja po smjeni, podsjetnik za dostavu). */
import { and, desc, eq, inArray, isNull, like, ne, or, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'
import { addDaysIso, dotDate, listTitle, type InboxData, type ShiftKind, type ShiftsData } from '../lib/inbox'
import { isFull, type SessionUser } from './auth'

/** Smije li korisnik pisati na oglasnu ploču i uređivati smjene: administrator, uprava i voditelj salona. */
export async function canPost(user: SessionUser) {
  if (isFull(user.role) || user.role === 'voditelj') return true
  if (!user.employeeId) return false
  const [e] = await db.select({ role: t.employees.role }).from(t.employees).where(eq(t.employees.id, Number(user.employeeId)))
  return e?.role === 'Voditelj salona'
}

/** Aktivni računi voditelja salona (po ulozi ili po zaposleniku). */
async function managerIds() {
  const rows = await db
    .select({ id: t.users.id })
    .from(t.users)
    .leftJoin(t.employees, eq(t.users.employeeId, t.employees.id))
    .where(and(eq(t.users.active, true), or(eq(t.users.role, 'voditelj'), eq(t.employees.role, 'Voditelj salona'))))
  return rows.map((r) => r.id)
}

async function activeUserIds() {
  const rows = await db.select({ id: t.users.id }).from(t.users).where(eq(t.users.active, true))
  return rows.map((r) => r.id)
}

async function addNotifications(userIds: number[], title: string, text: string) {
  const ids = [...new Set(userIds)]
  if (!ids.length) return
  const at = new Date()
  await db.insert(t.notifications).values(ids.map((userId) => ({ userId, at, title: title.slice(0, 120), text: text.slice(0, 300) })))
}

/** Obavijest svakom voditelju salona o događaju iz salona. Greška ne smije srušiti radnju. */
export async function notifyManagers(title: string, text: string) {
  try {
    await addNotifications(await managerIds(), title, text)
  } catch (e) {
    console.error('Obavijest voditelju nije upisana', e)
  }
}

export async function listInbox(user: SessionUser): Promise<InboxData> {
  const me = Number(user.id)
  const notes = await db.select().from(t.notifications).where(eq(t.notifications.userId, me)).orderBy(desc(t.notifications.at)).limit(40)
  const [unreadRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(t.notifications)
    .where(and(eq(t.notifications.userId, me), isNull(t.notifications.readAt)))
  const anns = await db.select().from(t.announcements).orderBy(desc(t.announcements.createdAt)).limit(20)
  const reads = anns.length
    ? await db.select().from(t.announcementReads).where(inArray(t.announcementReads.announcementId, anns.map((a) => a.id)))
    : []
  const total = (await activeUserIds()).length
  return {
    notifications: notes.map((n) => ({ id: String(n.id), at: n.at.toISOString(), title: n.title, text: n.text, read: !!n.readAt })),
    unread: unreadRow?.n ?? 0,
    announcements: anns.map((a) => {
      const who = reads.filter((r) => r.announcementId === a.id)
      return {
        id: String(a.id),
        title: a.title,
        body: a.body,
        authorName: a.authorName,
        createdAt: a.createdAt.toISOString(),
        confirmed: who.some((r) => r.userId === me),
        confirmedCount: who.length,
        total,
      }
    }),
    canPost: await canPost(user),
  }
}

export async function markInboxRead(user: SessionUser) {
  await db
    .update(t.notifications)
    .set({ readAt: new Date() })
    .where(and(eq(t.notifications.userId, Number(user.id)), isNull(t.notifications.readAt)))
}

export async function postAnnouncement(user: SessionUser, input: { title: string; body: string }) {
  if (!(await canPost(user))) throw new Error('Objave mogu pisati administrator, uprava i voditelj salona.')
  const title = input.title.trim()
  if (!title) throw new Error('Upišite naslov objave.')
  const body = input.body.trim()
  await db.insert(t.announcements).values({ title: title.slice(0, 160), body: body.slice(0, 4000), authorId: Number(user.id), authorName: user.name, createdAt: new Date() })
  await addNotifications(await activeUserIds(), `Oglasna ploča: ${title}`, body.slice(0, 200) || `Objavio/la: ${user.name}`)
  return { count: 1 }
}

export async function confirmAnnouncement(user: SessionUser, id: string) {
  const annId = Number(id)
  const [a] = await db.select({ id: t.announcements.id }).from(t.announcements).where(eq(t.announcements.id, annId))
  if (!a) throw new Error('Objava ne postoji.')
  await db
    .insert(t.announcementReads)
    .values({ announcementId: annId, userId: Number(user.id), readAt: new Date() })
    .onConflictDoNothing()
}

/** Smjene za zadane dane (npr. danas i sutra) i popis trgovaca. */
export async function listShifts(user: SessionUser, days: string[]): Promise<ShiftsData> {
  const traders = await db
    .select({ id: t.users.id, name: t.users.name })
    .from(t.users)
    .where(and(eq(t.users.active, true), eq(t.users.role, 'trgovac')))
    .orderBy(t.users.name)
  const rows = await db.select().from(t.shifts).where(inArray(t.shifts.date, days))
  return {
    days: days.map((date) => ({
      date,
      rows: traders.map((tr) => ({
        userId: String(tr.id),
        name: tr.name,
        shift: (rows.find((r) => r.date === date && r.userId === tr.id)?.shift as ShiftKind | undefined) ?? null,
      })),
    })),
    traders: traders.map((tr) => ({ id: String(tr.id), name: tr.name })),
    canEdit: await canPost(user),
  }
}

/** Upis smjena za jedan dan. Trgovci koji nisu u popisu gube smjenu za taj dan. */
export async function saveShifts(user: SessionUser, date: string, assignments: { userId: string; shift: ShiftKind | '' }[], today: string) {
  if (!(await canPost(user))) throw new Error('Smjene uređuju administrator, uprava i voditelj salona.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Neispravan datum.')
  const traderIds = new Set(
    (await db.select({ id: t.users.id }).from(t.users).where(and(eq(t.users.active, true), eq(t.users.role, 'trgovac')))).map((r) => String(r.id)),
  )
  await db.delete(t.shifts).where(eq(t.shifts.date, date))
  const values = assignments
    .filter((a) => traderIds.has(a.userId) && (a.shift === 'otvaranje' || a.shift === 'zatvaranje'))
    .map((a) => ({ date, userId: Number(a.userId), shift: a.shift }))
  if (values.length) await db.insert(t.shifts).values(values)
  if (date === today) await ensureDailyTasks(today)
  return { count: values.length }
}

/**
 * Dnevne liste i podsjetnici (provjera pri svakom učitavanju, bez dvostrukih zadataka):
 * - trgovac na smjeni „otvaranje” dobija listu za otvaranje, na „zatvaranje” listu za zatvaranje;
 * - prodavaču koji ima dostavu sutra podsjetnik da nazove kupca.
 */
export async function ensureDailyTasks(today: string) {
  const onShift = await db.select({ userId: t.shifts.userId, shift: t.shifts.shift }).from(t.shifts).where(eq(t.shifts.date, today))
  const due = await db
    .select({ title: t.tasks.title, assigneeId: t.tasks.assigneeId })
    .from(t.tasks)
    .where(and(eq(t.tasks.dueDate, today), like(t.tasks.createdByName, 'ARDOR (automatski)%')))
  const have = new Set(due.map((d) => `${d.assigneeId}|${d.title}`))

  const lists = onShift
    .filter((s) => s.shift === 'otvaranje' || s.shift === 'zatvaranje')
    .map((s) => ({
      title: listTitle(s.shift as ShiftKind, today),
      description:
        s.shift === 'otvaranje'
          ? 'Prije otvaranja provjerite: da su izlozi čisti i osvijetljeni; da je red u salonu (namještaj na mjestu, bez prašine); da je blagajna spremna i da imate sitan novac; da su cjenici i QR naljepnice na mjestu. Kad završite, označite zadatak kao završen.'
          : 'Na kraju dana: zatvorite sve otvorene prodaje ili ih ostavite s napomenom; upišite uplate u blagajnu i zatvorite dnevni pazar; provjerite da su izlozi i red u salonu u redu; zaključajte salon. U napomenu upišite ako je nešto ostalo otvoreno.',
      assigneeId: s.userId,
      createdByName: 'ARDOR (automatski)',
      dueDate: today,
      priority: 'normalno',
    }))

  const tomorrow = addDaysIso(today, 1)
  const deliveries = await db
    .select({
      number: t.orders.number,
      employeeId: t.orders.employeeId,
      customer: t.customers.name,
      phone: t.customers.phone,
      slot: t.deliveries.slot,
      address: t.deliveries.address,
      city: t.deliveries.city,
      assembly: t.deliveries.assembly,
    })
    .from(t.deliveries)
    .innerJoin(t.orders, eq(t.orders.id, t.deliveries.orderId))
    .innerJoin(t.customers, eq(t.customers.id, t.orders.customerId))
    .where(and(eq(t.deliveries.date, tomorrow), ne(t.deliveries.status, 'dostavljeno'), ne(t.deliveries.status, 'otkazana')))
  const users = await db.select({ id: t.users.id, employeeId: t.users.employeeId }).from(t.users).where(eq(t.users.active, true))
  const userOf = new Map(users.filter((u) => u.employeeId).map((u) => [u.employeeId, u.id]))
  const reminders = deliveries.flatMap((d) => {
    const assigneeId = userOf.get(d.employeeId)
    if (!assigneeId) return []
    return [
      {
        title: `Podsjetite kupca: dostava sutra (${d.number})`,
        description: `Dostava sutra, ${dotDate(tomorrow)}, u ${d.slot} h: ${d.address}, ${d.city}${d.assembly ? ' · uz montažu' : ''}. Kupac: ${d.customer}${d.phone ? ` (${d.phone})` : ''}. Javite kupcu termin i potvrdite da je spreman.`,
        assigneeId,
        createdByName: 'ARDOR (automatski)',
        dueDate: today,
        priority: 'hitno',
      },
    ]
  })

  const rows = [...lists, ...reminders].filter((r) => !have.has(`${r.assigneeId}|${r.title}`))
  if (rows.length) await db.insert(t.tasks).values(rows)
  return rows.length
}
