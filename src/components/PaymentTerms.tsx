import { CalendarClock, Layers } from 'lucide-react'
import { useState } from 'react'
import { addMonths, receivable, receivableState } from '../lib/collection'
import { date, money } from '../lib/format'
import { orderTotal } from '../lib/stats'
import { useStore } from '../lib/store'
import type { Order } from '../lib/types'
import { Badge, Button, inputCls } from './ui'

/** Naplata u prozoru prodaje: rok plaćanja i plan rata („Rate” — salon kreditira kupca). */
export function PaymentTerms({ order }: { order: Order }) {
  const { today, setDueDate, setInstallmentPlan, busy, restricted, me } = useStore()
  // Trgovac (i operativa) mijenja naplatu samo na svojim prodajama — server to i provjerava.
  const canEdit = !restricted || order.employeeId === me?.id
  const [editDue, setEditDue] = useState(false)
  const [due, setDue] = useState(order.dueDate ?? '')
  const [editPlan, setEditPlan] = useState(false)
  const [count, setCount] = useState(String(order.installments?.length || 6))
  const [first, setFirst] = useState(addMonths(order.issuedAt ?? today, 1))
  if (order.status === 'ponuda' || order.status === 'otkazana') return null

  const r = receivable(order, today)
  const inst = order.installments ?? []
  const state = r ? receivableState(r) : null
  // Uplate pokrivaju redom: prvo avans (dio koji rate ne pokrivaju), pa rate.
  const upfront = Math.max(0, orderTotal(order) - inst.reduce((s, i) => s + i.amount, 0))
  let paidLeft = Math.max(0, order.paid - upfront)

  return (
    <div className="mt-6 rounded-2xl border border-walnut-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-walnut-500">
          <CalendarClock className="size-4 text-copper-500" /> Naplata
        </span>
        {r && state === 'kasni' && <Badge tone="bad">Kasni {r.daysLate} dana · {money(r.overdue)}</Badge>}
        {r && state === 'dospijeva' && <Badge tone="warn">Dospijeva danas · {money(r.overdue)}</Badge>}
        {!r && <Badge tone="good">Plaćeno</Badge>}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-walnut-600">Rok plaćanja ostatka:</span>
        {editDue ? (
          <>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${inputCls} w-auto py-1`} />
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => (await setDueDate(order.id, due || null)) && setEditDue(false)}
            >
              Spremi
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditDue(false)}>
              Odustani
            </Button>
          </>
        ) : (
          <>
            <span className="font-semibold">
              {order.dueDate ? date(order.dueDate) : order.issuedAt ? `na dan isporuke (${date(order.issuedAt)})` : 'na dan isporuke'}
            </span>
            {canEdit && (
              <button className="text-xs font-semibold text-copper-600 hover:underline" onClick={() => setEditDue(true)}>
                Promijeni
              </button>
            )}
            {canEdit && order.dueDate && (
              <button className="text-xs text-walnut-500 hover:underline" onClick={() => setDueDate(order.id, null)}>
                vrati na dan isporuke
              </button>
            )}
          </>
        )}
      </div>

      {(order.paymentMethod === 'Rate' || inst.length > 0) && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <Layers className="size-4 text-copper-500" /> Plan rata
              {r?.plan && <span className="font-normal text-walnut-500">· plaćeno {r.plan.paid} od {r.plan.count}</span>}
            </span>
            {canEdit && !editPlan && (
              <button className="text-xs font-semibold text-copper-600 hover:underline" onClick={() => setEditPlan(true)}>
                {inst.length ? 'Novi plan' : 'Napravi plan rata'}
              </button>
            )}
          </div>
          {editPlan && (
            <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl bg-walnut-50 p-3 text-sm">
              <label className="text-xs font-semibold text-walnut-600">
                Broj rata
                <input type="number" min={1} max={60} value={count} onChange={(e) => setCount(e.target.value)} className={`${inputCls} mt-1 w-20 py-1`} />
              </label>
              <label className="text-xs font-semibold text-walnut-600">
                Prva rata
                <input type="date" value={first} onChange={(e) => setFirst(e.target.value)} className={`${inputCls} mt-1 w-auto py-1`} />
              </label>
              <Button
                size="sm"
                disabled={busy || !Number(count) || !first}
                onClick={async () => (await setInstallmentPlan(order.id, Number(count), first)) && setEditPlan(false)}
              >
                Spremi plan
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditPlan(false)}>
                Odustani
              </Button>
              {inst.length > 0 && (
                <Button size="sm" variant="danger" onClick={async () => (await setInstallmentPlan(order.id, 0, first)) && setEditPlan(false)}>
                  Obriši plan
                </Button>
              )}
              <p className="w-full text-[11px] text-walnut-500">
                Rate se računaju za ostatak ({money(r?.left ?? 0)}) u jednakim mjesečnim iznosima. Dosadašnje uplate ostaju kao avans.
              </p>
            </div>
          )}
          {inst.length > 0 ? (
            <table className="w-full text-sm">
              <tbody>
                {inst.map((i) => {
                  const cover = Math.min(Math.max(0, paidLeft), i.amount)
                  paidLeft -= cover
                  const paid = i.amount - cover < 0.5
                  const late = !paid && i.date < today
                  return (
                    <tr key={i.seq} className="border-b border-walnut-100 last:border-0">
                      <td className="py-1.5 text-walnut-500">{i.seq}.</td>
                      <td className="py-1.5">{date(i.date)}</td>
                      <td className="py-1.5 text-right tabular">{money(i.amount)}</td>
                      <td className="py-1.5 text-right">
                        {paid ? <Badge tone="good">plaćeno</Badge> : late ? <Badge tone="bad">kasni</Badge> : cover > 0 ? <Badge tone="warn">djelimično</Badge> : <span className="text-xs text-walnut-400">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            !editPlan && <p className="text-xs text-walnut-500">Plan rata još nije napravljen — cijeli ostatak dospijeva u roku plaćanja.</p>
          )}
        </div>
      )}
    </div>
  )
}
