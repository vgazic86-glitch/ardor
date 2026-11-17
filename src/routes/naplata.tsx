import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AlarmClock, BellRing, CalendarClock, HandCoins, Layers, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ReminderDialog } from '../components/ReminderDialog'
import { Avatar, Badge, Card, EmptyState, PageHeader, Segmented, Stat } from '../components/ui'
import { receivables, receivableState, type Receivable } from '../lib/collection'
import { date, money } from '../lib/format'
import { useStore } from '../lib/store'

export const Route = createFileRoute('/naplata')({ component: CollectionPage })

type Filter = 'kasni' | 'sve' | 'rate'

/** Naplata potraživanja: ko duguje, od kada kasni, rate i podsjetnici kupcima. */
function CollectionPage() {
  const { orders, today, customerById, employeeById, restricted, me } = useStore()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('kasni')
  const [remind, setRemind] = useState<Receivable | null>(null)

  // Trgovac (i operativa) vidi samo svoje prodaje; voditelj i uprava sve.
  const all = useMemo(
    () => receivables(restricted ? orders.filter((o) => o.employeeId === me?.id) : orders, today),
    [orders, today, restricted, me?.id],
  )
  const late = all.filter((r) => r.daysLate > 0)
  const rows = filter === 'kasni' ? all.filter((r) => r.overdue > 0.5) : filter === 'rate' ? all.filter((r) => r.plan) : all
  const monthEnd = `${today.slice(0, 7)}-31`
  const dueThisMonth = all.reduce((s, r) => s + (r.next?.date && r.next.date <= monthEnd ? r.next.amount : 0), 0)

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Prodaja"
        title="Naplata"
        description={`Ko duguje i od kada. Ostatak dospijeva na dan isporuke (ili u roku upisanom kod prodaje), rate po planu. ${restricted ? 'Vidite svoje kupce.' : 'Vidite sve prodavače.'}`}
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Kupci duguju" value={money(all.reduce((s, r) => s + r.left, 0))} icon={HandCoins} hint={`${all.length} prodaja`} />
        <Stat
          label="Dospjelo, neplaćeno"
          value={money(all.reduce((s, r) => s + r.overdue, 0))}
          icon={AlarmClock}
          tone={late.length ? 'warn' : 'good'}
          hint={`${late.length} kasni`}
        />
        <Stat label="Kasni preko 30 dana" value={String(late.filter((r) => r.daysLate > 30).length)} icon={BellRing} tone={late.some((r) => r.daysLate > 30) ? 'warn' : 'default'} />
        <Stat label="Dospijeva do kraja mjeseca" value={money(dueThisMonth)} icon={CalendarClock} hint="rate i rokovi" />
      </div>

      <div className="mb-4">
        <Segmented
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
          options={[
            { value: 'kasni', label: `Dospjelo (${all.filter((r) => r.overdue > 0.5).length})` },
            { value: 'rate', label: `Rate (${all.filter((r) => r.plan).length})` },
            { value: 'sve', label: `Svi dužnici (${all.length})` },
          ]}
        />
      </div>

      <Card flush>
        {!rows.length ? (
          <EmptyState icon={Wallet} title={filter === 'kasni' ? 'Ništa nije dospjelo' : 'Nema dužnika'}>
            {filter === 'kasni' ? 'Svi kupci su platili ono što je dospjelo.' : 'Nema otvorenih potraživanja.'}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-walnut-500">
                  <th className="px-5 py-2.5">Kupac</th>
                  <th className="px-3 py-2.5">Prodaja</th>
                  <th className="px-3 py-2.5">Stanje</th>
                  <th className="px-3 py-2.5 text-right">Dospjelo</th>
                  <th className="px-3 py-2.5 text-right">Ukupno duguje</th>
                  <th className="px-3 py-2.5">Sljedeće</th>
                  <th className="px-3 py-2.5">Podsjetnik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-walnut-100">
                {rows.map((r) => {
                  const o = r.order
                  const c = customerById(o.customerId)
                  const e = employeeById(o.employeeId)
                  const st = receivableState(r)
                  return (
                    <tr key={o.id} className="cursor-pointer align-top hover:bg-walnut-50" onClick={() => navigate({ to: '/narudzbe', search: { otvori: o.id } })}>
                      <td className="px-5 py-3">
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-xs text-walnut-500">{c.phone || 'nema telefona'}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium">{o.number}</div>
                        <div className="flex items-center gap-1.5 text-xs text-walnut-500">
                          <Avatar employee={e} size="sm" /> {e.name}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {st === 'kasni' ? (
                          <Badge tone={r.daysLate > 30 ? 'bad' : 'warn'}>kasni {r.daysLate} dana</Badge>
                        ) : st === 'dospijeva' ? (
                          <Badge tone="warn">dospijeva danas</Badge>
                        ) : (
                          <Badge tone="neutral">{o.issuedAt || o.dueDate ? 'nije dospjelo' : 'čeka isporuku'}</Badge>
                        )}
                        {r.plan && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-walnut-500">
                            <Layers className="size-3" /> rate {r.plan.paid}/{r.plan.count}
                          </div>
                        )}
                        {r.oldestDue && <div className="mt-1 text-xs text-walnut-500">rok {date(r.oldestDue)}</div>}
                      </td>
                      <td className={`px-3 py-3 text-right tabular ${r.overdue > 0.5 ? 'font-bold text-rose-700' : 'text-walnut-400'}`}>
                        {r.overdue > 0.5 ? money(r.overdue) : '—'}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular">{money(r.left)}</td>
                      <td className="px-3 py-3 text-xs text-walnut-600">
                        {r.next ? (
                          <>
                            {money(r.next.amount)}
                            <div className="text-walnut-500">{r.next.date ? date(r.next.date) : 'na dan isporuke'}</div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-3" onClick={(ev) => ev.stopPropagation()}>
                        <button
                          onClick={() => setRemind(r)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-walnut-200 bg-linen px-2.5 py-1.5 text-xs font-semibold hover:border-copper-300"
                        >
                          <BellRing className="size-3.5 text-copper-500" /> Podsjeti
                        </button>
                        {o.lastReminder && (
                          <div className="mt-1 text-[11px] text-walnut-500">
                            zadnji {date(o.lastReminder.at)} · {o.lastReminder.channel}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {remind && <ReminderDialog r={remind} onClose={() => setRemind(null)} />}
    </div>
  )
}
