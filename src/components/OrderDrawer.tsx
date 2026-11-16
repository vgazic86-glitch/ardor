import {
  FileText,
  CalendarDays,
  MapPin,
  Phone,
  Printer,
  Truck,
  Wrench,
} from 'lucide-react'
import { useState } from 'react'
import type { OrderStatus } from '../lib/types'
import {
  date,
  deliveryStatusLabel,
  money,
  money2,
  orderStatusLabel,
} from '../lib/format'
import { orderTotal } from '../lib/stats'
import { useStore } from '../lib/store'
import { openDownload } from '../lib/files'
import { customerDocPdfFn } from '../server/api'
import { Modal } from './Modal'
import {
  Avatar,
  Button,
  DeliveryBadge,
  OrderBadge,
  Progress,
  inputCls,
} from './ui'

const flow: OrderStatus[] = [
  'ponuda',
  'potvrđena',
  'u_izradi',
  'spremna',
  'isporučena',
]

export function OrderDrawer({
  orderId,
  onClose,
}: {
  orderId: string | null
  onClose: () => void
}) {
  const {
    orders,
    setOrderStatus,
    addPayment,
    customerById,
    employeeById,
    productById,
    restricted,
    notify,
  } = useStore()
  const [amount, setAmount] = useState('')
  const [docBusy, setDocBusy] = useState<string | null>(null)
  async function doc(kind: 'ponuda' | 'predracun' | 'otpremnica') {
    setDocBusy(kind)
    try {
      const f = await customerDocPdfFn({ data: { orderId: orderId!, kind } })
      openDownload({ name: f.name, mime: 'application/pdf', dataB64: f.data })
    } catch (e) {
      notify(e instanceof Error ? e.message : 'PDF nije izrađen.')
    } finally {
      setDocBusy(null)
    }
  }
  const order = orders.find((o) => o.id === orderId)
  if (!order) return null

  const c = customerById(order.customerId)
  const e = employeeById(order.employeeId)
  const total = orderTotal(order)
  const left = Math.max(0, total - order.paid)
  const step = flow.indexOf(order.status)
  const next = step >= 0 && step < flow.length - 1 ? flow[step + 1] : null

  return (
    <Modal
      side
      help="narudzba"
      title={order.number}
      subtitle={
        <span className="flex items-center gap-2">
          {date(order.date)} · <OrderBadge status={order.status} />
          {order.issuedAt && (
            <span className="text-xs">
              · roba izašla {date(order.issuedAt)}
            </span>
          )}
        </span>
      }
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          {next && (
            <Button onClick={() => setOrderStatus(order.id, next)}>
              Označi: {orderStatusLabel[next]}
            </Button>
          )}
          {order.status !== 'otkazana' && order.status !== 'isporučena' && (
            <Button
              variant="ghost"
              onClick={() => setOrderStatus(order.id, 'otkazana')}
            >
              Otkaži
            </Button>
          )}
          <div className="ml-auto flex flex-wrap gap-1.5">
            {(order.status === 'ponuda'
              ? (['ponuda'] as const)
              : (['predracun', 'otpremnica'] as const)
            ).map((k) => (
              <Button key={k} variant="outline" size="sm" disabled={!!docBusy} onClick={() => doc(k)}>
                <FileText className="size-3.5" />
                {docBusy === k ? 'Izrađujem…' : k === 'ponuda' ? 'Ponuda PDF' : k === 'predracun' ? 'Predračun PDF' : 'Otpremnica PDF'}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => window.print()}>
              <Printer className="size-3.5" /> Ispis
            </Button>
          </div>
        </div>
      }
    >
      {order.status !== 'otkazana' && (
        <ol className="mb-6 grid grid-cols-5 gap-1.5">
          {flow.map((s, i) => (
            <li key={s}>
              <div
                className={`h-1.5 rounded-full ${i <= step ? 'bg-copper-500' : 'bg-walnut-200'}`}
              />
              <div
                className={`mt-1.5 text-[10px] font-semibold uppercase tracking-wide ${i <= step ? 'text-walnut-900' : 'text-walnut-500'}`}
              >
                {orderStatusLabel[s]}
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-walnut-200 bg-linen p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-walnut-500">
            Kupac
          </div>
          <div className="mt-1 font-semibold">{c.name}</div>
          <div className="mt-2 space-y-1 text-sm text-walnut-700">
            <div className="flex items-center gap-2">
              <Phone className="size-3.5" /> {c.phone}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="size-3.5" /> {c.address}, {c.city}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-walnut-200 bg-linen p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-walnut-500">
            Prodavač
          </div>
          <div className="mt-2 flex items-center gap-2.5">
            <Avatar employee={e} />
            <div>
              <div className="font-semibold">{e.name}</div>
              <div className="text-xs text-walnut-500">{e.role}</div>
            </div>
          </div>
          {!restricted && (
            <div className="mt-2 text-xs text-walnut-700">
              Provizija: {money2(total * e.commissionRate)}
            </div>
          )}
        </div>
      </div>

      <h3 className="mt-6 mb-2 font-display text-lg font-semibold">Stavke</h3>
      <ul className="divide-y divide-walnut-100 rounded-xl border border-walnut-200 bg-white/70">
        {order.items.map((it) => {
          const p = productById(it.productId)
          return (
            <li
              key={it.productId}
              className="flex items-center gap-3 px-4 py-3 text-sm"
            >
              <div className="flex-1">
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-walnut-500">
                  {p.sku} · {it.qty} × {money(it.unitPrice)}
                  {it.discountPct ? ` · popust ${it.discountPct}%` : ''}
                </div>
              </div>
              <div className="font-semibold tabular">
                {money(it.qty * it.unitPrice * (1 - it.discountPct / 100))}
              </div>
            </li>
          )
        })}
        <li className="flex justify-between px-4 py-3 text-sm font-bold">
          <span>Ukupno</span>
          <span className="tabular">{money2(total)}</span>
        </li>
      </ul>

      <h3 className="mt-6 mb-2 font-display text-lg font-semibold">Plaćanje</h3>
      <div className="rounded-xl border border-walnut-200 bg-linen p-4">
        <div className="flex justify-between text-sm">
          <span>Način plaćanja</span>
          <span className="font-semibold">{order.paymentMethod}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span>Plaćeno</span>
          <span className="font-semibold tabular">{money2(order.paid)}</span>
        </div>
        <div className="mt-1 mb-3 flex justify-between text-sm">
          <span>Preostalo</span>
          <span
            className={`font-semibold tabular ${left > 0 ? 'text-copper-600' : 'text-moss-600'}`}
          >
            {money2(left)}
          </span>
        </div>
        <Progress value={total ? order.paid / total : 0} color="#4f6b4a" />
        {left > 0 && order.status !== 'otkazana' && (
          <form
            className="mt-4 flex gap-2"
            onSubmit={(ev) => {
              ev.preventDefault()
              const v = Number(amount.replace(',', '.'))
              if (v > 0) addPayment(order.id, v)
              setAmount('')
            }}
          >
            <input
              className={inputCls}
              inputMode="decimal"
              placeholder={`Uplata (npr. ${Math.round(left)})`}
              value={amount}
              onChange={(ev) => setAmount(ev.target.value)}
            />
            <Button type="submit" variant="outline">
              Evidentiraj
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => addPayment(order.id, left)}
            >
              Sve
            </Button>
          </form>
        )}
      </div>

      <h3 className="mt-6 mb-2 font-display text-lg font-semibold">Dostava</h3>
      {order.delivery ? (
        <div className="rounded-xl border border-walnut-200 bg-linen p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-semibold">
              <CalendarDays className="size-4" /> {date(order.delivery.date)},{' '}
              {order.delivery.slot} h
            </span>
            <DeliveryBadge status={order.delivery.status} />
          </div>
          <div className="mt-2 flex items-center gap-2 text-walnut-700">
            <MapPin className="size-3.5" /> {order.delivery.address},{' '}
            {order.delivery.city}
          </div>
          <div className="mt-1 flex items-center gap-2 text-walnut-700">
            <Truck className="size-3.5" />{' '}
            {employeeById(order.delivery.driverId).name}
          </div>
          {order.delivery.assembly && (
            <div className="mt-1 flex items-center gap-2 text-walnut-700">
              <Wrench className="size-3.5" /> Uključena montaža
            </div>
          )}
          <div className="sr-only">
            {deliveryStatusLabel[order.delivery.status]}
          </div>
        </div>
      ) : (
        <p className="text-sm text-walnut-500">
          Kupac preuzima u salonu ili dostava još nije zakazana.
        </p>
      )}

      {order.note && (
        <>
          <h3 className="mt-6 mb-2 font-display text-lg font-semibold">
            Napomena
          </h3>
          <p className="rounded-xl bg-copper-100 p-4 text-sm text-walnut-800">
            {order.note}
          </p>
        </>
      )}
    </Modal>
  )
}
