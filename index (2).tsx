import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ClipboardList,
  FileText,
  HandCoins,
  TrendingUp,
  Truck,
  Clock,
} from 'lucide-react'
import {
  CategoryChart,
  EmployeeChart,
  RevenueChart,
  categoryColors,
} from '../components/Charts'
import {
  Avatar,
  Card,
  DeliveryBadge,
  Delta,
  OrderBadge,
  PageHeader,
  Progress,
  Stat,
} from '../components/ui'
import {
  count,
  date,
  dateShort,
  money,
  monthLong,
  monthShort,
  weekday,
} from '../lib/format'
import {
  categoryRevenue,
  employeeStats,
  isRevenue,
  lastMonths,
  monthKey,
  orderTotal,
  outstanding,
  previousMonthKey,
  revenueIn,
} from '../lib/stats'
import { useStore } from '../lib/store'

export const Route = createFileRoute('/')({ component: Overview })

function Overview() {
  const {
    orders,
    products,
    salesPeople,
    today: TODAY,
    currentMonth,
    customerById,
    employeeById,
    productById,
    me,
    restricted,
  } = useStore()
  /** Trgovac vidi samo svoje brojke. */
  const mine = restricted ? orders.filter((o) => o.employeeId === me?.id) : orders
  const months = lastMonths(currentMonth, 12)
  const monthly = months.map((k) => revenueIn(mine, k))
  const thisMonth = revenueIn(mine, currentMonth)
  const prevMonth = revenueIn(mine, previousMonthKey(currentMonth))
  const monthOrders = mine.filter(
    (o) => monthKey(o.date) === currentMonth && isRevenue(o),
  )
  const avg = monthOrders.length ? thisMonth / monthOrders.length : 0
  const receivable = mine.reduce((s, o) => s + outstanding(o), 0)
  const openOffers = mine.filter((o) => o.status === 'ponuda')
  const team = employeeStats(orders, currentMonth, salesPeople).sort(
    (a, b) => b.revenue - a.revenue,
  )
  const teamTarget = salesPeople.reduce((s, e) => s + e.monthlyTarget, 0)
  const cats = categoryRevenue(mine, months.slice(-3), productById)
  const catTotal = cats.reduce((s, [, v]) => s + v, 0)

  const upcoming = orders
    .filter(
      (o) =>
        o.delivery &&
        o.delivery.status !== 'dostavljeno' &&
        o.delivery.date >= TODAY,
    )
    .sort((a, b) =>
      (a.delivery!.date + a.delivery!.slot).localeCompare(
        b.delivery!.date + b.delivery!.slot,
      ),
    )
    .slice(0, 6)
  const lowStock = products.filter(
    (p) => p.stock <= p.minStock && p.minStock > 0,
  )
  const recent = orders.slice(0, 6)
  const curM = Number(currentMonth.slice(5)) - 1

  return (
    <div className="rise">
      <PageHeader
        eyebrow={`${monthLong(curM)} ${currentMonth.slice(0, 4)}.`}
        title={me ? `Dobar dan, ${me.name.split(' ')[0]}` : 'Dobar dan'}
        description={restricted ? 'Vaše prodaje, cilj, dostave i roba koju treba pratiti.' : 'Pregled prometa, narudžbi i dostava salona na jednom mjestu.'}
        actions={
          restricted ? (
            <Link
              to="/radno-vrijeme"
              className="inline-flex items-center gap-2 rounded-lg border border-walnut-200 bg-linen px-3.5 py-2 text-sm font-semibold shadow-sm hover:bg-white"
            >
              <Clock className="size-4 text-copper-600" /> Dolazak / odlazak
            </Link>
          ) : <Link
            to="/izvjestaji"
            className="inline-flex items-center gap-2 rounded-lg border border-walnut-200 bg-linen px-3.5 py-2 text-sm font-semibold shadow-sm hover:bg-white"
          >
            <BarChart3 className="size-4 text-copper-600" /> Izvještaji i marže
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat
          tone="accent"
          icon={TrendingUp}
          label={restricted ? 'Moj promet ovog mjeseca' : 'Promet ovog mjeseca'}
          value={money(thisMonth)}
          hint={
            <>
              <Delta value={prevMonth ? thisMonth / prevMonth - 1 : NaN} /> u
              odnosu na {monthShort((curM + 11) % 12)}
            </>
          }
        />
        <Stat
          icon={ClipboardList}
          label={restricted ? 'Moje narudžbe ovog mjeseca' : 'Narudžbe ovog mjeseca'}
          value={count(monthOrders.length)}
          hint={`Prosjek ${money(avg)}`}
        />
        <Stat
          icon={FileText}
          label="Otvorene ponude"
          value={count(openOffers.length)}
          hint={`Vrijednost ${money(openOffers.reduce((s, o) => s + orderTotal(o), 0))}`}
        />
        <Stat
          tone="warn"
          icon={HandCoins}
          label="Nenaplaćeno"
          value={money(receivable)}
          hint="Avansi i ostatak za naplatu"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card
          title={restricted ? 'Moj promet — zadnjih 12 mjeseci' : 'Promet — zadnjih 12 mjeseci'}
          action={
            <span className="text-xs text-walnut-500">
              bez ponuda i otkazanih
            </span>
          }
        >
          <RevenueChart
            labels={months.map((k) => monthShort(Number(k.slice(5)) - 1))}
            values={monthly}
          />
        </Card>

        {restricted ? (
          <Card title="Moj cilj ovaj mjesec">
            <div className="font-display text-3xl font-semibold tabular">{money(thisMonth)}</div>
            <div className="mt-1 text-sm text-walnut-600">od cilja {money(me?.monthlyTarget ?? 0)}</div>
            <div className="mt-4">
              <Progress value={me?.monthlyTarget ? thisMonth / me.monthlyTarget : 0} />
            </div>
            <p className="mt-3 text-xs text-walnut-500">
              {me?.monthlyTarget
                ? thisMonth >= me.monthlyTarget
                  ? 'Cilj je ostvaren. Odlično!'
                  : `Do cilja nedostaje ${money(me.monthlyTarget - thisMonth)}.`
                : 'Cilj još nije postavljen.'}
            </p>
          </Card>
        ) : <Card
          title="Tim ovaj mjesec"
          action={
            <Link
              to="/zaposlenici"
              className="text-xs font-semibold text-copper-600 hover:underline"
            >
              Detalji
            </Link>
          }
        >
          <div className="mb-4">
            <div className="flex justify-between text-xs text-walnut-700 mb-1.5">
              <span>Cilj salona</span>
              <span className="tabular font-semibold">
                {money(thisMonth)} / {money(teamTarget)}
              </span>
            </div>
            <Progress value={teamTarget ? thisMonth / teamTarget : 0} />
          </div>
          <ul className="divide-y divide-walnut-100">
            {team.map((t, i) => (
              <li
                key={t.employee.id}
                className="flex items-center gap-3 py-2.5"
              >
                <span className="w-4 text-xs font-bold text-walnut-500">
                  {i + 1}
                </span>
                <Avatar employee={t.employee} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {t.employee.name}
                  </div>
                  <div className="text-xs text-walnut-500">
                    {t.orders} narudžbi · {Math.round(t.targetPct * 100)}% cilja
                  </div>
                </div>
                <div className="text-sm font-semibold tabular">
                  {money(t.revenue)}
                </div>
              </li>
            ))}
          </ul>
        </Card>}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card
          title="Nadolazeće dostave"
          className="xl:col-span-2"
          action={
            <Link
              to="/dostave"
              className="text-xs font-semibold text-copper-600 hover:underline"
            >
              Raspored
            </Link>
          }
        >
          {upcoming.length === 0 ? (
            <p className="text-sm text-walnut-500">Nema zakazanih dostava.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {upcoming.map((o) => {
                const d = o.delivery!
                const c = customerById(o.customerId)
                return (
                  <li
                    key={o.id}
                    className="flex gap-3 rounded-xl border border-walnut-100 bg-white/60 p-3"
                  >
                    <div
                      className={`grid w-12 shrink-0 place-items-center rounded-lg py-1.5 text-center ${d.date === TODAY ? 'bg-copper-500 text-white' : 'bg-walnut-100 text-walnut-800'}`}
                    >
                      <div className="text-[10px] font-semibold uppercase">
                        {weekday(d.date)}
                      </div>
                      <div className="font-display text-lg font-semibold leading-none">
                        {Number(d.date.slice(8))}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">
                          {c.name}
                        </span>
                        <DeliveryBadge status={d.status} />
                      </div>
                      <div className="truncate text-xs text-walnut-500">
                        {d.address}, {d.city}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-walnut-700">
                        <Truck className="size-3.5" /> {d.slot} h ·{' '}
                        {employeeById(d.driverId).name.split(' ')[0]}
                        {d.assembly && ' · montaža'}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card title="Kategorije (3 mj.)">
          <CategoryChart
            labels={cats.map(([c]) => c)}
            values={cats.map(([, v]) => v)}
          />
          <ul className="mt-4 space-y-1.5 text-sm">
            {cats.map(([c, v], i) => (
              <li key={c} className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-sm"
                  style={{ background: categoryColors[i] }}
                />
                <span className="flex-1 truncate">{c}</span>
                <span className="tabular text-walnut-500">
                  {Math.round((v / (catTotal || 1)) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card
          title="Zadnje narudžbe"
          action={
            <Link
              to="/narudzbe"
              className="inline-flex items-center gap-1 text-xs font-semibold text-copper-600 hover:underline"
            >
              Sve narudžbe <ArrowRight className="size-3" />
            </Link>
          }
        >
          <div className="overflow-x-auto -mx-5">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-walnut-500">
                  <th className="px-5 pb-2 font-semibold">Broj</th>
                  <th className="pb-2 font-semibold">Kupac</th>
                  <th className="pb-2 font-semibold">Prodavač</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="px-5 pb-2 text-right font-semibold">Iznos</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id} className="border-t border-walnut-100">
                    <td className="px-5 py-2.5">
                      <div className="font-semibold">{o.number}</div>
                      <div className="text-xs text-walnut-500">
                        {date(o.date)}
                      </div>
                    </td>
                    <td className="py-2.5">
                      {customerById(o.customerId).name}
                    </td>
                    <td className="py-2.5">
                      <Avatar employee={employeeById(o.employeeId)} size="sm" />
                    </td>
                    <td className="py-2.5">
                      <OrderBadge status={o.status} />
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold tabular">
                      {money(orderTotal(o))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Treba pažnju">
          <ul className="space-y-3 text-sm">
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-start gap-3">
                <AlertTriangle
                  className={`mt-0.5 size-4 shrink-0 ${p.stock === 0 ? 'text-rose-600' : 'text-amber-600'}`}
                />
                <div className="flex-1">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-walnut-500">
                    {p.stock === 0
                      ? 'Nema na stanju'
                      : `Na stanju ${p.stock} (min. ${p.minStock})`}{' '}
                    · {p.supplier}, {p.leadTimeDays} dana
                  </div>
                </div>
              </li>
            ))}
            {openOffers.slice(0, 3).map((o) => (
              <li key={o.id} className="flex items-start gap-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-copper-500" />
                <div className="flex-1">
                  <div className="font-semibold">
                    Ponuda {o.number} čeka potvrdu
                  </div>
                  <div className="text-xs text-walnut-500">
                    {customerById(o.customerId).name} · {money(orderTotal(o))} ·
                    od {dateShort(o.date)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {!restricted && (
        <Card title="Promet po zaposleniku — ovaj mjesec" className="mt-6">
          <EmployeeChart
            labels={team.map((t) => t.employee.name)}
            values={team.map((t) => t.revenue)}
            colors={team.map((t) => t.employee.color)}
          />
        </Card>
      )}
    </div>
  )
}
