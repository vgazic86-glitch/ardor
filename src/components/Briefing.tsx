import { Link } from '@tanstack/react-router'
import { Smartphone, ShieldAlert, AlertTriangle, CalendarCheck, ClipboardList, HandCoins, ListChecks, PackageX, PartyPopper, Sparkles, Truck, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { computeAlerts, workingDaysLeft, type AlertKey } from '../lib/alerts'
import { money } from '../lib/format'
import { useInstall } from '../lib/pwa'
import { revenueIn } from '../lib/stats'
import { useStore } from '../lib/store'
import { targetFor } from '../lib/types'

const ICON: Record<AlertKey, typeof Truck> = {
  zadaci: ListChecks,
  dostave: Truck,
  kasni: AlertTriangle,
  zaliha: PackageX,
  ponude: ClipboardList,
  dug: HandCoins,
  sigurnost: ShieldAlert,
}
const TONE: Record<string, string> = {
  copper: 'border-copper-200 bg-copper-50 text-copper-800',
  bad: 'border-rose-200 bg-rose-50 text-rose-800',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
}

/** Doba dana u Banjoj Luci. */
export function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Europe/Sarajevo' }).format(new Date()))
  return h < 11 ? 'Dobro jutro' : h < 18 ? 'Dobar dan' : 'Dobro veče'
}

/** Jutarnji brifing: šta danas traži pažnju i koliko fali do plana. */
export function Briefing() {
  const { orders, products, today, currentMonth, openTasks, restricted, me, salesPeople } = useStore()
  const alerts = useMemo(
    () => computeAlerts({ orders, products, today, openTasks, ownEmployeeId: restricted ? (me?.id ?? null) : null }),
    [orders, products, today, openTasks, restricted, me],
  )
  const mine = restricted ? orders.filter((o) => o.employeeId === me?.id) : orders
  const revenue = revenueIn(mine, currentMonth)
  const plan = restricted ? (me ? targetFor(me, currentMonth) : 0) : salesPeople.reduce((s, e) => s + targetFor(e, currentMonth), 0)
  const gap = Math.max(0, plan - revenue)
  const days = workingDaysLeft(today)
  const achieved = plan > 0 && revenue >= plan
  const pwa = useInstall()

  return (
    <>
      {pwa.canInstall && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-copper-200 bg-copper-50 px-4 py-3 text-sm">
          <Smartphone className="size-5 shrink-0 text-copper-600" />
          <span className="flex-1">Instalirajte ARDOR kao aplikaciju — otvara se jednim dodirom, bez adresne trake.</span>
          <button className="rounded-lg bg-copper-500 px-3 py-1.5 font-semibold text-white hover:bg-copper-600" onClick={() => pwa.install()}>
            Instaliraj
          </button>
        </div>
      )}
      {achieved && <Celebration who={restricted ? 'Vaš' : 'Salonski'} revenue={revenue} plan={plan} month={currentMonth} />}
      <section className="mb-6 overflow-hidden rounded-2xl border border-walnut-200/70 bg-linen shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-walnut-200/60 px-5 py-3">
          <Sparkles className="size-4 text-copper-500" />
          <h2 className="font-display text-base font-semibold">Danas u salonu</h2>
          {plan > 0 && (
            <span className="ml-auto text-sm text-walnut-600">
              {achieved ? (
                <b className="text-emerald-700">Plan je ostvaren ({money(revenue)})</b>
              ) : (
                <>
                  Do plana {restricted ? 'vam ' : ''}nedostaje <b className="text-walnut-900">{money(gap)}</b>
                  {days > 0 && (
                    <>
                      {' '}
                      · oko <b className="text-walnut-900">{money(gap / days)}</b> dnevno ({days} radnih dana)
                    </>
                  )}
                </>
              )}
            </span>
          )}
        </div>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-4 text-sm text-emerald-800">
            <CalendarCheck className="size-5" /> Sve je pod kontrolom — nema dostava, kašnjenja ni otvorenih zadataka.
          </div>
        ) : (
          <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {alerts.map((a) => {
              const Icon = ICON[a.key]
              return (
                <Link
                  key={a.key}
                  to={a.to}
                  search={a.search as never}
                  className={`group flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-transform hover:-translate-y-0.5 ${TONE[a.tone]}`}
                >
                  <Icon className="size-5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{a.title}</span>
                    <span className="block truncate text-xs opacity-80">{a.detail}</span>
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}

const COLORS = ['#F15A29', '#F79328', '#58595B', '#C98D55', '#4f6b4a']

/** Čestitka s konfetama kad se ostvari mjesečni plan; može se zatvoriti (pamti se za taj mjesec). */
function Celebration({ who, revenue, plan, month }: { who: string; revenue: number; plan: number; month: string }) {
  const key = `ardor.plan-slavlje.${month}`
  const [show, setShow] = useState(false)
  useEffect(() => {
    try {
      setShow(localStorage.getItem(key) !== 'zatvoreno')
    } catch {
      setShow(true)
    }
  }, [key])
  if (!show) return null
  const pieces = Array.from({ length: 36 }, (_, i) => i)
  return (
    <div className="pop relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-[#F15A29] to-[#F79328] px-6 py-5 text-white shadow-lift">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {pieces.map((i) => (
          <span
            key={i}
            className="confetti"
            style={
              {
                left: `${(i * 37) % 100}%`,
                background: COLORS[i % COLORS.length],
                '--delay': `${(i % 9) * 0.25}s`,
                '--dur': `${2.2 + (i % 5) * 0.3}s`,
                '--dx': `${((i % 7) - 3) * 18}px`,
                '--rot': `${360 + (i % 4) * 120}deg`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className="relative flex items-center gap-4">
        <PartyPopper className="size-10 shrink-0" />
        <div className="flex-1">
          <div className="font-display text-2xl font-bold">Bravo! {who} plan za ovaj mjesec je ostvaren.</div>
          <div className="text-sm text-white/90">
            {money(revenue)} od plana {money(plan)} — {Math.round((revenue / plan) * 100)} %. Sve preko ovoga je čist plus!
          </div>
        </div>
        <button
          className="rounded-lg p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
          aria-label="Zatvori čestitku"
          onClick={() => {
            try {
              localStorage.setItem(key, 'zatvoreno')
            } catch {
              /* nije važno */
            }
            setShow(false)
          }}
        >
          <X className="size-5" />
        </button>
      </div>
    </div>
  )
}
