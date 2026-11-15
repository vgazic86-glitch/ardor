import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  ClipboardCheck,
  Warehouse,
  Package,
  PackagePlus,
  PackageX,
  Search,
  Tag,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ProductCard } from '../components/ProductCard'
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  PageHeader,
  Segmented,
  Stat,
} from '../components/ui'
import {
  count,
  date,
  money,
  movementLabel,
  movementTone,
  netOf,
} from '../lib/format'
import { reservedQty } from '../lib/stats'
import { useStore } from '../lib/store'
import type { Category, Product } from '../lib/types'

export const Route = createFileRoute('/zalihe')({
  validateSearch: (s: Record<string, unknown>): { artikal?: string } =>
    s.artikal ? { artikal: String(s.artikal) } : {},
  component: StockPage,
})

type View = 'sve' | 'naruciti' | 'nema' | 'rezervisano'

function stateOf(p: Product, free: number) {
  if (p.stock <= 0) return { label: 'Nema', tone: 'bad' as const }
  if (p.minStock > 0 && p.stock <= p.minStock)
    return { label: 'Naručiti', tone: 'warn' as const }
  if (free < 0) return { label: 'Manjak', tone: 'bad' as const }
  return { label: 'Dovoljno', tone: 'good' as const }
}

function StockPage() {
  const { orders, products, suppliers, movements, productById } = useStore()
  const { artikal } = Route.useSearch()
  const navigate = useNavigate({ from: '/zalihe' })
  const [cat, setCat] = useState<'sve' | Category>('sve')
  const [view, setView] = useState<View>('sve')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(artikal ?? null)
  useEffect(() => {
    if (artikal) setOpen(artikal)
  }, [artikal])

  const reserved = useMemo(() => reservedQty(orders), [orders])
  const categories = [...new Set(products.map((p) => p.category))]
  const valueCost = products.reduce(
    (s, p) => s + Math.max(0, p.stock) * p.avgCost,
    0,
  )
  const valueRetail = products.reduce(
    (s, p) => s + Math.max(0, p.stock) * p.price,
    0,
  )
  const low = products.filter((p) => p.minStock > 0 && p.stock <= p.minStock)
  const pieces = products.reduce((s, p) => s + Math.max(0, p.stock), 0)

  const rows = products.filter((p) => {
    const r = reserved.get(p.id) ?? 0
    if (cat !== 'sve' && p.category !== cat) return false
    if (view === 'naruciti' && !(p.minStock > 0 && p.stock <= p.minStock))
      return false
    if (view === 'nema' && p.stock > 0) return false
    if (view === 'rezervisano' && !r) return false
    if (
      q &&
      !`${p.sku} ${p.name} ${p.supplier}`
        .toLowerCase()
        .includes(q.toLowerCase())
    )
      return false
    return true
  })

  const bySupplier = suppliers
    .map((s) => ({ s, items: low.filter((p) => p.supplierId === s.id) }))
    .filter((x) => x.items.length)
  const recent = [...movements].reverse().slice(0, 8)

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Roba"
        title="Zalihe"
        description="Stanje se računa iz svih kretanja: početno stanje, prijemi, izlazi kupcima, povrati i inventura. Rezervisano je ono što je prodano, a još nije izašlo iz salona."
        actions={
          <>
            <Link
              to="/inventura"
              className="inline-flex items-center gap-2 rounded-lg border border-walnut-200 bg-linen px-3.5 py-2 text-sm font-semibold shadow-sm hover:bg-white"
            >
              <ClipboardCheck className="size-4" /> Inventura
            </Link>
            <Link
              to="/primke"
              search={{ nova: true }}
              className="inline-flex items-center gap-2 rounded-lg bg-walnut-900 px-3.5 py-2 text-sm font-semibold text-linen shadow-sm hover:bg-walnut-800"
            >
              <PackagePlus className="size-4" /> Prijem robe
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          tone="accent"
          icon={Warehouse}
          label="Vrijednost zaliha"
          value={money(valueCost)}
          hint="po prosječnoj nabavnoj cijeni"
        />
        <Stat
          icon={Tag}
          label="Po maloprodajnoj"
          value={money(valueRetail)}
          hint={`razlika u cijeni ${money(netOf(valueRetail) - valueCost)}`}
        />
        <Stat
          icon={Package}
          label="Komada na stanju"
          value={count(pieces)}
          hint={`${products.length} artikala · ${categories.length} kategorija`}
        />
        <Stat
          tone={low.length ? 'warn' : 'good'}
          icon={AlertTriangle}
          label="Za naručiti"
          value={count(low.length)}
          hint={`${products.filter((p) => p.stock <= 0).length} artikala nema na stanju`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card flush>
          <div className="flex flex-col gap-3 border-b border-walnut-200/70 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Segmented
                value={view}
                onChange={setView}
                options={[
                  { value: 'sve', label: 'Sve' },
                  { value: 'naruciti', label: `Za naručiti (${low.length})` },
                  { value: 'nema', label: 'Nema na stanju' },
                  { value: 'rezervisano', label: 'Rezervisano' },
                ]}
              />
              <label className="relative ml-auto w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-walnut-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Šifra, naziv, dobavljač…"
                  className="w-full rounded-lg border border-walnut-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-copper-400 focus:outline-none"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['sve', ...categories] as const).map((c) => (
                <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
                  {c === 'sve' ? 'Sve kategorije' : c}
                </Chip>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table min-w-[760px]">
              <thead>
                <tr>
                  <th>Artikal</th>
                  <th className="text-right">Na stanju</th>
                  <th className="text-right">Rezervisano</th>
                  <th className="text-right">Slobodno</th>
                  <th className="text-right">Prosj. nabavna</th>
                  <th className="text-right">Vrijednost</th>
                  <th className="pl-6">Stanje</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const r = reserved.get(p.id) ?? 0
                  const free = p.stock - r
                  const st = stateOf(p, free)
                  return (
                    <tr
                      key={p.id}
                      className="cursor-pointer"
                      onClick={() => setOpen(p.id)}
                    >
                      <td>
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs text-walnut-500">
                          {p.sku} · {p.category} · {p.supplier}
                        </div>
                      </td>
                      <td className="text-right font-semibold tabular">
                        {p.stock}
                      </td>
                      <td className="text-right tabular text-walnut-700">
                        {r || '—'}
                      </td>
                      <td
                        className={`text-right font-semibold tabular ${free < 0 ? 'text-rose-700' : ''}`}
                      >
                        {free}
                      </td>
                      <td className="text-right tabular text-walnut-700">
                        {money(p.avgCost)}
                      </td>
                      <td className="text-right tabular">
                        {money(Math.max(0, p.stock) * p.avgCost)}
                      </td>
                      <td className="pl-6">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <EmptyState icon={PackageX} title="Nema artikala">
                Promijenite filter ili pretragu.
              </EmptyState>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card
            title="Za naručiti"
            subtitle="Ispod minimalne zalihe, po dobavljaču"
          >
            {bySupplier.length === 0 ? (
              <p className="text-sm text-moss-600">Sve je iznad minimuma.</p>
            ) : (
              <div className="space-y-4">
                {bySupplier.map(({ s, items }) => (
                  <div key={s.id}>
                    <div className="flex items-baseline justify-between">
                      <div className="text-sm font-semibold">{s.name}</div>
                      <div className="text-[11px] text-walnut-500">
                        {s.leadTimeDays} dana
                      </div>
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      {items.map((p) => (
                        <li key={p.id}>
                          <button
                            onClick={() => setOpen(p.id)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-xs hover:bg-walnut-100"
                          >
                            <span className="truncate">{p.name}</span>
                            <span
                              className={`shrink-0 font-semibold tabular ${p.stock <= 0 ? 'text-rose-700' : 'text-copper-600'}`}
                            >
                              {p.stock}/{p.minStock}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <Button
                  variant="copper"
                  className="w-full"
                  onClick={() =>
                    navigate({ to: '/primke', search: { nova: true } })
                  }
                >
                  <PackagePlus className="size-4" /> Zaprimi robu
                </Button>
              </div>
            )}
          </Card>

          <Card title="Zadnja kretanja">
            <ul className="space-y-2.5">
              {recent.map((m) => (
                <li
                  key={m.id}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <button
                    className="min-w-0 text-left"
                    onClick={() => setOpen(m.productId)}
                  >
                    <div className="truncate font-medium hover:text-copper-600">
                      {productById(m.productId).name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <Badge
                        tone={movementTone[m.type]}
                        className="!px-1.5 !py-0 !text-[10px]"
                      >
                        {movementLabel[m.type]}
                      </Badge>
                      <span className="text-[11px] text-walnut-500">
                        {date(m.date)}
                      </span>
                    </div>
                  </button>
                  <span
                    className={`shrink-0 font-bold tabular ${m.qty > 0 ? 'text-moss-600' : 'text-copper-600'}`}
                  >
                    {m.qty > 0 ? '+' : ''}
                    {m.qty}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {open && (
        <ProductCard
          productId={open}
          onClose={() => {
            setOpen(null)
            if (artikal) navigate({ search: {} })
          }}
        />
      )}
    </div>
  )
}
