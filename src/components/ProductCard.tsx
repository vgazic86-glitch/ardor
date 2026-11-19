import { ArrowDownLeft, ArrowUpRight, Pencil } from 'lucide-react'
import { useState } from 'react'
import {
  date,
  money,
  money2,
  movementLabel,
  movementTone,
  netOf,
  pct,
} from '../lib/format'
import { reservedQty } from '../lib/stats'
import { useStore } from '../lib/store'
import { Modal } from './Modal'
import { ProductDialog } from './ProductDialog'
import { ProductImageEditor } from './ProductImage'
import { Badge, Button } from './ui'

/** Kartica artikla: stanje, cijene i sva kretanja s tekućim saldom. */
export function ProductCard({
  productId,
  onClose,
}: {
  productId: string
  onClose: () => void
}) {
  const { products, movements, orders, receipts, employeeById, seesCosts, full } = useStore()
  const restricted = !seesCosts
  const [edit, setEdit] = useState(false)
  const p = products.find((x) => x.id === productId)
  if (!p) return null

  const reserved = reservedQty(orders).get(p.id) ?? 0
  let bal = 0
  const rows = movements
    .filter((m) => m.productId === p.id)
    .map((m) => ({ ...m, bal: (bal += m.qty) }))
    .reverse()
  const orderNo = (id: string | null) => orders.find((o) => o.id === id)?.number
  const receiptNo = (id: string | null) =>
    receipts.find((r) => r.id === id)?.number
  const net = netOf(p.price)
  const sold = rows
    .filter((m) => m.type === 'izlaz')
    .reduce((s, m) => s - m.qty, 0)

  return (
    <>
      <Modal
        side
        help="artikal"
        title={p.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {p.sku}
            {p.fiscalSku && <span>· fiskalni: <b className="font-semibold">{p.fiscalSku}</b></span>}
            · {p.category}
          </span>
        }
        onClose={onClose}
        footer={
          restricted ? undefined : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEdit(true)}>
                <Pencil className="size-4" /> Uredi artikal
              </Button>
            </div>
          )
        }
      >
        <div className="mb-4">
          {restricted ? (
            p.imageId ? (
              <img src={`/api/slike/${p.imageId}`} alt={p.name} className="aspect-[4/3] w-full rounded-xl border border-walnut-200 object-cover" />
            ) : null
          ) : (
            <ProductImageEditor product={p} />
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            [
              'Na stanju',
              String(p.stock),
              p.stock <= p.minStock ? 'text-copper-600' : '',
            ],
            ['Rezervisano', String(reserved), ''],
            [
              'Slobodno',
              String(p.stock - reserved),
              p.stock - reserved < 0 ? 'text-rose-700' : 'text-moss-600',
            ],
          ].map(([l, v, c]) => (
            <div
              key={l}
              className="rounded-xl border border-walnut-200 bg-linen p-3"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-walnut-500">
                {l}
              </div>
              <div
                className={`mt-0.5 font-display text-2xl font-semibold tabular ${c}`}
              >
                {v}
              </div>
            </div>
          ))}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-walnut-200 bg-linen p-4 text-sm">
          <dt className="text-walnut-500">Maloprodajna cijena</dt>
          <dd className="text-right font-semibold tabular">
            {money2(p.price)}
          </dd>
          {!restricted && (
            <>
              <dt className="text-walnut-500">Prosječna nabavna</dt>
              <dd className="text-right font-semibold tabular">
                {money2(p.avgCost)}
              </dd>
              {full && (
                <>
                  <dt className="text-walnut-500">Marža (bez PDV-a)</dt>
                  <dd className="text-right font-semibold tabular text-moss-600">
                    {net ? pct((net - p.avgCost) / net) : '—'}
                  </dd>
                </>
              )}
              <dt className="text-walnut-500">Vrijednost zalihe (nabavna)</dt>
              <dd className="text-right font-semibold tabular">
                {money(Math.max(0, p.stock) * p.avgCost)}
              </dd>
            </>
          )}
          <dt className="text-walnut-500">Minimalna zaliha</dt>
          <dd className="text-right font-semibold tabular">{p.minStock}</dd>
          <dt className="text-walnut-500">Dobavljač</dt>
          <dd className="text-right font-semibold">
            {p.supplier}{' '}
            <span className="font-normal text-walnut-500">
              · {p.leadTimeDays} dana
            </span>
          </dd>
          <dt className="text-walnut-500">Ukupno prodano</dt>
          <dd className="text-right font-semibold tabular">{sold} kom</dd>
        </dl>

        <h3 className="mb-2 mt-6 font-display text-lg font-semibold">
          Kretanja robe
        </h3>
        {rows.length === 0 ? (
          <p className="text-sm text-walnut-500">
            Još nema kretanja za ovaj artikal.
          </p>
        ) : (
          <ol className="relative space-y-0 border-l border-walnut-200 pl-5">
            {rows.map((m) => (
              <li key={m.id} className="relative pb-4 last:pb-0">
                <span
                  className={`absolute -left-[29px] top-0.5 grid size-[18px] place-items-center rounded-full ring-4 ring-paper ${m.qty > 0 ? 'bg-moss-600 text-white' : 'bg-copper-500 text-white'}`}
                >
                  {m.qty > 0 ? (
                    <ArrowDownLeft className="size-3" />
                  ) : (
                    <ArrowUpRight className="size-3" />
                  )}
                </span>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={movementTone[m.type]}>
                        {movementLabel[m.type]}
                      </Badge>
                      <span className="text-xs text-walnut-500">
                        {date(m.date)}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-xs text-walnut-700">
                      {m.receiptId
                        ? `Primka ${receiptNo(m.receiptId) ?? ''}`
                        : m.orderId
                          ? `Narudžba ${orderNo(m.orderId) ?? ''}`
                          : m.note}
                      {m.employeeId && ` · ${employeeById(m.employeeId).name}`}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className={`text-sm font-bold tabular ${m.qty > 0 ? 'text-moss-600' : 'text-copper-600'}`}
                    >
                      {m.qty > 0 ? '+' : ''}
                      {m.qty}
                    </div>
                    <div className="text-[11px] text-walnut-500 tabular">
                      saldo {m.bal}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Modal>
      {edit && <ProductDialog product={p} onClose={() => setEdit(false)} />}
    </>
  )
}
