import { createFileRoute } from '@tanstack/react-router'
import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import { useState } from 'react'
import { OrderDrawer } from '../components/OrderDrawer'
import {
  Avatar,
  Button,
  Card,
  DeliveryBadge,
  PageHeader,
  Stat,
} from '../components/ui'
import type { DeliveryStatus } from '../lib/types'
import { count, date, dateShort, weekday } from '../lib/format'
import { useStore } from '../lib/store'

export const Route = createFileRoute('/dostave')({ component: DeliveriesPage })

function addDays(iso: string, n: number) {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
function mondayOf(iso: string) {
  const wd = new Date(iso + 'T12:00:00Z').getUTCDay()
  return addDays(iso, wd === 0 ? -6 : 1 - wd)
}

function DeliveriesPage() {
  const {
    orders,
    setDeliveryStatus,
    drivers,
    today: TODAY,
    customerById,
    productById,
  } = useStore()
  const [weekStart, setWeekStart] = useState(mondayOf(TODAY))
  const [day, setDay] = useState(TODAY)
  const [openId, setOpenId] = useState<string | null>(null)

  const withDelivery = orders.filter(
    (o) => o.delivery && o.status !== 'otkazana',
  )
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i))
  const onDay = (d: string) =>
    withDelivery.filter((o) => o.delivery!.date === d)
  const dayList = onDay(day).sort((a, b) =>
    a.delivery!.slot.localeCompare(b.delivery!.slot),
  )
  const upcoming = withDelivery.filter(
    (o) => o.delivery!.date >= TODAY && o.delivery!.status !== 'dostavljeno',
  )
  const postponed = withDelivery.filter(
    (o) => o.delivery!.status === 'odgođena',
  )
  const thisWeek = withDelivery.filter((o) => days.includes(o.delivery!.date))

  const nextStatus: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
    zakazana: 'u_putu',
    u_putu: 'dostavljeno',
    odgođena: 'zakazana',
  }
  const nextLabel: Partial<Record<DeliveryStatus, string>> = {
    zakazana: 'Krenuli',
    u_putu: 'Dostavljeno',
    odgođena: 'Ponovo zakaži',
  }

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Logistika"
        title="Dostave i montaža"
        description="Raspored dostava po danima i ekipama. Ažurirajte status s terena jednim klikom."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          tone="accent"
          icon={CalendarClock}
          label="Danas"
          value={count(onDay(TODAY).length)}
          hint={`${onDay(TODAY).filter((o) => o.delivery!.status === 'dostavljeno').length} završeno`}
        />
        <Stat
          icon={CalendarRange}
          label="Ova sedmica"
          value={count(thisWeek.length)}
          hint={`${thisWeek.filter((o) => o.delivery!.assembly).length} s montažom`}
        />
        <Stat
          icon={CalendarDays}
          label="Nadolazeće ukupno"
          value={count(upcoming.length)}
        />
        <Stat
          tone="warn"
          icon={TriangleAlert}
          label="Odgođeno"
          value={count(postponed.length)}
          hint={
            postponed.length ? 'Treba dogovoriti novi termin' : 'Sve po planu'
          }
        />
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">
            Sedmica {dateShort(days[0])} – {date(days[5])}
          </h2>
          <div className="flex gap-1">
            <Button
              variant="outline"
              aria-label="Prethodna sedmica"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setWeekStart(mondayOf(TODAY))
                setDay(TODAY)
              }}
            >
              Danas
            </Button>
            <Button
              variant="outline"
              aria-label="Sljedeća sedmica"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {days.map((d) => {
            const list = onDay(d)
            const active = d === day
            return (
              <button
                key={d}
                onClick={() => setDay(d)}
                className={`rounded-xl border p-3 text-left transition-colors ${active ? 'border-walnut-900 bg-walnut-900 text-linen' : 'border-walnut-200 bg-white/60 hover:border-walnut-300'}`}
              >
                <div
                  className={`text-xs font-semibold uppercase ${active ? 'text-walnut-300' : 'text-walnut-500'}`}
                >
                  {weekday(d)}{' '}
                  {d === TODAY && (
                    <span
                      className={active ? 'text-copper-400' : 'text-copper-600'}
                    >
                      · danas
                    </span>
                  )}
                </div>
                <div className="font-display text-2xl font-semibold">
                  {Number(d.slice(8))}.
                </div>
                <div className="mt-2 flex gap-1">
                  {list.slice(0, 6).map((o) => (
                    <span
                      key={o.id}
                      className="size-2 rounded-full"
                      style={{
                        background:
                          o.delivery!.status === 'dostavljeno'
                            ? '#4f6b4a'
                            : o.delivery!.status === 'odgođena'
                              ? '#be123c'
                              : '#F79328',
                      }}
                    />
                  ))}
                  {list.length === 0 && (
                    <span
                      className={`text-xs ${active ? 'text-walnut-300' : 'text-walnut-500'}`}
                    >
                      slobodno
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {drivers.map((drv) => {
          const list = dayList.filter((o) => o.delivery!.driverId === drv.id)
          return (
            <Card key={drv.id}>
              <div className="mb-4 flex items-center gap-3">
                <Avatar employee={drv} size="lg" />
                <div>
                  <h3 className="font-display text-lg font-semibold">
                    {drv.name}
                  </h3>
                  <div className="text-xs text-walnut-500">
                    {date(day)} · {list.length}{' '}
                    {list.length === 1 ? 'dostava' : 'dostave'} · {drv.phone}
                  </div>
                </div>
              </div>
              {list.length === 0 ? (
                <p className="rounded-xl border border-dashed border-walnut-200 p-6 text-center text-sm text-walnut-500">
                  Nema dostava za ovaj dan.
                </p>
              ) : (
                <ol className="space-y-3">
                  {list.map((o) => {
                    const d = o.delivery!
                    const c = customerById(o.customerId)
                    const ns = nextStatus[d.status]
                    return (
                      <li
                        key={o.id}
                        className="rounded-xl border border-walnut-200 bg-white/70 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-bold text-copper-600">
                              {d.slot} h
                            </div>
                            <button
                              className="font-semibold hover:text-copper-600"
                              onClick={() => setOpenId(o.id)}
                            >
                              {c.name} · {o.number}
                            </button>
                          </div>
                          <DeliveryBadge status={d.status} />
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-walnut-700">
                          <div className="flex items-center gap-2">
                            <MapPin className="size-3.5 shrink-0" /> {d.address}
                            , {d.city}
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="size-3.5 shrink-0" /> {c.phone}
                          </div>
                          {d.assembly && (
                            <div className="flex items-center gap-2">
                              <Wrench className="size-3.5 shrink-0" /> Montaža
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-walnut-500">
                          {o.items
                            .map(
                              (i) =>
                                `${i.qty}× ${productById(i.productId).name}`,
                            )
                            .join(', ')}
                        </div>
                        {o.note && (
                          <div className="mt-2 rounded-lg bg-copper-100 px-3 py-1.5 text-xs text-walnut-800">
                            {o.note}
                          </div>
                        )}
                        <div className="mt-3 flex gap-2">
                          {ns && (
                            <Button
                              className="!py-1.5 text-xs"
                              onClick={() => setDeliveryStatus(o.id, ns)}
                            >
                              {nextLabel[d.status]}
                            </Button>
                          )}
                          {d.status !== 'dostavljeno' &&
                            d.status !== 'odgođena' && (
                              <Button
                                variant="ghost"
                                className="!py-1.5 text-xs"
                                onClick={() =>
                                  setDeliveryStatus(o.id, 'odgođena')
                                }
                              >
                                Odgodi
                              </Button>
                            )}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </Card>
          )
        })}
      </div>

      {postponed.length > 0 && (
        <Card title="Odgođene dostave" className="mt-6">
          <ul className="divide-y divide-walnut-100 text-sm">
            {postponed.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2.5">
                <button
                  className="font-semibold hover:text-copper-600"
                  onClick={() => setOpenId(o.id)}
                >
                  {o.number}
                </button>
                <span className="flex-1 truncate">
                  {customerById(o.customerId).name} · {o.delivery!.city}
                </span>
                <span className="text-xs text-walnut-500">
                  bilo {date(o.delivery!.date)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <OrderDrawer orderId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}
