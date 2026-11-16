import { createFileRoute } from '@tanstack/react-router'
import {
  Pencil,
  Phone,
  Plus,
  Trophy,
  Users,
  Wallet,
  Receipt,
  Target,
} from 'lucide-react'
import { useState } from 'react'
import { EmployeeDialog } from '../components/EmployeeDialog'
import { EmployeeChart, RevenueChart } from '../components/Charts'
import {
  Avatar,
  Button,
  Card,
  Delta,
  PageHeader,
  Progress,
  Select,
  Stat,
} from '../components/ui'
import { targetFor, type Employee } from '../lib/types'
import { TargetsDialog } from '../components/TargetsDialog'
import { count, money, monthShort } from '../lib/format'
import {
  employeeStats,
  isRevenue,
  lastMonths,
  monthKey,
  orderTotal,
  previousMonthKey,
} from '../lib/stats'
import { useStore } from '../lib/store'

export const Route = createFileRoute('/zaposlenici')({
  component: EmployeesPage,
})

function EmployeesPage() {
  const { orders, drivers, salesPeople, employees, currentMonth } = useStore()
  const [edit, setEdit] = useState<Employee | 'new' | null>(null)
  const months = lastMonths(currentMonth, 12)
  const [month, setMonth] = useState(currentMonth)
  const [selected, setSelected] = useState(salesPeople[0]?.id ?? '')
  const [plan, setPlan] = useState(false)

  const stats = employeeStats(orders, month, salesPeople).sort(
    (a, b) => b.revenue - a.revenue,
  )
  const prev = employeeStats(orders, previousMonthKey(month), salesPeople)
  const total = stats.reduce((s, t) => s + t.revenue, 0)
  const commission = stats.reduce((s, t) => s + t.commission, 0)
  const best = stats[0]
  const sel = salesPeople.find((e) => e.id === selected) ?? salesPeople[0]
  const selMonthly = months.map((k) =>
    orders
      .filter(
        (o) =>
          o.employeeId === selected && isRevenue(o) && monthKey(o.date) === k,
      )
      .reduce((s, o) => s + orderTotal(o), 0),
  )
  const yearTotal = selMonthly.reduce((a, b) => a + b, 0)
  const label = (k: string) =>
    `${monthShort(Number(k.slice(5)) - 1)} ${k.slice(0, 4)}`

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Tim"
        title="Promet po zaposleniku"
        description="Ko koliko prodaje, koliko je blizu cilja i kolika mu pripada provizija."
        actions={
          <>
            <Select
              label="Mjesec"
              value={month}
              onChange={setMonth}
              options={[...months]
                .reverse()
                .map((k) => ({ value: k, label: label(k) }))}
            />
            <Button variant="outline" onClick={() => setPlan(true)}>
              <Target className="size-4" /> Plan prometa
            </Button>
            <Button onClick={() => setEdit('new')}>
              <Plus className="size-4" /> Novi zaposlenik
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          tone="accent"
          icon={Wallet}
          label="Promet tima"
          value={money(total)}
          hint={label(month)}
        />
        <Stat
          icon={Trophy}
          label="Najbolji prodavač"
          value={best?.employee.name.split(' ')[0] ?? '—'}
          hint={best ? money(best.revenue) : ''}
        />
        <Stat
          icon={Receipt}
          label="Provizije ukupno"
          value={money(commission)}
          hint="obračun za isplatu"
        />
        <Stat
          icon={Users}
          label="Zaključene narudžbe"
          value={count(stats.reduce((s, t) => s + t.orders, 0))}
          hint={`${stats.reduce((s, t) => s + t.offers, 0)} otvorenih ponuda`}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((t, i) => {
          const p = prev.find((x) => x.employee.id === t.employee.id)!
          return (
            <button
              key={t.employee.id}
              onClick={() => setSelected(t.employee.id)}
              className={`rounded-2xl border p-5 text-left transition-all ${selected === t.employee.id ? 'border-copper-500 bg-white shadow-md ring-1 ring-copper-500' : 'border-walnut-200/80 bg-linen hover:border-walnut-300 hover:shadow-card'}`}
            >
              <div className="flex items-center gap-3">
                <Avatar employee={t.employee} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">
                    {t.employee.name}
                  </div>
                  <div className="text-xs text-walnut-500">
                    {t.employee.role}
                  </div>
                </div>
                <span className="font-display text-2xl font-semibold text-walnut-300">
                  #{i + 1}
                </span>
              </div>
              <div className="mt-4 font-display text-2xl font-semibold tabular">
                {money(t.revenue)}
              </div>
              <div className="text-xs text-walnut-700">
                {p.revenue ? <Delta value={t.revenue / p.revenue - 1} /> : null}{' '}
                prethodni mjesec
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-walnut-500">
                    Plan {money(targetFor(t.employee, month))}
                  </span>
                  <span className="font-semibold">
                    {Math.round(t.targetPct * 100)}%
                  </span>
                </div>
                <Progress
                  value={t.targetPct}
                  color={t.targetPct >= 1 ? '#4f6b4a' : t.employee.color}
                />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="text-walnut-500">Narudžbe</dt>
                  <dd className="font-semibold">{t.orders}</dd>
                </div>
                <div>
                  <dt className="text-walnut-500">Prosjek</dt>
                  <dd className="font-semibold tabular">{money(t.avgOrder)}</dd>
                </div>
                <div>
                  <dt className="text-walnut-500">Provizija</dt>
                  <dd className="font-semibold tabular">
                    {money(t.commission)}
                  </dd>
                </div>
              </dl>
            </button>
          )
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card
          title={`${sel?.name ?? ''} — zadnjih 12 mjeseci`}
          action={
            <span className="text-xs text-walnut-500">
              ukupno {money(yearTotal)}
            </span>
          }
        >
          <RevenueChart
            labels={months.map((k) => monthShort(Number(k.slice(5)) - 1))}
            values={selMonthly}
          />
        </Card>
        <Card title={`Poređenje — ${label(month)}`}>
          <EmployeeChart
            labels={stats.map((t) => t.employee.name.split(' ')[0])}
            values={stats.map((t) => t.revenue)}
            colors={stats.map((t) => t.employee.color)}
          />
        </Card>
      </div>

      <Card title="Obračun provizija" className="mt-6">
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-walnut-500">
                <th className="px-5 pb-2 font-semibold">Zaposlenik</th>
                <th className="pb-2 text-right font-semibold">Promet</th>
                <th className="pb-2 text-right font-semibold">
                  Odobreni popusti
                </th>
                <th className="pb-2 text-right font-semibold">Stopa</th>
                <th className="px-5 pb-2 text-right font-semibold">
                  Provizija
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.map((t) => (
                <tr key={t.employee.id} className="border-t border-walnut-100">
                  <td className="px-5 py-2.5">
                    <span className="flex items-center gap-2">
                      <Avatar employee={t.employee} size="sm" />{' '}
                      {t.employee.name}
                    </span>
                  </td>
                  <td className="py-2.5 text-right tabular">
                    {money(t.revenue)}
                  </td>
                  <td className="py-2.5 text-right tabular text-walnut-700">
                    {money(t.discounts)}
                  </td>
                  <td className="py-2.5 text-right tabular">
                    {Math.round(t.employee.commissionRate * 100)}%
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold tabular">
                    {money(t.commission)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-walnut-200 font-bold">
                <td className="px-5 py-2.5">Ukupno</td>
                <td className="py-2.5 text-right tabular">{money(total)}</td>
                <td className="py-2.5 text-right tabular">
                  {money(stats.reduce((s, t) => s + t.discounts, 0))}
                </td>
                <td />
                <td className="px-5 py-2.5 text-right tabular">
                  {money(commission)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={`Dostava i montaža — ${label(month)}`} className="mt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {drivers.map((d) => {
            const mine = orders.filter(
              (o) =>
                o.delivery?.driverId === d.id &&
                monthKey(o.delivery.date) === month,
            )
            const done = mine.filter(
              (o) => o.delivery!.status === 'dostavljeno',
            )
            return (
              <div
                key={d.id}
                className="flex items-center gap-4 rounded-xl border border-walnut-200 bg-white/60 p-4"
              >
                <Avatar employee={d} size="lg" />
                <div className="flex-1">
                  <div className="font-semibold">{d.name}</div>
                  <div className="text-xs text-walnut-500">
                    {done.length} od {mine.length} dostava završeno ·{' '}
                    {mine.filter((o) => o.delivery!.assembly).length} montaža
                  </div>
                  <div className="mt-2">
                    <Progress
                      value={mine.length ? done.length / mine.length : 0}
                      color="#4f6b4a"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
      <Card
        title="Popis zaposlenika"
        subtitle="Uloge, kontakti, ciljevi i stope provizije"
        className="mt-6"
        flush
      >
        <div className="overflow-x-auto">
          <table className="data-table min-w-[720px]">
            <thead>
              <tr>
                <th>Zaposlenik</th>
                <th>Uloga</th>
                <th>Telefon</th>
                <th className="text-right">Osnovni cilj</th>
                <th className="text-right">Provizija</th>
                <th className="text-right" />
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td>
                    <span className="flex items-center gap-2.5">
                      <Avatar employee={e} />{' '}
                      <span className="font-semibold">{e.name}</span>
                    </span>
                  </td>
                  <td className="text-walnut-700">{e.role}</td>
                  <td className="text-walnut-700">
                    {e.phone ? (
                      <a
                        href={`tel:${e.phone}`}
                        className="inline-flex items-center gap-1.5 hover:text-copper-600"
                      >
                        <Phone className="size-3.5" /> {e.phone}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="text-right tabular">
                    {e.role === 'Dostava i montaža'
                      ? '—'
                      : money(e.monthlyTarget)}
                  </td>
                  <td className="text-right tabular">
                    {e.role === 'Dostava i montaža'
                      ? '—'
                      : `${Math.round(e.commissionRate * 1000) / 10}%`}
                  </td>
                  <td className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEdit(e)}
                    >
                      <Pencil className="size-3.5" /> Uredi
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {plan && <TargetsDialog initialMonth={month} onClose={() => setPlan(false)} />}

      {edit && (
        <EmployeeDialog
          employee={edit === 'new' ? null : edit}
          onClose={() => setEdit(null)}
        />
      )}
    </div>
  )
}
