import { createFileRoute } from '@tanstack/react-router'
import { CalendarDays, ChevronDown, ChevronUp, Hammer, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { OrderDrawer } from '../components/OrderDrawer'
import { Badge, Button, Card, Chip, EmptyState, Field, inputCls, PageHeader, Select, Stat } from '../components/ui'
import { canSee } from '../lib/access'
import { date, money, money2, orderStatusLabel, parseAmount } from '../lib/format'
import { COST_KIND_LABEL, costAmount, isLate, WORK_STATUSES, WORK_STATUS_LABEL, type CostKind, type WorkStatus } from '../lib/pomjeri'
import { useRemote } from '../lib/remote'
import { useStore } from '../lib/store'
import type { OrderStatus } from '../lib/types'
import { addWorkCostFn, deleteWorkCostFn, listWorkOrdersFn, setHourlyRateFn, updateWorkOrderFn } from '../server/api'
import type { WorkOrderRow } from '../server/radionica'

export const Route = createFileRoute('/radni-nalozi')({ component: WorkOrdersPage })

const tone: Record<WorkStatus, string> = { novi: 'neutral', krojenje: 'info', sklapanje: 'violet', gotovo: 'good' }

type Run = <R>(fn: () => Promise<R>, ok?: string) => Promise<R | null>
type Data = Awaited<ReturnType<typeof listWorkOrdersFn>>

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
      {r.data?.seesMargin && <RateBar rate={r.data.rate} done={live.filter((w) => w.status === 'gotovo')} busy={r.busy} run={r.run} />}
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
              <WorkRow key={w.id} w={w} data={r.data!} today={today} canEdit={!!r.data?.canEdit} busy={r.busy} run={r.run} onOpenOrder={canOpenOrder ? () => setOpenOrder(w.orderId) : undefined} />
            ))}
          </ul>
        )}
      </Card>
      {openOrder && <OrderDrawer orderId={openOrder} onClose={() => setOpenOrder(null)} />}
    </div>
  )
}

function WorkRow({ w, data, today, canEdit, busy, run, onOpenOrder }: { w: WorkOrderRow; data: Data; today: string; canEdit: boolean; busy: boolean; run: Run; onOpenOrder?: () => void }) {
  const [note, setNote] = useState(w.note)
  const [showCosts, setShowCosts] = useState(false)
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
        {w.totals && (
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-walnut-50 px-2.5 py-1 text-xs font-semibold text-walnut-800 ring-1 ring-walnut-200 hover:bg-white"
            onClick={() => setShowCosts((v) => !v)}
            aria-expanded={showCosts}
          >
            {showCosts ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            Troškovi: {money2(w.totals.total)}
            {w.margin && (
              <span className={w.margin.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                · zarada {money(w.margin.profit)} ({Math.round(w.margin.pct * 100)} %)
              </span>
            )}
          </button>
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
      {showCosts && w.totals && (
        <div className="lg:col-span-3">
          <Costs w={w} data={data} busy={busy} run={run} />
        </div>
      )}
    </li>
  )
}

/** Satnica radionice i zbir zarade na gotovim nalozima (samo admin i uprava). */
function RateBar({ rate, done, busy, run }: { rate: number; done: WorkOrderRow[]; busy: boolean; run: Run }) {
  const [v, setV] = useState(String(rate).replace('.', ','))
  const profit = done.reduce((s, w) => s + (w.margin?.profit ?? 0), 0)
  const net = done.reduce((s, w) => s + (w.margin?.net ?? 0), 0)
  return (
    <Card className="mb-4">
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Satnica radionice (KM/h, bez PDV-a)" hint="Predlaže se kod upisa sati rada.">
          <div className="flex gap-2">
            <input className={`${inputCls} w-28`} inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} />
            <Button variant="outline" disabled={busy || parseAmount(v) === rate} onClick={() => run(() => setHourlyRateFn({ data: { rate: parseAmount(v) } }), 'Satnica je spremljena.')}>
              Spremi
            </Button>
          </div>
        </Field>
        <div className="text-sm text-walnut-700">
          Gotovi nalozi ({done.length}): prodaja bez PDV-a <b>{money(net)}</b>, zarada <b className={profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{money(profit)}</b>
          {net > 0 && <> ({Math.round((profit / net) * 100)} %)</>}
          <div className="text-xs text-walnut-500">Zarada po komadu = prodajna cijena bez PDV-a − svi troškovi naloga (uključujući sate rada).</div>
        </div>
      </div>
    </Card>
  )
}

function Costs({ w, data, busy, run }: { w: WorkOrderRow; data: Data; busy: boolean; run: Run }) {
  const empty = { kind: 'partner' as CostKind, description: '', supplierId: '', documentNumber: '', qty: '1', unitPrice: '', employeeId: '', date: data.today }
  const [f, setF] = useState(empty)
  const set = <K extends keyof typeof f>(k: K, val: (typeof f)[K]) => setF((s) => ({ ...s, [k]: val }))
  const isWork = f.kind === 'rad'
  const rateText = String(data.rate).replace('.', ',')
  const amount = costAmount(parseAmount(f.qty), parseAmount(f.unitPrice))
  const add = async () => {
    const ok = await run(
      () =>
        addWorkCostFn({
          data: {
            workOrderId: w.id,
            number: w.number,
            kind: f.kind,
            description: f.description,
            supplierId: f.kind === 'partner' && f.supplierId ? f.supplierId : null,
            documentNumber: f.documentNumber,
            qty: parseAmount(f.qty),
            unitPrice: parseAmount(f.unitPrice),
            date: f.date,
            employeeId: isWork && f.employeeId ? f.employeeId : null,
          },
        }),
      'Trošak je upisan.',
    )
    if (ok) setF({ ...empty, kind: f.kind, unitPrice: isWork ? rateText : '' })
  }
  const t = w.totals!
  const placeholder = isWork
    ? 'npr. sklapanje korpusa i fronti'
    : f.kind === 'partner'
      ? 'npr. krojenje i kantiranje, 14 elemenata'
      : f.kind === 'materijal'
        ? 'npr. šarke Blum 20 kom, ručke, vodilice'
        : 'npr. prijevoz iverice od partnera'
  return (
    <div className="rounded-xl border border-walnut-200 bg-linen p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-base font-semibold">Troškovi naloga {w.number} (bez PDV-a)</h3>
        <div className="text-xs text-walnut-600">
          Vanjski troškovi <b>{money2(t.external)}</b> · vlastiti rad <b>{money2(t.labor)}</b> · ukupno <b>{money2(t.total)}</b>
          {w.margin && (
            <>
              {' '}
              · prodaja bez PDV-a <b>{money2(w.margin.net)}</b> · zarada{' '}
              <b className={w.margin.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                {money2(w.margin.profit)} ({Math.round(w.margin.pct * 100)} %)
              </b>
            </>
          )}
        </div>
      </div>
      {w.costs && w.costs.length > 0 ? (
        <div className="mb-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs text-walnut-500">
                <th className="pb-1 font-semibold">Datum</th>
                <th className="pb-1 font-semibold">Vrsta</th>
                <th className="pb-1 font-semibold">Opis</th>
                <th className="pb-1 text-right font-semibold">Kol./sati</th>
                <th className="pb-1 text-right font-semibold">Cijena</th>
                <th className="pb-1 text-right font-semibold">Iznos</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-walnut-100">
              {w.costs.map((c) => (
                <tr key={c.id}>
                  <td className="py-1.5 pr-2">{date(c.date)}</td>
                  <td className="py-1.5 pr-2">{COST_KIND_LABEL[c.kind]}</td>
                  <td className="py-1.5 pr-2">
                    {[c.supplier, c.description, c.documentNumber && `račun ${c.documentNumber}`, c.employee].filter(Boolean).join(' · ')}
                    <div className="text-[11px] text-walnut-400">upisao/la {c.createdBy}</div>
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular">{String(c.qty).replace('.', ',')}</td>
                  <td className="py-1.5 pr-2 text-right tabular">{money2(c.unitPrice)}</td>
                  <td className="py-1.5 pr-2 text-right font-semibold tabular">{money2(c.amount)}</td>
                  <td className="py-1.5 text-right">
                    <Button
                      variant="danger"
                      size="sm"
                      aria-label={`Obriši trošak ${c.description || COST_KIND_LABEL[c.kind]}`}
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Obrisati trošak ${money2(c.amount)} (${COST_KIND_LABEL[c.kind]})?`))
                          run(() => deleteWorkCostFn({ data: { id: c.id, number: w.number, amount: c.amount } }), 'Trošak je obrisan.')
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mb-3 text-sm text-walnut-600">Još nema troškova. Upišite račun partnera za krojenje, okove i materijal, sate rada i ostalo.</p>
      )}
      <div className="grid gap-2 rounded-lg border border-walnut-200 bg-white p-3 sm:grid-cols-6">
        <div className="sm:col-span-2">
          <Select
            label="Vrsta troška"
            value={f.kind}
            onChange={(k) => setF((s) => ({ ...s, kind: k as CostKind, unitPrice: k === 'rad' ? rateText : s.kind === 'rad' ? '' : s.unitPrice }))}
            options={(Object.keys(COST_KIND_LABEL) as CostKind[]).map((k) => ({ value: k, label: COST_KIND_LABEL[k] }))}
          />
        </div>
        {f.kind === 'partner' && (
          <div className="sm:col-span-2">
            <Select label="Partner (dobavljač)" value={f.supplierId} onChange={(x) => set('supplierId', x)} options={[{ value: '', label: '— odaberite —' }, ...data.suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
          </div>
        )}
        {isWork && (
          <div className="sm:col-span-2">
            <Select label="Ko je radio" value={f.employeeId} onChange={(x) => set('employeeId', x)} options={[{ value: '', label: '— po želji —' }, ...data.employees.map((e) => ({ value: e.id, label: e.name }))]} />
          </div>
        )}
        <Field label="Datum" className="sm:col-span-2">
          <input type="date" className={inputCls} value={f.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="Opis" className={f.kind === 'partner' || isWork ? 'sm:col-span-4' : 'sm:col-span-6'}>
          <input className={inputCls} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder={placeholder} />
        </Field>
        {f.kind === 'partner' && (
          <Field label="Broj računa partnera" className="sm:col-span-2">
            <input className={inputCls} value={f.documentNumber} onChange={(e) => set('documentNumber', e.target.value)} />
          </Field>
        )}
        <Field label={isWork ? 'Sati' : 'Količina'}>
          <input className={inputCls} inputMode="decimal" value={f.qty} onChange={(e) => set('qty', e.target.value)} />
        </Field>
        <Field label={isWork ? 'Satnica (KM/h)' : 'Cijena bez PDV-a'}>
          <input className={inputCls} inputMode="decimal" value={f.unitPrice} onChange={(e) => set('unitPrice', e.target.value)} />
        </Field>
        <div className="flex items-end justify-between gap-2 sm:col-span-4">
          <span className="pb-2 text-sm">
            Iznos: <b>{money2(amount)}</b>
          </span>
          <Button variant="copper" disabled={busy || !(amount > 0)} onClick={add}>
            <Plus className="size-4" /> Dodaj trošak
          </Button>
        </div>
      </div>
      <p className="mt-2 text-xs text-walnut-500">
        Vanjski troškovi (partner, materijal, ostalo) ulaze u nabavnu vrijednost prodaje u Troškovima i zaradi i Izvještajima. Sati vlastitih radnika služe za zaradu po komadu — u mjesečnoj zaradi su već kroz plaće.
      </p>
    </div>
  )
}
