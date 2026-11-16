import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Check, Clock, Minus, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Logo } from '../components/Logo'
import { ProductImage } from '../components/ProductImage'
import { money } from '../lib/format'
import { useRemote } from '../lib/remote'
import { CATEGORIES, parseOptions } from '../lib/types'
import { catalogFn } from '../server/api'

export const Route = createFileRoute('/katalog')({ component: CatalogPage })

type Item = Awaited<ReturnType<typeof catalogFn>>[number]
type Sort = 'preporuka' | 'cijena_asc' | 'cijena_desc' | 'naziv'

/** Katalog za pokazivanje kupcu na tabletu: slike, cijene i dostupnost, bez internih podataka. */
function CatalogPage() {
  const navigate = useNavigate()
  const r = useRemote(() => catalogFn(), [])
  const [cat, setCat] = useState<string>('')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('preporuka')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [open, setOpen] = useState<Item | null>(null)
  const [list, setList] = useState<Record<string, number>>({})
  const [showList, setShowList] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const all = r.data ?? []
  const items = useMemo(() => {
    const s = q.trim().toLowerCase()
    const out = all.filter((p) => (!cat || p.category === cat) && (!onlyAvailable || p.available) && (!s || `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(s)))
    if (sort === 'cijena_asc') out.sort((a, b) => a.price - b.price)
    else if (sort === 'cijena_desc') out.sort((a, b) => b.price - a.price)
    else if (sort === 'naziv') out.sort((a, b) => a.name.localeCompare(b.name, 'bs'))
    else out.sort((a, b) => Number(!!b.imageId) - Number(!!a.imageId) || Number(b.available) - Number(a.available))
    return out
  }, [all, cat, q, sort, onlyAvailable])

  const byId = new Map(all.map((p) => [p.id, p]))
  const chosen = Object.entries(list).filter(([id, n]) => n > 0 && byId.has(id))
  const count = chosen.reduce((s, [, n]) => s + n, 0)
  const total = chosen.reduce((s, [id, n]) => s + n * (byId.get(id)?.price ?? 0), 0)
  const add = (id: string, d: number) => setList((l) => ({ ...l, [id]: Math.max(0, (l[id] ?? 0) + d) }))
  const cats = CATEGORIES.filter((c) => all.some((p) => p.category === c))

  const makeOffer = () =>
    navigate({ to: '/narudzbe', search: { nova: true, artikli: chosen.map(([id, n]) => `${id}:${n}`).join(',') } })

  if (!mounted) return null
  return createPortal(
    <div className="fixed inset-0 z-[45] flex flex-col overflow-hidden bg-paper">
      <header className="flex items-center gap-4 border-b border-walnut-200 bg-white/80 px-5 py-3 backdrop-blur">
        <button onClick={() => navigate({ to: '/' })} className="rounded-lg p-2 text-walnut-500 hover:bg-walnut-100" aria-label="Izlaz iz kataloga" title="Izlaz (za osoblje)">
          <ArrowLeft className="size-5" />
        </button>
        <Logo className="h-9 w-auto" />
        <label className="ml-auto flex w-full max-w-sm items-center gap-2 rounded-full border border-walnut-200 bg-linen px-4 py-2.5">
          <Search className="size-5 text-walnut-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Šta tražite? (npr. garnitura, krevet…)" className="w-full bg-transparent text-base outline-none" />
        </label>
        <button onClick={() => setShowList(true)} className="relative flex items-center gap-2 rounded-full bg-walnut-900 px-5 py-2.5 text-sm font-semibold text-linen">
          <ShoppingBag className="size-5" /> Moj izbor
          {count > 0 && <span className="grid size-6 place-items-center rounded-full bg-copper-500 text-xs">{count}</span>}
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-walnut-100 px-5 py-3">
        {['', ...cats].map((c) => (
          <button
            key={c || 'sve'}
            onClick={() => setCat(c)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${cat === c ? 'bg-copper-500 text-white shadow' : 'border border-walnut-200 bg-white text-walnut-700 hover:border-copper-300'}`}
          >
            {c || 'Sve'}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2 text-walnut-700">
            <input type="checkbox" className="size-4 accent-copper-500" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} /> Odmah dostupno
          </label>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-lg border border-walnut-200 bg-white px-3 py-2">
            <option value="preporuka">Preporučeno</option>
            <option value="cijena_asc">Cijena: od niže</option>
            <option value="cijena_desc">Cijena: od više</option>
            <option value="naziv">Naziv</option>
          </select>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-5 py-6">
        {!r.data ? (
          <p className="text-center text-walnut-500">Učitavam katalog…</p>
        ) : !items.length ? (
          <p className="py-20 text-center text-lg text-walnut-500">Nema artikala za odabrani filter.</p>
        ) : (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
            {items.map((p) => (
              <button key={p.id} onClick={() => setOpen(p)} className="group flex flex-col overflow-hidden rounded-3xl border border-walnut-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <ProductImage product={p} size="lg" className="!rounded-none !border-0" />
                <div className="flex flex-1 flex-col p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-copper-600">{p.category}</div>
                  <div className="mt-1 font-display text-lg font-semibold leading-snug">{p.name}</div>
                  <div className="mt-auto flex items-end justify-between pt-3">
                    <span className="font-display text-2xl font-semibold">{money(p.price)}</span>
                    {list[p.id] ? <span className="rounded-full bg-copper-100 px-2 py-0.5 text-xs font-bold text-copper-700">× {list[p.id]}</span> : null}
                  </div>
                  <Availability p={p} />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {count > 0 && !showList && (
        <div className="flex items-center justify-between border-t border-walnut-200 bg-white px-5 py-3">
          <span className="text-sm text-walnut-700">
            Odabrano: <strong>{count}</strong> · ukupno <strong className="font-display text-lg">{money(total)}</strong>
          </span>
          <button onClick={() => setShowList(true)} className="rounded-full bg-copper-500 px-5 py-2.5 text-sm font-semibold text-white">
            Pogledaj izbor
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-walnut-950/50 p-4" onClick={() => setOpen(null)}>
          <div className="grid max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-[1.4fr_1fr]" onClick={(e) => e.stopPropagation()}>
            <ProductImage product={p2(open)} size="lg" className="!aspect-auto !h-full min-h-72 !rounded-none !border-0" />
            <div className="flex flex-col p-7">
              <div className="flex items-start justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-copper-600">{open.category}</div>
                <button onClick={() => setOpen(null)} className="rounded-lg p-1 text-walnut-400 hover:bg-walnut-100" aria-label="Zatvori">
                  <X className="size-5" />
                </button>
              </div>
              <h2 className="mt-2 font-display text-3xl font-semibold leading-tight">{open.name}</h2>
              <div className="mt-1 text-sm text-walnut-500">Šifra {open.sku}</div>
              <div className="mt-6 font-display text-4xl font-semibold">{money(open.price)}</div>
              <div className="text-xs text-walnut-500">cijena s PDV-om</div>
              <div className="mt-4">
                <Availability p={open} big />
              </div>
              {parseOptions(open.options).map((g) => (
                <div key={g.name} className="mt-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-walnut-500">{g.name}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {g.values.map((v) => (
                      <span key={v} className="rounded-full border border-walnut-200 bg-linen px-3 py-1 text-sm">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <div className="mt-auto flex items-center gap-3 pt-8">
                <div className="flex items-center rounded-full border border-walnut-200">
                  <button onClick={() => add(open.id, -1)} className="p-3" aria-label="Manje">
                    <Minus className="size-4" />
                  </button>
                  <span className="w-8 text-center text-lg font-semibold">{list[open.id] ?? 0}</span>
                  <button onClick={() => add(open.id, 1)} className="p-3" aria-label="Više">
                    <Plus className="size-4" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (!list[open.id]) add(open.id, 1)
                    setOpen(null)
                  }}
                  className="flex-1 rounded-full bg-copper-500 py-3.5 text-sm font-semibold text-white"
                >
                  {list[open.id] ? 'Gotovo' : 'Dodaj u moj izbor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showList && (
        <div className="fixed inset-0 z-50 flex justify-end bg-walnut-950/40" onClick={() => setShowList(false)}>
          <aside className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-walnut-200 px-5 py-4">
              <h2 className="font-display text-2xl font-semibold">Moj izbor</h2>
              <button onClick={() => setShowList(false)} className="rounded-lg p-1.5 hover:bg-walnut-100" aria-label="Zatvori">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {!chosen.length && <p className="text-walnut-500">Još ništa niste odabrali. Dodirnite artikal i kliknite „Dodaj u moj izbor”.</p>}
              {chosen.map(([id, n]) => {
                const p = byId.get(id)!
                return (
                  <div key={id} className="flex items-center gap-3">
                    <ProductImage product={p} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{p.name}</div>
                      <div className="text-sm text-walnut-500">{money(p.price)} × {n}</div>
                    </div>
                    <div className="flex items-center rounded-full border border-walnut-200">
                      <button onClick={() => add(id, -1)} className="p-2" aria-label="Manje">
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{n}</span>
                      <button onClick={() => add(id, 1)} className="p-2" aria-label="Više">
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="border-t border-walnut-200 px-5 py-4">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-walnut-600">Ukupno</span>
                <span className="font-display text-3xl font-semibold">{money(total)}</span>
              </div>
              <button disabled={!chosen.length} onClick={makeOffer} className="w-full rounded-full bg-walnut-900 py-3.5 text-sm font-semibold text-linen disabled:opacity-40">
                Napravi ponudu (za prodavača)
              </button>
              {chosen.length > 0 && (
                <button onClick={() => setList({})} className="mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-xs font-semibold text-walnut-500">
                  <Trash2 className="size-3.5" /> Isprazni izbor
                </button>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>,
    document.body,
  )
}

const p2 = (p: Item) => p

function Availability({ p, big = false }: { p: Item; big?: boolean }) {
  return p.available ? (
    <span className={`mt-2 inline-flex items-center gap-1.5 font-semibold text-emerald-700 ${big ? 'text-base' : 'text-xs'}`}>
      <Check className={big ? 'size-5' : 'size-3.5'} /> Odmah dostupno
    </span>
  ) : (
    <span className={`mt-2 inline-flex items-center gap-1.5 font-semibold text-amber-700 ${big ? 'text-base' : 'text-xs'}`}>
      <Clock className={big ? 'size-5' : 'size-3.5'} /> Po narudžbi{p.leadTimeDays ? ` · oko ${p.leadTimeDays} dana` : ''}
    </span>
  )
}
