import { createFileRoute } from '@tanstack/react-router'
import { CalendarDays, Hammer, Search } from 'lucide-react'
import { useState } from 'react'
import { OrderDrawer } from '../components/OrderDrawer'
import { Badge, Card, Chip, EmptyState, Field, inputCls, PageHeader, Stat } from '../components/ui'
import { canSee } from '../lib/access'
import { date, orderStatusLabel } from '../lib/format'
import { isLate, WORK_STATUSES, WORK_STATUS_LABEL, type WorkStatus } from '../lib/pomjeri'
import { useRemote } from '../lib/remote'
import { useStore } from '../lib/store'
import type { OrderStatus } from '../lib/types'
import { listWorkOrdersFn, updateWorkOrderFn } from '../server/api'
import type { WorkOrderRow } from '../server/radionica'

export const Route = createFileRoute('/radni-nalozi')({ component: WorkOrdersPage })

const tone: Record<WorkStatus, string> = { novi: 'neutral', krojenje: 'info', sklapanje: 'violet', gotovo: 'good' }

type Run = <R>(fn: () => Promise<R>, ok?: string) => Promise<R | null>

function WorkOrdersPage() {
  const r = useRemote(() => listWorkOrdersFn(), [])
  const { user } = useStore()
  const [filter, setFilter] = useState<'otvoreni' | 'gotovi' | 'svi'>('otvoreni')
  const [q, setQ] = useState('')
  const [openOrder, setOpenOrder] = useState<string | null>(null)
  const rows = r.data?.rows ?? []
  const today = r.data?.today ?? ''
  const live = rows.filter((w) => w.orderStatus !== 'otkazana')
  const open = live.filter((w) => w.status !== 'gotovo')
  const s = q.trim().toLowerCase()
  const shown = rows.filter(
    (w) =>
      (filter === 'svi' || (filter === 'gotovi' ? w.status === 'gotovo' : w.status !== 'gotovo' && w.orderStatus !== 'otkazana')) &&
      (!s || `${w.number} ${w.orderNumber} ${w.customerName} ${w.name} ${w.description}`.toLowerCase().includes(s)),
  )
  // Otvoreni: najprije oni s najranijim rokom (bez roka na kraju).
  if (filter === 'otvoreni') shown.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || a.number.localeCompare(b.number))
  const canOpenOrder = canSee(user, 'narudzbe')

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Radionica"
        title="Radni nalozi"
        description="Namještaj po mjeri: nalog nastaje sam kad trgovac potvrdi prodaju sa stavkom „Po mjeri”. Radionica mijenja status; kad je nalog gotov, prodavač dobije obavijest i prodaja može biti „Spremna”."
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Hammer} label="Otvoreni nalozi" value={String(open.length)} hint="nisu gotovi" />
        <Stat label="Krojenje kod partnera" value={String(open.filter((w) => w.status === 'krojenje').length)} />
        <Stat label="Sklapanje u radionici" value={String(open.filter((w) => w.status === 'sklapanje').length)} />
        <Stat tone={open.some((w) => isLate(w, today)) ? 'warn' : 'good'} label="Kasne" value={String(open.filter((w) => isLate(w, today)).length)} hint="prošao rok" />
      </div>
      {r.error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{r.error}</p>}
      <Card flush>
        <div className="flex flex-wrap items-center gap-2 border-b border-walnut-200/70 px-5 py-3">
          <Chip active={filter === 'otvoreni'} onClick={() => setFilter('otvoreni')}>
            Otvoreni
          </Chip>
          <Chip active={filter === 'gotovi'} onClick={() => setFilter('gotovi')}>
            Gotovi
          </Chip>
          <Chip active={filter === 'svi'} onClick={() => setFilter('svi')}>
            Svi
          </Chip>
          <label className="relative ml-auto min-w-56">
            <Search className="absolute left-2.5 top-2.5 size-4 text-walnut-400" />
            <input className={`${inputCls} pl-8`} placeholder="Nalog, prodaja, kupac…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
        {!r.data ? (
          <div className="py-10 text-center text-sm text-walnut-500">Učitavam…</div>
        ) : shown.length === 0 ? (
          <EmptyState icon={Hammer} title={rows.length ? 'Nema naloga za ovaj prikaz' : 'Još nema radnih naloga'}>
            U „Nova prodaja” kliknite „Po mjeri”, upišite naziv, cijenu iz Palette CAD-a i dodajte sliku. Kad je prodaja potvrđena, nalog se pojavi ovdje.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-walnut-100">
            {shown.map((w) => (
              <WorkRow key={w.id} w={w} today={today} canEdit={!!r.data?.canEdit} busy={r.busy} run={r.run} onOpenOrder={canOpenOrder ? () => setOpenOrder(w.orderId) : undefined} />
            ))}
          </ul>
        )}
      </Card>
      {openOrder && <OrderDrawer orderId={openOrder} onClose={() => setOpenOrder(null)} />}
    </div>
  )
}

function WorkRow({ w, today, canEdit, busy, run, onOpenOrder }: { w: WorkOrderRow; today: string; canEdit: boolean; busy: boolean; run: Run; onOpenOrder?: () => void }) {
  const [note, setNote] = useState(w.note)
  const late = isLate(w, today)
  const cancelled = w.orderStatus === 'otkazana'
  const save = (patch: { status?: WorkStatus; dueDate?: string | null; note?: string }, ok: string) =>
    run(() => updateWorkOrderFn({ data: { id: w.id, number: w.number, ...patch } }), ok)
  return (
    <li className={`grid gap-4 px-5 py-4 lg:grid-cols-[180px_1fr_300px] ${cancelled ? 'opacity-60' : ''}`}>
      {w.thumbId ? (
        <a href={`/api/slike/${w.imageId ?? w.thumbId}`} target="_blank" rel="noopener" title="Otvori sliku u punoj veličini">
          <img src={`/api/slike/${w.imageId ?? w.thumbId}`} alt={w.name} className="aspect-[4/3] w-full rounded-lg object-cover ring-1 ring-walnut-200" loading="lazy" />
        </a>
      ) : (
        <div className="grid aspect-[4/3] w-full place-items-center rounded-lg bg-walnut-100 text-xs text-walnut-500">bez slike</div>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{w.number}</span>
          <Badge tone={tone[w.status]}>{WORK_STATUS_LABEL[w.status]}</Badge>
          {late && <Badge tone="bad">Kasni</Badge>}
          {cancelled && <Badge tone="bad">Prodaja otkazana</Badge>}
        </div>
        <div className="mt-1 font-display text-lg font-semibold">
          {w.name}
          {w.qty > 1 ? ` × ${w.qty}` : ''}
        </div>
        {w.description && <p className="mt-0.5 whitespace-pre-wrap text-sm text-walnut-700">{w.description}</p>}
        <div className="mt-2 text-xs text-walnut-500">
          Kupac <b className="text-walnut-800">{w.customerName}</b>
          {w.customerCity ? `, ${w.customerCity}` : ''} · prodaja{' '}
          {onOpenOrder ? (
            <button type="button" className="font-semibold text-copper-700 hover:underline" onClick={onOpenOrder}>
              {w.orderNumber}
            </button>
          ) : (
            w.orderNumber
          )}{' '}
          ({orderStatusLabel[w.orderStatus as OrderStatus] ?? w.orderStatus}) · {w.salesperson}
          {w.deliveryDate && (
            <span className="ml-1 inline-flex items-center gap-1 font-semibold text-sky-800">
              <CalendarDays className="size-3" /> dostava {date(w.deliveryDate)}
            </span>
          )}
        </div>
        {w.updatedBy && (
          <div className="mt-1 text-xs text-walnut-400">
            Zadnja izmjena: {w.updatedBy}, {date(w.updatedAt.slice(0, 10))}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {canEdit && !cancelled ? (
          <>
            <div className="grid grid-cols-2 gap-1.5" role="group" aria-label={`Status naloga ${w.number}`}>
              {WORK_STATUSES.map((st) => (
                <button
                  key={st}
                  type="button"
                  disabled={busy || st === w.status}
                  onClick={() => save({ status: st }, `${w.number}: ${WORK_STATUS_LABEL[st].toLowerCase()}.`)}
                  className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                    st === w.status
                      ? st === 'gotovo'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-walnut-900 text-linen'
                      : 'border border-walnut-200 bg-white text-walnut-700 hover:border-copper-300'
                  }`}
                >
                  {WORK_STATUS_LABEL[st]}
                </button>
              ))}
            </div>
            <Field label="Rok izrade">
              <input type="date" className={inputCls} value={w.dueDate ?? ''} onChange={(e) => save({ dueDate: e.target.value || null }, 'Rok je spremljen.')} />
            </Field>
            <Field label="Bilješka radionice">
              <textarea className={inputCls} rows={2} value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== w.note && save({ note }, 'Bilješka je spremljena.')} placeholder="npr. iverica naručena kod partnera 20. 11., stiže u srijedu" />
            </Field>
          </>
        ) : (
          <div className="rounded-lg bg-walnut-50 px-3 py-2 text-sm text-walnut-700">
            {w.dueDate ? <>Rok izrade: <b>{date(w.dueDate)}</b></> : 'Rok izrade još nije upisan.'}
            {w.note && <p className="mt-1 whitespace-pre-wrap text-xs">{w.note}</p>}
          </div>
        )}
      </div>
    </li>
  )
}
