import { Link, useRouter } from '@tanstack/react-router'
import { AlertTriangle, CalendarClock, Check, CheckCircle2, ListChecks, Pencil, Play, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { date } from '../lib/format'
import { useRemote } from '../lib/remote'
import { useStore } from '../lib/store'
import type { Task, TaskData, TaskPriority, TaskStatus } from '../lib/types'
import { listTasksFn, saveTaskFn, setTaskStatusFn } from '../server/api'
import { Modal } from './Modal'
import { Badge, Button, Card, Field, inputCls } from './ui'

/** Zadaci + radnje koje osvježe i oznaku u izborniku. */
export function useTasks() {
  const router = useRouter()
  const remote = useRemote<TaskData>(() => listTasksFn(), [])
  const act = async <R,>(fn: () => Promise<R>, ok?: string) => {
    const r = await remote.run(fn, ok)
    if (r) await router.invalidate()
    return r
  }
  return { ...remote, act }
}

const open = (t: Task) => t.status !== 'zavrsen'

/** Redoslijed: hitno, pa po roku (bez roka na kraju), pa najnoviji. */
export function sortTasks(list: Task[]) {
  return [...list].sort(
    (a, b) =>
      Number(open(b)) - Number(open(a)) ||
      Number(b.priority === 'hitno') - Number(a.priority === 'hitno') ||
      (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') ||
      b.createdAt.localeCompare(a.createdAt),
  )
}

function DueBadge({ task, today }: { task: Task; today: string }) {
  if (!task.dueDate) return null
  const late = open(task) && task.dueDate < today
  const isToday = task.dueDate === today
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${late ? 'font-semibold text-rose-700' : isToday ? 'font-semibold text-copper-700' : 'text-walnut-500'}`}>
      <CalendarClock className="size-3.5" />
      {late ? 'kasni · ' : isToday ? 'danas · ' : 'rok '}
      {date(task.dueDate)}
    </span>
  )
}

export function TaskRow({
  task,
  me,
  canManage,
  busy,
  onStatus,
  onEdit,
  showAssignee,
}: {
  task: Task
  me: string
  canManage: boolean
  busy: boolean
  onStatus: (status: TaskStatus, note?: string) => void
  onEdit?: () => void
  showAssignee: boolean
}) {
  const { today } = useStore()
  const [expanded, setExpanded] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [note, setNote] = useState('')
  const mine = task.assigneeId === me
  const done = task.status === 'zavrsen'
  return (
    <li className={`px-5 py-3.5 ${done ? 'bg-walnut-50/50' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-walnut-300 text-transparent hover:border-emerald-600 hover:text-emerald-600'}`}
          aria-label={done ? 'Vrati kao otvoren' : 'Označi kao završen'}
          disabled={busy || (!mine && !canManage)}
          onClick={() => (done ? onStatus('otvoren') : setFinishing(true))}
        >
          <Check className="size-3.5" />
        </button>
        <div className="min-w-0 flex-1">
          <button className="text-left" onClick={() => setExpanded((e) => !e)}>
            <span className={`font-semibold ${done ? 'text-walnut-500 line-through' : ''}`}>{task.title}</span>
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-walnut-500">
            {task.priority === 'hitno' && !done && (
              <Badge tone="bad">
                <AlertTriangle className="mr-1 inline size-3" /> Hitno
              </Badge>
            )}
            {task.status === 'u_toku' && <Badge tone="info">U toku</Badge>}
            <DueBadge task={task} today={today} />
            {showAssignee && <span>za: <b className="font-medium text-walnut-700">{task.assigneeName}</b></span>}
            <span>zadao/la: {task.createdByName || '—'}</span>
            {done && task.doneAt && <span>završeno {date(task.doneAt.slice(0, 10))}</span>}
          </div>
          {(expanded || task.description || task.doneNote) && (
            <div className="mt-1.5 space-y-1 text-sm">
              {task.description && <p className="whitespace-pre-line text-walnut-700">{task.description}</p>}
              {task.doneNote && (
                <p className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-800">
                  <b>Odgovor:</b> {task.doneNote}
                </p>
              )}
            </div>
          )}
          {finishing && (
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                className={`${inputCls} flex-1 py-1.5`}
                placeholder="Kratka napomena (neobavezno), npr. „urađeno, javio kupcu”"
                value={note}
                autoFocus
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onStatus('zavrsen', note)}
              />
              <Button size="sm" variant="copper" disabled={busy} onClick={() => onStatus('zavrsen', note)}>
                <CheckCircle2 className="size-3.5" /> Završeno
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setFinishing(false)}>
                Odustani
              </Button>
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          {mine && task.status === 'otvoren' && !finishing && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onStatus('u_toku')}>
              <Play className="size-3.5" /> Počinjem
            </Button>
          )}
          {done && (mine || canManage) && (
            <button className="rounded p-1.5 text-walnut-400 hover:bg-walnut-100" aria-label="Vrati kao otvoren" onClick={() => onStatus('otvoren')}>
              <RotateCcw className="size-3.5" />
            </button>
          )}
          {canManage && onEdit && (
            <button className="rounded p-1.5 text-walnut-400 hover:bg-walnut-100 hover:text-walnut-800" aria-label="Uredi zadatak" onClick={onEdit}>
              <Pencil className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

export function TaskDialog({
  task,
  data,
  onClose,
  onSave,
  onDelete,
  busy,
  error,
}: {
  task: Task | null
  data: TaskData
  onClose: () => void
  onSave: (input: { id: string | null; title: string; description: string; assigneeIds: string[]; dueDate: string | null; priority: TaskPriority }) => void
  onDelete?: (id: string) => void
  busy: boolean
  error: string | null
}) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task ? [task.assigneeId] : [])
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'normalno')
  const [confirm, setConfirm] = useState(false)
  const toggle = (id: string) =>
    setAssigneeIds((ids) => (task ? [id] : ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  const others = data.assignees.filter((a) => a.id !== data.me)
  return (
    <Modal
      title={task ? 'Uredi zadatak' : 'Novi zadatak'}
      subtitle={task ? undefined : 'Možete odabrati više osoba — svako dobija svoj zadatak i zatvara ga za sebe.'}
      onClose={onClose}
      footer={
        <>
          {error && <span className="mr-auto text-sm text-rose-700">{error}</span>}
          {task && onDelete &&
            (confirm ? (
              <Button variant="danger" disabled={busy} onClick={() => onDelete(task.id)}>
                Potvrdi brisanje
              </Button>
            ) : (
              <Button variant="danger" onClick={() => setConfirm(true)}>
                <Trash2 className="size-4" /> Obriši
              </Button>
            ))}
          <Button variant="ghost" onClick={onClose}>
            Odustani
          </Button>
          <Button
            variant="copper"
            disabled={busy || !title.trim() || !assigneeIds.length}
            onClick={() => onSave({ id: task?.id ?? null, title, description, assigneeIds, dueDate: dueDate || null, priority })}
          >
            {task ? 'Spremi' : assigneeIds.length > 1 ? `Zadaj (${assigneeIds.length})` : 'Zadaj'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Zadatak">
          <input className={inputCls} autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="npr. Nazvati kupca Marić zbog termina dostave" />
        </Field>
        <Field label="Opis (neobavezno)">
          <textarea className={`${inputCls} min-h-20`} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rok">
            <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Prioritet">
            <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              <option value="normalno">Normalno</option>
              <option value="hitno">Hitno</option>
            </select>
          </Field>
        </div>
        <div>
          <div className="mb-1.5 text-xs font-semibold text-walnut-700">Kome</div>
          <div className="flex flex-wrap gap-2">
            {others.map((a) => {
              const on = assigneeIds.includes(a.id)
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggle(a.id)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${on ? 'border-copper-500 bg-copper-50 ring-1 ring-copper-500' : 'border-walnut-200 bg-white hover:border-walnut-300'}`}
                >
                  <span className="block font-semibold">{a.name}</span>
                  <span className="block text-xs text-walnut-500">{a.role}</span>
                </button>
              )
            })}
          </div>
          {!task && others.length > 1 && (
            <button type="button" className="mt-2 text-xs font-semibold text-copper-700 hover:underline" onClick={() => setAssigneeIds(others.map((a) => a.id))}>
              Odaberi sve
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

/** Kartica na Pregledu: moji otvoreni zadaci. */
export function MyTasksCard() {
  const t = useTasks()
  const [creating, setCreating] = useState(false)
  if (!t.data) return null
  const me = t.data.me
  const mine = sortTasks(t.data.tasks.filter((x) => x.assigneeId === me && open(x)))
  const given = t.data.tasks.filter((x) => x.createdById === me && x.assigneeId !== me)
  const givenOpen = given.filter(open).length
  const canAssign = t.data.assignees.some((a) => a.id !== me)
  if (!mine.length && !canAssign) return null
  return (
    <Card
      flush
      className="mb-6"
      title={
        <span className="flex items-center gap-2">
          <ListChecks className="size-5 text-copper-600" /> Moji zadaci
          {mine.length > 0 && <span className="rounded-full bg-copper-500 px-2 py-0.5 text-xs font-bold text-white">{mine.length}</span>}
        </span>
      }
      subtitle={canAssign ? `Zadali ste ${given.length} zadataka · ${givenOpen} još otvoreno` : undefined}
      action={
        <div className="flex gap-2">
          {canAssign && (
            <Button size="sm" variant="copper" onClick={() => setCreating(true)}>
              <Plus className="size-3.5" /> Novi zadatak
            </Button>
          )}
          <Link to="/zadaci" className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-copper-700 hover:bg-copper-50">
            Svi zadaci
          </Link>
        </div>
      }
    >
      {mine.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-walnut-500">Nemate otvorenih zadataka.</p>
      ) : (
        <ul className="divide-y divide-walnut-100 border-t border-walnut-100">
          {mine.slice(0, 6).map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              me={me}
              canManage={false}
              busy={t.busy}
              showAssignee={false}
              onStatus={(status, note = '') =>
                t.act(() => setTaskStatusFn({ data: { id: task.id, status, note } }), status === 'zavrsen' ? 'Zadatak je završen.' : undefined)
              }
            />
          ))}
          {mine.length > 6 && (
            <li className="px-5 py-2.5 text-sm">
              <Link to="/zadaci" className="font-semibold text-copper-700 hover:underline">
                Još {mine.length - 6} zadataka…
              </Link>
            </li>
          )}
        </ul>
      )}
      {creating && (
        <TaskDialog
          task={null}
          data={t.data}
          busy={t.busy}
          error={t.error}
          onClose={() => {
            setCreating(false)
            t.clearError()
          }}
          onSave={async (input) => {
            const r = await t.act(() => saveTaskFn({ data: input }), 'Zadatak je zadan.')
            if (r) {
              setCreating(false)
            }
          }}
        />
      )}
    </Card>
  )
}

