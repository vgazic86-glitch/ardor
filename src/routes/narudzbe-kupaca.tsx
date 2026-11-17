import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Hourglass, PackageCheck, Send, Truck } from 'lucide-react'
import { useMemo } from 'react'
import { Avatar, Badge, Card, EmptyState, OrderBadge, PageHeader, Stat } from '../components/ui'
import { date, money } from '../lib/format'
import { useRemote } from '../lib/remote'
import { orderTotal, waitingOrders } from '../lib/stats'
import { useStore } from '../lib/store'
import { listPurchaseOrdersFn } from '../server/api'

export const Route = createFileRoute('/narudzbe-kupaca')({ component: CustomerOrdersPage })

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)

/** Narudžbe kupaca: prodaje za koje robe nema u salonu, dok roba ne stigne. */
function CustomerOrdersPage() {
  const { orders, products, productById, customerById, employeeById, today, user, me } = useStore()
  const navigate = useNavigate()
  const canBuy = user.role !== 'trgovac'
  const po = useRemote(() => (canBuy ? listPurchaseOrdersFn() : Promise.resolve([])), [canBuy])
  const waiting = useMemo(() => waitingOrders(orders, products), [orders, products])
  const incoming = useMemo(() => {
    const m = new Map<string, number>()
    for (const o of po.data ?? [])
      if (o.status === 'nacrt' || o.status === 'zakljucena') for (const l of o.lines) if (l.productId) m.set(l.productId, (m.get(l.productId) ?? 0) + l.qty)
    return m
  }, [po.data])
  const rows = orders
    .filter((o) => waiting.has(o.id) && (user.role !== 'trgovac' || o.employeeId === me?.id))
    .sort((a, b) => a.date.localeCompare(b.date))
  const missingQty = rows.reduce((s, o) => s + waiting.get(o.id)!.reduce((n, m) => n + m.missing, 0), 0)
  const value = rows.reduce((s, o) => s + orderTotal(o), 0)
  const oldest = rows[0] ? daysBetween(rows[0].date, today) : 0
  const notOrdered = new Set(rows.flatMap((o) => waiting.get(o.id)!.filter((m) => !incoming.get(m.productId)).map((m) => m.productId)))

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Prodaja"
        title="Narudžbe kupaca"
        description="Prodaje za koje robe trenutno nema u salonu. Kad roba stigne i primka se upiše, narudžba sama nestaje s ove liste i spremna je za isporuku."
        actions={
          canBuy ? (
            <Link to="/nabava" className="inline-flex items-center gap-2 rounded-lg border border-walnut-200 bg-linen px-3.5 py-2 text-sm font-semibold shadow-sm hover:bg-white">
              <Send className="size-4" /> Nabava od dobavljača
            </Link>
          ) : undefined
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Kupaca čeka robu" value={String(rows.length)} icon={Hourglass} tone="accent" />
        <Stat label="Komada nedostaje" value={String(missingQty)} icon={Truck} />
        <Stat label="Vrijednost prodaja" value={money(value)} icon={PackageCheck} />
        <Stat label="Najduže čeka" value={rows.length ? `${oldest} dana` : '—'} icon={Hourglass} tone={oldest > 30 ? 'warn' : 'default'} />
      </div>
      {canBuy && notOrdered.size > 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Za {notOrdered.size} {notOrdered.size === 1 ? 'artikal koji' : notOrdered.size < 5 ? 'artikla koja' : 'artikala koje'} kupci čekaju još nema narudžbe dobavljaču.{' '}
          <Link to="/nabava" className="font-semibold underline">
            Otvorite Nabavu → Prijedlog narudžbe
          </Link>
        </div>
      )}
      <Card flush>
        {!rows.length ? (
          <EmptyState icon={PackageCheck} title="Niko ne čeka robu">
            Sva prodana roba je u salonu. Nove prodaje bez robe na stanju pojavit će se ovdje.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-walnut-500">
                  <th className="px-5 py-2.5">Prodaja</th>
                  <th className="px-3 py-2.5">Kupac</th>
                  <th className="px-3 py-2.5">Šta nedostaje</th>
                  <th className="px-3 py-2.5">Čeka</th>
                  <th className="px-3 py-2.5">Prodavač</th>
                  <th className="px-3 py-2.5 text-right">Iznos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-walnut-100">
                {rows.map((o) => {
                  const c = customerById(o.customerId)
                  const e = employeeById(o.employeeId)
                  const d = daysBetween(o.date, today)
                  return (
                    <tr key={o.id} className="cursor-pointer align-top hover:bg-walnut-50" onClick={() => navigate({ to: '/narudzbe', search: { otvori: o.id } })}>
                      <td className="px-5 py-3">
                        <div className="font-semibold">{o.number}</div>
                        <div className="text-xs text-walnut-500">{date(o.date)}</div>
                        <div className="mt-1">
                          <OrderBadge status={o.status} />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-walnut-500">{c.phone}</div>
                      </td>
                      <td className="px-3 py-3">
                        <ul className="space-y-1">
                          {waiting.get(o.id)!.map((m) => {
                            const p = productById(m.productId)
                            const inc = incoming.get(m.productId) ?? 0
                            return (
                              <li key={m.productId}>
                                <span className="font-medium">{p.name}</span> <span className="text-walnut-500">— nedostaje {m.missing} od {m.qty}</span>
                                {canBuy && (
                                  <Badge tone={inc ? 'info' : 'bad'} className="ml-2">
                                    {inc ? `naručeno ${inc}` : 'nije naručeno'}
                                  </Badge>
                                )}
                                <div className="text-xs text-walnut-500">
                                  {p.supplier}
                                  {p.leadTimeDays ? ` · rok oko ${p.leadTimeDays} dana` : ''}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </td>
                      <td className={`whitespace-nowrap px-3 py-3 text-xs ${d > 30 ? 'font-bold text-rose-700' : 'text-walnut-600'}`}>{d} dana</td>
                      <td className="px-3 py-3">
                        <span className="flex items-center gap-2 text-xs">
                          <Avatar employee={e} size="sm" /> {e.name}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular">{money(orderTotal(o))}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
