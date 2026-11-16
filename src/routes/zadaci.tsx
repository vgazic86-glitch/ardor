import { createFileRoute } from '@tanstack/react-router'
import { ListChecks, Plus } from 'lucide-react'
import { useState } from 'react'
import { sortTasks, TaskDialog, TaskRow, useTasks } from '../components/Tasks'
import { Button, Card, Chip, EmptyState, PageHeader, Segmented, Stat } from '../components/ui'
import { useStore } from '../lib/store'
import type { Task } from '../lib/types'
import { deleteTaskFn, saveTaskFn, setTaskStatusFn } from '../server/api'

export const Route = createFileRoute('/zadaci')({ component: TasksPage })

type View = 'moji' | 'zadani' | 'svi'

function TasksPage() {
  const { full, today } = useStore()
  const t = useTasks()
  const [view, setView] = useState<View>('moji')
  const [showDone, setShowDone] = useState(false)
  const [edit, setEdit] = useState<Task | 'new' | null>(null)
  const data = t.data
  const me = data?.me ?? ''
  const canAssign = !!data?.assignees.some((a) => a.id !== me)
  const all = data?.tasks ?? []
  const base =
    view === 'moji' ? all.filter((x) => x.assigneeId === me) : view === 'zadani' ? all.filter((x) => x.createdById === me && x.assigneeId !== me) : all
  const list = sortTasks(base.filter((x) => showDone || x.status !== 'zavrsen'))
  const openMine = all.filter((x) => x.assigneeId === me && x.status !== 'zavrsen')
  const given = all.filter((x) => x.createdById === me && x.assigneeId !== me)
  const late = all.filter((x) => x.status !== 'zavrsen' && x.dueDate && x.dueDate < today && (x.assigneeId === me || x.createdById === me || full))
  const canManage = (x: Task) => full || x.createdById === me

  const views: { value: View; label: string }[] = [{ value: 'moji', label: `Moji (${openMine.length})` }]
  if (canAssign) views.push({ value: 'zadani', label: `Zadao/la sam (${given.filter((x) => x.status !== 'zavrsen').length})` })
  if (full) views.push({ value: 'svi', label: 'Svi zadaci' })

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Tim"
        title="Zadaci"
        description={
          canAssign
            ? full
              ? 'Zadajte posao trgovcima, voditelju salona i ostalima. Svako vidi svoje zadatke na Pregledu čim se prijavi.'
              : 'Zadajte posao trgovcima. Svako vidi svoje zadatke na Pregledu čim se prijavi.'
            : 'Zadaci koje ste dobili od voditelja i uprave. Kad završite, označite ih — zadavač to odmah vidi.'
        }
        actions={
          canAssign && (
            <Button variant="copper" onClick={() => setEdit('new')}>
              <Plus className="size-4" /> Novi zadatak
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat tone="accent" icon={ListChecks} label="Moji otvoreni zadaci" value={String(openMine.length)} hint={`${openMine.filter((x) => x.priority === 'hitno').length} hitnih`} />
        {canAssign && <Stat label="Zadao/la sam" value={String(given.length)} hint={`${given.filter((x) => x.status === 'zavrsen').length} završeno`} />}
        <Stat tone={late.length ? 'warn' : 'good'} label="Kasni" value={String(late.length)} hint="otvoreni s prošlim rokom" />
      </div>

      {t.error && !edit && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{t.error}</p>}

      <Card flush>
        <div className="flex flex-wrap items-center gap-3 border-b border-walnut-200/70 px-5 py-3">
          {views.length > 1 && <Segmented value={view} onChange={setView} options={views} />}
          <Chip active={showDone} onClick={() => setShowDone((v) => !v)}>
            Prikaži i završene
          </Chip>
        </div>
        {!data ? (
          <div className="px-5 py-10 text-center text-sm text-walnut-500">Učitavam…</div>
        ) : list.length === 0 ? (
          <EmptyState icon={ListChecks} title={view === 'moji' ? 'Nema otvorenih zadataka' : 'Nema zadataka'}>
            {view === 'moji' ? 'Sve je urađeno. Novi zadaci pojavit će se ovdje i na Pregledu.' : 'Kliknite „Novi zadatak” da nekome zadate posao.'}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-walnut-100">
            {list.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                me={me}
                canManage={canManage(task)}
                busy={t.busy}
                showAssignee={view !== 'moji'}
                onEdit={canManage(task) ? () => setEdit(task) : undefined}
                onStatus={(status, note = '') =>
                  t.act(() => setTaskStatusFn({ data: { id: task.id, status, note } }), status === 'zavrsen' ? 'Zadatak je završen.' : undefined)
                }
              />
            ))}
          </ul>
        )}
      </Card>

      {edit && data && (
        <TaskDialog
          task={edit === 'new' ? null : edit}
          data={data}
          busy={t.busy}
          error={t.error}
          onClose={() => {
            setEdit(null)
            t.clearError()
          }}
          onSave={async (input) => {
            const r = await t.act(() => saveTaskFn({ data: input }), input.id ? 'Zadatak je spremljen.' : input.assigneeIds.length > 1 ? `Zadano je ${input.assigneeIds.length} osoba.` : 'Zadatak je zadan.')
            if (r) setEdit(null)
          }}
          onDelete={async (id) => {
            const r = await t.act(() => deleteTaskFn({ data: { id } }), 'Zadatak je obrisan.')
            if (r) setEdit(null)
          }}
        />
      )}
    </div>
  )
}
