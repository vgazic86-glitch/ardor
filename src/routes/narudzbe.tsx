import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Download,
  Hammer,
  HandCoins,
  ListFilter,
  Plus,
  Search,
  Wallet,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NewOrderDialog } from '../components/NewOrderDialog'
import { OrderDrawer } from '../components/OrderDrawer'
import {
  Avatar,
  Button,
  Card,
  OrderBadge,
  PageHeader,
  Select,
  Stat,
} from '../components/ui'
import type { OrderStatus } from '../lib/types'
import { count, date, money, monthShort, orderStatusLabel } from '../lib/format'
import {
  isRevenue,
  lastMonths,
  monthKey,
  orderTotal,
  outstanding,
} from '../lib/stats'
import { useStore } from '../lib/store'

export const Route = createFileRoute('/narudzbe')({
  validateSearch: (
    s: Record<string, unknown>,
  ): { nova?: boolean; otvori?: string; q?: string; artikli?: string } => ({
    ...(s.nova === true || s.nova === 'true' ? { nova: true } : {}),
    ...(typeof s.artikli === 'string' && /^[\d:,]+$/.test(s.artikli) ? { artikli: s.artikli } : {}),
    ...(s.otvori ? { otvori: String(s.otvori) } : {}),
    ...(s.q ? { q: String(s.q) } : {}),
  }),
  component: OrdersPage,
})

const PAGE = 25

function OrdersPage() {
  const { orders, salesPeople, customerById, employeeById, currentMonth, me, restricted } =
    useStore()
  const { nova, otvori, q: initialQ, artikli } = Route.useSearch()
  const navigate = useNavigate({ from: '/narudzbe' })
  const [q, setQ] = useState(initialQ ?? '')
  const [status, setStatus] = useState<'sve' | OrderStatus>('sve')
  const [emp, setEmp] = useState('svi')
  const [month, setMonth] = useState('sve')
  const [limit, setLimit] = useState(PAGE)
  const [openId, setOpenId] = useState<string | null>(otvori ?? null)
  useEffect(() => {
    if (otvori) setOpenId(otvori)
    if (initialQ !== undefined) setQ(initialQ)
  }, [otvori, initialQ])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return orders.filter((o) => {
      if (status !== 'sve' && o.status !== status) return false
      if (emp !== 'svi' && o.employeeId !== emp) return false
      if (month !== 'sve' && monthKey(o.date) !== month) return false
      if (needle) {
        const c = customerById(o.customerId)
        const hay = `${o.number} ${c.name} ${c.phone} ${c.city}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [orders, q, status, emp, month, customerById])

  const revenue = filtered
    .filter((o) => !restricted || o.employeeId === me?.id)
    .filter(isRevenue)
    .reduce((s, o) => s + orderTotal(o), 0)
  const due = filtered.reduce((s, o) => s + outstanding(o), 0)
  const statuses = Object.keys(orderStatusLabel) as OrderStatus[]

  function exportCsv() {
    const rows = [
      ['Broj', 'Datum', 'Kupac', 'Prodavač', 'Status', 'Iznos', 'Plaćeno'],
      ...filtered.map((o) => [
        o.number,
        o.date,
        customerById(o.customerId).name,
        employeeById(o.employeeId).name,
        orderStatusLabel[o.status],
        orderTotal(o).toFixed(2),
        o.paid.toFixed(2),
      ]),
    ]
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const url = URL.createObjectURL(
      new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = 'ardor-narudzbe.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Prodaja"
        title="Narudžbe"
        description="Sve ponude i narudžbe salona — od prve ponude do isporuke i naplate."
        actions={
          <>
            {!restricted && (
              <Button variant="outline" onClick={exportCsv}>
                <Download className="size-4" /> Izvoz CSV
              </Button>
            )}
            <Button onClick={() => navigate({ search: { nova: true } })}>
              <Plus className="size-4" /> Nova narudžba
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          tone="accent"
          icon={ListFilter}
          label="Prikazano"
          value={count(filtered.length)}
          hint="prema filterima"
        />
        <Stat
          icon={Wallet}
          label={restricted ? 'Moj promet' : 'Promet'}
          value={money(revenue)}
          hint={restricted ? 'vaše prodaje u prikazu' : 'bez ponuda i otkazanih'}
        />
        <Stat
          tone="warn"
          icon={HandCoins}
          label="Za naplatu"
          value={money(due)}
        />
        <Stat
          icon={Hammer}
          label="U izradi / spremno"
          value={count(
            filtered.filter(
              (o) => o.status === 'u_izradi' || o.status === 'spremna',
            ).length,
          )}
        />
      </div>

      <Card className="mt-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="relative flex-1">
            <span className="mb-1 block text-xs font-semibold text-walnut-700">
              Pretraga
            </span>
            <Search className="pointer-events-none absolute left-3 top-[34px] size-4 text-walnut-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Broj narudžbe, kupac, telefon, grad…"
              className="w-full rounded-lg border border-walnut-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-copper-400 focus:outline-none"
            />
          </label>
          <Select
            label="Status"
            value={status}
            onChange={(v) => setStatus(v as typeof status)}
            options={[
              { value: 'sve', label: 'Svi statusi' },
              ...statuses.map((s) => ({
                value: s,
                label: orderStatusLabel[s],
              })),
            ]}
          />
          {me && me.role !== 'Dostava i montaža' && (
            <Button
              variant={emp === me.id ? 'primary' : 'outline'}
              onClick={() => setEmp(emp === me.id ? 'svi' : me.id)}
            >
              Moje prodaje
            </Button>
          )}
          {!restricted && <Select
            label="Prodavač"
            value={emp}
            onChange={setEmp}
            options={[
              { value: 'svi', label: 'Svi prodavači' },
              ...salesPeople.map((e) => ({ value: e.id, label: e.name })),
            ]}
          />}
          <Select
            label="Mjesec"
            value={month}
            onChange={setMonth}
            options={[
              { value: 'sve', label: 'Svi mjeseci' },
              ...lastMonths(currentMonth, 12)
                .reverse()
                .map((k) => ({
                  value: k,
                  label: `${monthShort(Number(k.slice(5)) - 1)} ${k.slice(0, 4)}`,
                })),
            ]}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {(['sve', ...statuses] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${status === s ? 'bg-walnut-900 text-linen' : 'bg-walnut-100 text-walnut-700 hover:bg-walnut-200'}`}
            >
              {s === 'sve' ? 'Sve' : orderStatusLabel[s]}{' '}
              <span className="opacity-60">
                {s === 'sve'
                  ? orders.length
                  : orders.filter((o) => o.status === s).length}
              </span>
            </button>
          ))}
        </div>

        <div className="-mx-5 mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-walnut-200 text-left text-xs uppercase tracking-wider text-walnut-500">
                <th className="px-5 py-2 font-semibold">Narudžba</th>
                <th className="py-2 font-semibold">Kupac</th>
                <th className="py-2 font-semibold">Prodavač</th>
                <th className="py-2 font-semibold">Dostava</th>
                <th className="py-2 font-semibold">Status</th>
                <th className="py-2 text-right font-semibold">Iznos</th>
                <th className="px-5 py-2 text-right font-semibold">Plaćeno</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, limit).map((o) => {
                const c = customerById(o.customerId)
                const e = employeeById(o.employeeId)
                const total = orderTotal(o)
                return (
                  <tr
                    key={o.id}
                    onClick={() => setOpenId(o.id)}
                    className="cursor-pointer border-b border-walnut-100 hover:bg-walnut-100/50"
                  >
                    <td className="px-5 py-3">
                      <button
                        className="font-semibold hover:text-copper-600"
                        onClick={() => setOpenId(o.id)}
                      >
                        {o.number}
                      </button>
                      <div className="text-xs text-walnut-500">
                        {date(o.date)}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-walnut-500">{c.city}</div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Avatar employee={e} size="sm" />
                        <span className="text-xs">{e.name.split(' ')[0]}</span>
                      </div>
                    </td>
                    <td className="py-3 text-xs text-walnut-700">
                      {o.delivery ? (
                        date(o.delivery.date)
                      ) : (
                        <span className="text-walnut-500">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      <OrderBadge status={o.status} />
                      {o.issuedAt && (
                        <div className="mt-1 text-[11px] text-walnut-500">
                          roba izašla {date(o.issuedAt)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-right font-semibold tabular">
                      {money(total)}
                    </td>
                    <td className="px-5 py-3 text-right tabular">
                      {o.paid >= total - 0.5 && o.paid > 0 ? (
                        <span className="text-xs font-semibold text-moss-600">
                          Plaćeno
                        </span>
                      ) : (
                        <span className="text-xs text-walnut-700">
                          {money(o.paid)}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-walnut-500">
              Nema narudžbi za odabrane filtere.
            </p>
          )}
        </div>
        {filtered.length > limit && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
              Prikaži još ({filtered.length - limit})
            </Button>
          </div>
        )}
      </Card>

      <OrderDrawer orderId={openId} onClose={() => setOpenId(null)} />
      {nova && (
        <NewOrderDialog
          initialItems={artikli?.split(',').map((x) => ({ productId: x.split(':')[0], qty: Number(x.split(':')[1] || 1) }))}
          asOffer={!!artikli}
          onClose={() => navigate({ search: {} })}
          onCreated={(id) => {
            navigate({ search: {} })
            setOpenId(id)
          }}
        />
      )}
    </div>
  )
}
