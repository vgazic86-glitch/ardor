import { useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  Boxes,
  ClipboardList,
  CornerDownLeft,
  Search,
  User,
  Clock,
  Send,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { money, orderStatusLabel } from '../lib/format'
import { orderTotal } from '../lib/stats'
import { useStore } from '../lib/store'
import type { Product } from '../lib/types'
import { ProductImage } from './ProductImage'

type Hit = {
  key: string
  icon: typeof Search
  title: string
  meta: string
  go: () => void
  product?: Product
}

const fold = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'dj')

/** Brza pretraga (Ctrl+K) po narudžbama, kupcima i artiklima. */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const { orders, customers, products, customerById, restricted } = useStore()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => input.current?.focus(), [])

  const hits = useMemo<Hit[]>(() => {
    const n = fold(q.trim())
    const close = (fn: () => void) => () => {
      onClose()
      fn()
    }
    if (!n) {
      return [
        {
          key: 'p1',
          icon: ClipboardList,
          title: 'Nova prodaja',
          meta: 'Otvori formu za novu narudžbu',
          go: close(() =>
            navigate({ to: '/narudzbe', search: { nova: true } }),
          ),
        },
        {
          key: 'p5',
          icon: Clock,
          title: 'Radno vrijeme',
          meta: 'Upiši dolazak ili odlazak',
          go: close(() => navigate({ to: '/radno-vrijeme' })),
        },
        {
          key: 'p6',
          icon: Send,
          title: 'Narudžba dobavljaču',
          meta: 'Nova narudžba robe kod dobavljača, PDF za slanje',
          go: close(() => navigate({ to: '/nabava', search: { nova: true } })),
        },
        {
          key: 'p2',
          icon: Boxes,
          title: 'Prijem robe',
          meta: 'Unesi robu koja je stigla od dobavljača',
          go: close(() => navigate({ to: '/primke', search: { nova: true } })),
        },
        {
          key: 'p3',
          icon: Boxes,
          title: 'Inventura',
          meta: 'Prebroji zalihe i knjiži razlike',
          go: close(() => navigate({ to: '/inventura' })),
        },
        {
          key: 'p4',
          icon: ClipboardList,
          title: 'Izvještaji',
          meta: 'Marže, PDV, dugovanja, izvoz u Excel',
          go: close(() => navigate({ to: '/izvjestaji' })),
        },
      ].filter((h) => !restricted || h.key === 'p1' || h.key === 'p5')
    }
    const out: Hit[] = []
    for (const o of orders) {
      const c = customerById(o.customerId)
      if (fold(`${o.number} ${c.name} ${c.phone}`).includes(n))
        out.push({
          key: 'o' + o.id,
          icon: ClipboardList,
          title: `${o.number} · ${c.name}`,
          meta: `${orderStatusLabel[o.status]} · ${money(orderTotal(o))}`,
          go: close(() =>
            navigate({ to: '/narudzbe', search: { otvori: o.id } }),
          ),
        })
      if (out.length >= 6) break
    }
    for (const c of customers)
      if (fold(`${c.name} ${c.phone} ${c.city}`).includes(n))
        out.push({
          key: 'c' + c.id,
          icon: User,
          title: c.name,
          meta: [c.city, c.phone].filter(Boolean).join(' · ') || 'Kupac',
          go: close(() => navigate({ to: '/narudzbe', search: { q: c.name } })),
        })
    for (const p of products)
      if (fold(`${p.sku} ${p.name}`).includes(n))
        out.push({
          key: 'a' + p.id,
          icon: Boxes,
          product: p,
          title: p.name,
          meta: `${p.sku} · na stanju ${p.stock} · ${money(p.price)}`,
          go: close(() =>
            navigate({ to: '/zalihe', search: { artikal: p.id } }),
          ),
        })
    return out.slice(0, 14)
  }, [q, orders, customers, products, customerById, navigate, onClose, restricted])

  useEffect(() => setSel(0), [q])

  return (
    <div
      className="fixed inset-0 z-[55]"
      role="dialog"
      aria-modal="true"
      aria-label="Pretraga"
    >
      <button
        className="absolute inset-0 bg-walnut-950/40 backdrop-blur-[2px]"
        aria-label="Zatvori"
        onClick={onClose}
      />
      <div className="toast-in absolute left-1/2 top-[12vh] w-[min(620px,calc(100%-1.5rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-walnut-200 bg-linen shadow-lift">
        <div className="flex items-center gap-3 border-b border-walnut-200 px-4">
          <Search className="size-5 text-walnut-500" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSel((s) => Math.min(hits.length - 1, s + 1))
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSel((s) => Math.max(0, s - 1))
              }
              if (e.key === 'Enter') hits[sel]?.go()
            }}
            placeholder="Broj narudžbe, kupac, telefon, šifra ili naziv artikla…"
            className="w-full bg-transparent py-4 text-[15px] placeholder:text-walnut-400 focus:outline-none focus-visible:outline-none"
          />
          <kbd className="rounded-md border border-walnut-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-walnut-500">
            Esc
          </kbd>
        </div>
        <ul className="max-h-[56vh] overflow-y-auto p-2">
          {!q && (
            <li className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-walnut-500">
              Brze radnje
            </li>
          )}
          {hits.map((h, i) => (
            <li key={h.key}>
              <button
                onMouseEnter={() => setSel(i)}
                onClick={h.go}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${i === sel ? 'bg-walnut-900 text-linen' : 'text-walnut-900'}`}
              >
                {h.product?.thumbId ? (
                  <ProductImage product={h.product} size="xs" />
                ) : (
                  <span
                    className={`grid size-8 place-items-center rounded-lg ${i === sel ? 'bg-white/10 text-copper-400' : 'bg-walnut-100 text-walnut-600'}`}
                  >
                    <h.icon className="size-4" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {h.title}
                  </span>
                  <span
                    className={`block truncate text-xs ${i === sel ? 'text-walnut-300' : 'text-walnut-500'}`}
                  >
                    {h.meta}
                  </span>
                </span>
                {i === sel ? (
                  <CornerDownLeft className="size-4 text-walnut-300" />
                ) : (
                  <ArrowRight className="size-4 text-walnut-300" />
                )}
              </button>
            </li>
          ))}
          {q && hits.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-walnut-500">
              Ništa nije pronađeno za „{q}”.
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
