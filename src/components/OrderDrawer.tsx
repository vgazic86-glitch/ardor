import {
  FileText,
  Hourglass,
  CalendarDays,
  MapPin,
  Phone,
  Truck,
  Wrench,
  Hammer,
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
import { goodsBlock, orderTotal, waitingOrders } from '../lib/stats'
import { PaymentTerms } from './PaymentTerms'
import { WORK_STATUS_LABEL } from '../lib/pomjeri'
import { useStore } from '../lib/store'
import { openDownload } from '../lib/files'
import { customerDocPdfFn } from '../server/api'
import { Modal } from './Modal'
import { CustomerMessage } from './CustomerMessage'
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
    products,
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
  async function doc(kind: 'ponuda' | 'predracun' | 'racun' | 'otpremnica') {
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
  const missing = waitingOrders(orders, products).get(order.id)

  const c = customerById(order.customerId)
  const e = employeeById(order.employeeId)
  const total = orderTotal(order)
  const left = Math.max(0, total - order.paid)
  const step = flow.indexOf(order.status)
  const next = step >= 0 && step < flow.length - 1 ? flow[step + 1] : null
  // „Spremna” / „Isporučena” nisu dozvoljene dok prodaja čeka robu (provjerava i server).
  const blocked = next ? goodsBlock(orders, products, order.id, next) : null
  // Po mjeri: „Spremna”/isporuka tek kad je radni nalog gotov (server provjerava isto).
  const workOpen = order.items.filter((i) => i.customName && order.status !== 'ponuda' && i.work?.status !== 'gotovo')
  const workBlocked = !!next && (next === 'spremna' || next === 'isporučena') && workOpen.length > 0

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
            <Button
              disabled={!!blocked || workBlocked}
              title={blocked ? 'Prodaja čeka robu — status je moguć kad roba stigne u salon.' : workBlocked ? 'Namještaj po mjeri još nije gotov — status je moguć kad radionica označi nalog „Gotovo”.' : undefined}
              onClick={() => setOrderStatus(order.id, next)}
            >
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
              : (['predracun', 'racun', 'otpremnica'] as const)
            ).map((k) => {
              // Račun se izdaje tek kad je kupac nešto platio (predujam ili cijeli iznos).
              const noPayment = k === 'racun' && order.paid <= 0
              return (
                <Button
                  key={k}
                  variant="outline"
                  size="sm"
                  disabled={!!docBusy || noPayment}
                  title={noPayment ? 'Račun se izdaje kad kupac nešto plati. Prvo upišite uplatu.' : undefined}
                  onClick={() => doc(k)}
                >
                  <FileText className="size-3.5" />
                  {docBusy === k
                    ? 'Izrađujem…'
                    : k === 'ponuda'
                      ? 'Ponuda PDF'
                      : k === 'predracun'
                        ? 'Predračun PDF'
                        : k === 'racun'
                          ? left > 0
                            ? 'Račun za predujam PDF'
                            : 'Konačni račun PDF'
                          : 'Otpremnica PDF'}
                </Button>
              )
            })}
          </div>
        </div>
      }
    >
      {missing && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Hourglass className="mt-0.5 size-4 shrink-0" />
          <div>
            <div className="font-semibold">Narudžba kupca — čeka robu</div>
            <div className="text-xs">
              {missing.map((m) => `${productById(m.productId).name}: nedostaje ${m.missing} od ${m.qty}`).join(' · ')}. Kad se upiše primka, oznaka nestaje sama.
            </div>
            {blocked && next && (
              <div className="mt-1 text-xs font-semibold">
                Status „{orderStatusLabel[next]}” nije moguć dok roba ne stigne u salon.
              </div>
            )}

          </div>
        </div>
      )}
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
        {order.items.map((it, idx) => {
          const p = productById(it.productId)
          return (
            <li
              key={it.id ?? `${it.productId}-${idx}`}
              className="flex items-center gap-3 px-4 py-3 text-sm"
            >
              {it.thumbId && (
                <a href={`/api/slike/${it.imageId ?? it.thumbId}`} target="_blank" rel="noopener" title="Otvori sliku">
                  <img src={`/api/slike/${it.thumbId}`} alt="" className="size-14 rounded-lg object-cover ring-1 ring-walnut-200" />
                </a>
              )}
              <div className="flex-1">
                <div className="font-semibold">{it.customName || p.name}</div>
                {it.variant && <div className="text-xs font-medium text-copper-700">{it.variant}</div>}
                {it.description && <div className="whitespace-pre-wrap text-xs text-walnut-600">{it.description}</div>}
                {it.customName && (
                  <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold">
                    <Hammer className="size-3 text-copper-600" />
                    {it.work ? (
                      <span className={it.work.status === 'gotovo' ? 'text-emerald-700' : 'text-copper-700'}>
                        {it.work.number}: {WORK_STATUS_LABEL[it.work.status]}
                        {it.work.dueDate ? ` · rok ${date(it.work.dueDate)}` : ''}
                      </span>
                    ) : (
                      <span className="text-walnut-500">Po mjeri — radni nalog nastaje kad se prodaja potvrdi</span>
                    )}
                  </div>
                )}
                <div className="text-xs text-walnut-500">
                  {it.customName ? 'po mjeri' : p.sku} · {it.qty} × {money(it.unitPrice)}
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
      <PaymentTerms key={order.id + '-' + (order.installments?.length ?? 0) + (order.dueDate ?? '')} order={order} />
      <CustomerMessage key={order.id + order.status} order={order} customer={c} left={left} />
    </Modal>
  )
}
