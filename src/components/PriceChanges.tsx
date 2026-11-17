import { ArrowDown, ArrowUp, Tag } from 'lucide-react'
import { PRICE_NEWS_DAYS } from '../lib/alerts'
import { date, money } from '../lib/format'
import { useStore } from '../lib/store'
import type { PriceChange } from '../lib/types'
import { Modal } from './Modal'
import { ProductImage } from './ProductImage'
import { EmptyState } from './ui'

const days = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)

/** Zadnja promjena cijene artikla, ako je novija od 7 dana. */
export function useFreshPrice() {
  const { priceChanges, today } = useStore()
  const map = new Map<string, PriceChange>()
  for (const c of priceChanges) if (!map.has(c.productId) && days(c.date, today) <= PRICE_NEWS_DAYS) map.set(c.productId, c)
  return map
}

/** Mala oznaka uz artikal: nova cijena, sa starom cijenom u opisu. */
export function PriceBadge({ change }: { change: PriceChange }) {
  const up = change.newPrice > change.oldPrice
  return (
    <span
      title={`Cijena promijenjena ${date(change.date)}: ${money(change.oldPrice)} → ${money(change.newPrice)}`}
      className={`ml-2 inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-px text-[10px] font-bold uppercase tracking-wide ${up ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}
    >
      {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />} nova cijena
    </span>
  )
}

/** Popis promjena cijena u zadnjih 30 dana. */
export function PriceChangesDialog({ onClose, onOpen }: { onClose: () => void; onOpen: (productId: string) => void }) {
  const { priceChanges, productById, today } = useStore()
  return (
    <Modal title="Promjene cijena" subtitle="Zadnjih 30 dana. Nakon promjene zamijenite oznaku cijene na izloženom komadu." onClose={onClose} help={false}>
      {!priceChanges.length ? (
        <EmptyState icon={Tag} title="Nema promjena cijena">
          Kad se artiklu promijeni maloprodajna cijena, pojavit će se ovdje i u obavijestima.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-walnut-100">
          {priceChanges.map((c) => {
            const p = productById(c.productId)
            const up = c.newPrice > c.oldPrice
            const pct = c.oldPrice ? Math.round(((c.newPrice - c.oldPrice) / c.oldPrice) * 100) : 0
            const fresh = days(c.date, today) <= PRICE_NEWS_DAYS
            return (
              <li key={c.id}>
                <button onClick={() => onOpen(c.productId)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-walnut-50">
                  <ProductImage product={p} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {p.name}
                      {fresh && <span className="ml-2 rounded-full bg-copper-100 px-1.5 py-px text-[10px] font-bold uppercase text-copper-700">novo</span>}
                    </span>
                    <span className="block text-xs text-walnut-500">
                      {p.sku} · {date(c.date)}
                      {c.by ? ` · ${c.by}` : ''}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-xs text-walnut-500 line-through">{money(c.oldPrice)}</span>
                    <span className="block font-display text-lg font-semibold tabular">{money(c.newPrice)}</span>
                  </span>
                  <span className={`w-14 text-right text-xs font-bold ${up ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {up ? '+' : ''}
                    {pct} %
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
