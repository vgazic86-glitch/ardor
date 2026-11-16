/** Radni zadaci. Administrator i uprava zadaju svima; voditelj salona zadaje trgovcima. */
import { and, desc, eq, gte, like, lte, ne, or } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'
import type { Task, TaskAssignee, TaskData, TaskPriority, TaskStatus } from '../lib/types'
import { isFull, type SessionUser } from './auth'

const ROLE_NAME: Record<string, string> = { admin: 'Administrator', uprava: 'Uprava', voditelj: 'Voditelj salona', operativa: 'Operativa', trgovac: 'Trgovac' }

async function isSalonManager(user: SessionUser) {
  if (user.role === 'voditelj') return true
  if (!user.employeeId) return false
  const [e] = await db.select({ role: t.employees.role }).from(t.employees).where(eq(t.employees.id, Number(user.employeeId)))
  return e?.role === 'Voditelj salona'
}

/** Kome korisnik smije zadavati zadatke. */
async function assigneesFor(user: SessionUser): Promise<TaskAssignee[]> {
  const full = isFull(user.role)
  const manager = !full && (await isSalonManager(user))
  if (!full && !manager) return []
  const rows = await db
    .select({ id: t.users.id, name: t.users.name, role: t.users.role, empRole: t.employees.role })
    .from(t.users)
    .leftJoin(t.employees, eq(t.users.employeeId, t.employees.id))
    .where(eq(t.users.active, true))
    .orderBy(t.users.name)
  return rows
    .filter((r) => (full ? true : r.role === 'trgovac'))
    .map((r) => ({
      id: String(r.id),
      name: r.name,
      role: r.empRole === 'Voditelj salona' || r.role === 'voditelj' ? 'Voditelj salona' : (ROLE_NAME[r.role] ?? r.role),
    }))
}

export async function listTasks(user: SessionUser): Promise<TaskData> {
  const me = Number(user.id)
  const where = isFull(user.role) ? undefined : or(eq(t.tasks.assigneeId, me), eq(t.tasks.createdById, me))
  const rows = await db
    .select({ task: t.tasks, assigneeName: t.users.name })
    .from(t.tasks)
    .innerJoin(t.users, eq(t.tasks.assigneeId, t.users.id))
    .where(where)
    .orderBy(desc(t.tasks.createdAt))
  const tasks: Task[] = rows.map(({ task, assigneeName }) => ({
    id: String(task.id),
    title: task.title,
    description: task.description,
    assigneeId: String(task.assigneeId),
    assigneeName,
    createdById: task.createdById ? String(task.createdById) : null,
    createdByName: task.createdByName,
    dueDate: task.dueDate,
    priority: task.priority as TaskPriority,
    status: task.status as TaskStatus,
    doneNote: task.doneNote,
    doneAt: task.doneAt ? task.doneAt.toISOString() : null,
    createdAt: (task.createdAt ?? new Date()).toISOString(),
  }))
  return { tasks, assignees: await assigneesFor(user), me: user.id }
}

/** Broj otvorenih zadataka dodijeljenih korisniku (za oznaku u izborniku). */
export async function openTaskCount(user: SessionUser) {
  const rows = await db
    .select({ id: t.tasks.id })
    .from(t.tasks)
    .where(and(eq(t.tasks.assigneeId, Number(user.id)), ne(t.tasks.status, 'zavrsen')))
  return rows.length
}

export interface TaskInput {
  id: string | null
  title: string
  description: string
  assigneeIds: string[]
  dueDate: string | null
  priority: TaskPriority
}

async function loadTask(id: string) {
  const [task] = await db.select().from(t.tasks).where(eq(t.tasks.id, Number(id)))
  if (!task) throw new Error('Zadatak ne postoji.')
  return task
}

const canManage = (user: SessionUser, task: { createdById: number | null }) =>
  isFull(user.role) || task.createdById === Number(user.id)

export async function saveTask(user: SessionUser, input: TaskInput) {
  const title = input.title.trim()
  if (!title) throw new Error('Upišite šta treba uraditi.')
  const allowed = new Set((await assigneesFor(user)).map((a) => a.id))
  if (!allowed.size) throw new Error('Nemate pravo zadavati zadatke.')
  const ids = [...new Set(input.assigneeIds)].filter((id) => allowed.has(id))
  if (!ids.length) throw new Error('Odaberite kome je zadatak.')
  const values = {
    title,
    description: input.description.trim(),
    dueDate: input.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(input.dueDate) ? input.dueDate : null,
    priority: input.priority === 'hitno' ? 'hitno' : 'normalno',
  }
  if (input.id) {
    const task = await loadTask(input.id)
    if (!canManage(user, task)) throw new Error('Ovaj zadatak može mijenjati samo onaj ko ga je zadao.')
    await db.update(t.tasks).set({ ...values, assigneeId: Number(ids[0]) }).where(eq(t.tasks.id, task.id))
    return { count: 1 }
  }
  // Jedan zadatak za više osoba = po jedan zapis za svakoga (svako ga zatvara za sebe).
  await db.insert(t.tasks).values(
    ids.map((id) => ({ ...values, assigneeId: Number(id), createdById: Number(user.id), createdByName: user.name })),
  )
  return { count: ids.length }
}

export async function setTaskStatus(user: SessionUser, id: string, status: TaskStatus, note: string) {
  const task = await loadTask(id)
  const mine = task.assigneeId === Number(user.id)
  if (!mine && !canManage(user, task)) throw new Error('Ovo nije vaš zadatak.')
  if (!['otvoren', 'u_toku', 'zavrsen'].includes(status)) throw new Error('Nepoznat status.')
  await db
    .update(t.tasks)
    .set({
      status,
      doneAt: status === 'zavrsen' ? new Date() : null,
      doneNote: status === 'zavrsen' ? note.trim() : task.doneNote,
    })
    .where(eq(t.tasks.id, task.id))
}

export async function deleteTask(user: SessionUser, id: string) {
  const task = await loadTask(id)
  if (!canManage(user, task)) throw new Error('Zadatak može obrisati samo onaj ko ga je zadao.')
  await db.delete(t.tasks).where(eq(t.tasks.id, task.id))
}

/**
 * Ponude starije od 7 dana (do 30 dana) koje nisu prešle u narudžbu: trgovac koji je dao ponudu
 * automatski dobija zadatak da nazove kupca. Pokreće se najviše jednom na sat.
 */
export async function ensureOfferFollowups(today: string) {
  const { meta, setMeta } = await import('./hr')
  const last = Number((await meta('ponude_followup')) || 0)
  if (Date.now() - last < 3_600_000) return 0
  await setMeta('ponude_followup', String(Date.now()))
  const day = (n: number) => {
    const d = new Date(`${today}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() - n)
    return d.toISOString().slice(0, 10)
  }
  const offers = await db
    .select({ number: t.orders.number, date: t.orders.date, employeeId: t.orders.employeeId, customer: t.customers.name, phone: t.customers.phone })
    .from(t.orders)
    .innerJoin(t.customers, eq(t.customers.id, t.orders.customerId))
    .where(and(eq(t.orders.status, 'ponuda'), lte(t.orders.date, day(7)), gte(t.orders.date, day(30))))
  if (!offers.length) return 0
  const users = await db.select({ id: t.users.id, employeeId: t.users.employeeId }).from(t.users).where(eq(t.users.active, true))
  const userOf = new Map(users.filter((u) => u.employeeId).map((u) => [u.employeeId, u.id]))
  let made = 0
  for (const o of offers) {
    const assigneeId = userOf.get(o.employeeId)
    if (!assigneeId) continue
    const [exists] = await db.select({ id: t.tasks.id }).from(t.tasks).where(like(t.tasks.title, `%${o.number}%`)).limit(1)
    if (exists) continue
    await db.insert(t.tasks).values({
      title: `Nazvati kupca: ponuda ${o.number} (${o.customer})`,
      description: `Ponuda od ${o.date.split('-').reverse().join('.')}. još nije prešla u narudžbu. Nazovite kupca${o.phone ? ` (${o.phone})` : ''}, pitajte ima li pitanja i ponudite pomoć ili alternativu. Ako kupac odustaje, otkažite ponudu.`,
      assigneeId,
      createdByName: 'ARDOR (automatski)',
      dueDate: today,
      priority: 'normalno',
    })
    made++
  }
  return made
}
