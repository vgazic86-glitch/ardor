import { createFileRoute, Link } from '@tanstack/react-router'
import {
  QrCode,
  Archive,
  Boxes,
  Pencil,
  Percent,
  Plus,
  Search,
  Tag,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { CategoriesDialog } from '../components/CategoriesDialog'
import { ProductCard } from '../components/ProductCard'
import { ProductDialog } from '../components/ProductDialog'
import { ProductImage } from '../components/ProductImage'
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  PageHeader,
  Stat,
} from '../components/ui'
import { count, money, netOf, pct } from '../lib/format'
import { useStore } from '../lib/store'
import type { Category, Product } from '../lib/types'

export const Route = createFileRoute('/artikli')({ component: ProductsPage })

const marginOf = (p: Product) => {
  const n = netOf(p.price)
  return n ? (n - p.avgCost) / n : 0
}

function ProductsPage() {
  const { products, archiveProduct, full } = useStore()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<'sve' | Category>('sve')
  const [edit, setEdit] = useState<Product | 'new' | null>(null)
  const [catsOpen, setCatsOpen] = useState(false)
  const [card, setCard] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)

  const categories = [...new Set(products.map((p) => p.category))]
  const rows = products.filter(
    (p) =>
      (cat === 'sve' || p.category === cat) &&
      (!q ||
        `${p.sku} ${p.fiscalSku ?? ''} ${p.name} ${p.supplier}`
          .toLowerCase()
          .includes(q.toLowerCase())),
  )
  const avgMargin = products.length
    ? products.reduce((s, p) => s + marginOf(p), 0) / products.length
    : 0
  const lowMargin = products.filter((p) => marginOf(p) < 0.25)

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Šifrarnik"
        title="Artikli"
        description="Svi artikli salona s cijenama, maržom, minimalnom zalihom i dobavljačem. Maloprodajne cijene su s PDV-om, nabavne bez PDV-a."
        actions={
          <>
          <Link
            to="/naljepnice"
            className="inline-flex items-center gap-2 rounded-lg border border-walnut-200 bg-linen px-3.5 py-2 text-sm font-semibold shadow-sm hover:bg-white"
          >
            <QrCode className="size-4 text-copper-600" /> QR naljepnice
          </Link>
          {full && (
            <Button variant="outline" onClick={() => setCatsOpen(true)}>
              Kategorije
            </Button>
          )}
          <Button onClick={() => setEdit('new')}>
            <Plus className="size-4" /> Novi artikal
          </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          tone="accent"
          icon={Boxes}
          label="Aktivnih artikala"
          value={count(products.length)}
          hint={`${categories.length} kategorija`}
        />
        {full && (
          <Stat
            icon={Percent}
            label="Prosječna marža"
            value={pct(avgMargin)}
            hint="na cijenu bez PDV-a"
          />
        )}
        <Stat
          icon={Tag}
          label="Prosječna MPC"
          value={money(
            products.reduce((s, p) => s + p.price, 0) / (products.length || 1),
          )}
        />
        {full && (
          <Stat
            tone={lowMargin.length ? 'warn' : 'good'}
            icon={TrendingUp}
            label="Marža ispod 25%"
            value={count(lowMargin.length)}
            hint="provjerite cijene"
          />
        )}
      </div>

      <Card flush className="mt-6">
        <div className="flex flex-col gap-3 border-b border-walnut-200/70 p-5 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-wrap gap-1.5">
            {(['sve', ...categories] as const).map((c) => (
              <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
                {c === 'sve' ? 'Sve' : c}
              </Chip>
            ))}
          </div>
          <label className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-walnut-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Šifra, naziv, dobavljač…"
              className="w-full rounded-lg border border-walnut-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-copper-400 focus:outline-none"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[960px]">
            <thead>
              <tr>
                <th>Artikal</th>
                <th>Kategorija</th>
                <th className="text-right">MPC</th>
                <th className="text-right">Nabavna</th>
                {full && <th className="text-right">Marža</th>}
                <th className="text-right">Min.</th>
                <th className="text-right">Stanje</th>
                <th>Dobavljač</th>
                <th className="text-right">Radnje</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const m = marginOf(p)
                return (
                  <tr key={p.id}>
                    <td>
                      <button
                        className="flex items-center gap-3 text-left"
                        onClick={() => setCard(p.id)}
                      >
                        <ProductImage product={p} />
                        <span>
                          <span className="block font-semibold hover:text-copper-600">
                            {p.name}
                          </span>
                          <span className="block text-xs text-walnut-500">
                            {p.sku}
                            {p.fiscalSku && <> · fiskalni: <b className="font-semibold text-walnut-700">{p.fiscalSku}</b></>}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="text-walnut-700">{p.category}</td>
                    <td className="text-right font-semibold tabular">
                      {money(p.price)}
                    </td>
                    <td className="text-right tabular text-walnut-700">
                      {money(p.avgCost)}
                    </td>
                    {full && (
                      <td className="text-right">
                        <Badge
                          tone={m < 0.15 ? 'bad' : m < 0.25 ? 'warn' : 'good'}
                        >
                          {pct(m)}
                        </Badge>
                      </td>
                    )}
                    <td className="text-right tabular text-walnut-700">
                      {p.minStock}
                    </td>
                    <td
                      className={`text-right font-semibold tabular ${p.stock <= p.minStock ? 'text-copper-600' : ''}`}
                    >
                      {p.stock}
                    </td>
                    <td className="text-xs text-walnut-700">{p.supplier}</td>
                    <td className="text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEdit(p)}
                        aria-label={`Uredi ${p.name}`}
                      >
                        <Pencil className="size-3.5" /> Uredi
                      </Button>
                      {confirm === p.id ? (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={async () => {
                            await archiveProduct(p.id)
                            setConfirm(null)
                          }}
                        >
                          Potvrdi arhiviranje
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirm(p.id)}
                          aria-label={`Arhiviraj ${p.name}`}
                          title="Arhiviraj (artikal ostaje u starim dokumentima)"
                        >
                          <Archive className="size-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <EmptyState icon={Boxes} title="Nema artikala">
              Dodajte prvi artikal ili promijenite pretragu.
            </EmptyState>
          )}
        </div>
      </Card>

      {catsOpen && <CategoriesDialog onClose={() => setCatsOpen(false)} />}
      {edit && (
        <ProductDialog
          product={edit === 'new' ? null : edit}
          onClose={() => setEdit(null)}
        />
      )}
      {card && <ProductCard productId={card} onClose={() => setCard(null)} />}
    </div>
  )
}
