import { createFileRoute } from '@tanstack/react-router'
import {
  ClipboardCheck,
  Printer,
  RotateCcw,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import {
  Button,
  Card,
  Chip,
  Field,
  PageHeader,
  Stat,
  inputCls,
} from '../components/ui'
import { count, date, money } from '../lib/format'
import { useStore } from '../lib/store'
import type { Category } from '../lib/types'

export const Route = createFileRoute('/inventura')({ component: StocktakePage })

function StocktakePage() {
  const {
    products,
    movements,
    today,
    productById,
    employeeById,
    adjustStockMany,
    busy,
  } = useStore()
  const [counted, setCounted] = useState<Record<string, string>>({})
  /** Inventura se radi odvojeno za salon i skladište. */
  const [loc, setLoc] = useState<'salon' | 'skladiste'>('salon')
  const onHand = (p: { stock: number; stockWarehouse?: number }) => (loc === 'salon' ? p.stock : (p.stockWarehouse ?? 0))
  const [cat, setCat] = useState<'sve' | Category>('sve')
  const [q, setQ] = useState('')
  const [onlyDiff, setOnlyDiff] = useState(false)
  const [note, setNote] = useState(`Inventura ${date(today)}`)

  const categories = [...new Set(products.map((p) => p.category))]
  const entered = products.filter(
    (p) => counted[p.id] !== undefined && counted[p.id] !== '',
  )
  const diffOf = (id: string) => {
    const v = counted[id]
    return v === undefined || v === ''
      ? null
      : Number(v) - onHand(productById(id))
  }
  const withDiff = entered.filter((p) => diffOf(p.id))
  const shortage = withDiff.reduce(
    (s, p) => s + Math.min(0, diffOf(p.id)!) * p.avgCost,
    0,
  )
  const surplus = withDiff.reduce(
    (s, p) => s + Math.max(0, diffOf(p.id)!) * p.avgCost,
    0,
  )

  const rows = products.filter((p) => {
    if (cat !== 'sve' && p.category !== cat) return false
    if (q && !`${p.sku} ${p.name}`.toLowerCase().includes(q.toLowerCase()))
      return false
    if (onlyDiff && !diffOf(p.id)) return false
    return true
  })

  const history = [...movements]
    .filter((m) => m.type === 'korekcija')
    .reverse()
    .slice(0, 12)

  async function post() {
    const res = await adjustStockMany(
      entered.map((p) => ({ productId: p.id, counted: Number(counted[p.id]) })),
      note,
      loc,
    )
    if (res) setCounted({})
  }

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Roba"
        title="Inventura"
        description="Upišite prebrojane količine. Razlike prema stanju u aplikaciji knjiže se kao korekcija po prosječnoj nabavnoj cijeni. Artikli bez upisane količine ostaju nepromijenjeni."
        actions={
          <>
            <select className="rounded-lg border border-walnut-200 bg-white px-3 py-2 text-sm font-semibold" value={loc} onChange={(e) => { setLoc(e.target.value as 'salon' | 'skladiste'); setCounted({}) }} aria-label="Mjesto inventure">
              <option value="salon">Inventura: Salon</option>
              <option value="skladiste">Inventura: Skladište</option>
            </select>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" /> Lista za brojanje
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setCounted(
                  Object.fromEntries(
                    products.map((p) => [p.id, String(Math.max(0, onHand(p)))]),
                  ),
                )
              }
            >
              Prepiši stanje
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          tone="accent"
          icon={ClipboardCheck}
          label="Prebrojano"
          value={`${entered.length} / ${products.length}`}
          hint="artikala s upisanom količinom"
        />
        <Stat
          icon={RotateCcw}
          label="S razlikom"
          value={count(withDiff.length)}
          hint="ide u korekciju"
        />
        <Stat
          tone={shortage ? 'warn' : 'default'}
          icon={TrendingDown}
          label="Manjak"
          value={money(-shortage)}
          hint="po nabavnoj vrijednosti"
        />
        <Stat
          tone={surplus ? 'good' : 'default'}
          icon={TrendingUp}
          label="Višak"
          value={money(surplus)}
          hint="po nabavnoj vrijednosti"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card flush>
          <div className="no-print flex flex-col gap-3 border-b border-walnut-200/70 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-walnut-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Šifra ili naziv…"
                  className="w-full rounded-lg border border-walnut-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-copper-400 focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-walnut-700">
                <input
                  type="checkbox"
                  className="size-4 accent-copper-500"
                  checked={onlyDiff}
                  onChange={(e) => setOnlyDiff(e.target.checked)}
                />
                Samo s razlikom
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['sve', ...categories] as const).map((c) => (
                <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
                  {c === 'sve' ? 'Sve' : c}
                </Chip>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table min-w-[720px]">
              <thead>
                <tr>
                  <th>Artikal</th>
                  <th className="text-right">U aplikaciji</th>
                  <th className="w-36 text-right">Prebrojano</th>
                  <th className="text-right">Razlika</th>
                  <th className="text-right">Vrijednost razlike</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const d = diffOf(p.id)
                  return (
                    <tr
                      key={p.id}
                      className={
                        d ? (d < 0 ? 'bg-rose-50/50' : 'bg-moss-50/70') : ''
                      }
                    >
                      <td>
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs text-walnut-500">
                          {p.sku} · {p.category}
                        </div>
                      </td>
                      <td className="text-right font-semibold tabular">
                        {onHand(p)}
                      </td>
                      <td className="text-right">
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          aria-label={`Prebrojano: ${p.name}`}
                          value={counted[p.id] ?? ''}
                          onChange={(e) =>
                            setCounted((c) => ({
                              ...c,
                              [p.id]: e.target.value,
                            }))
                          }
                          className={`${inputCls} ml-auto w-24 text-right tabular`}
                          placeholder="—"
                        />
                      </td>
                      <td
                        className={`text-right font-bold tabular ${d ? (d < 0 ? 'text-rose-700' : 'text-moss-600') : 'text-walnut-400'}`}
                      >
                        {d === null ? '' : d > 0 ? `+${d}` : d}
                      </td>
                      <td className="text-right tabular text-walnut-700">
                        {d ? money(d * p.avgCost) : ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="no-print space-y-6">
          <Card title="Knjiženje">
            <Field label="Opis / napomena">
              <input
                className={inputCls}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            <div className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-walnut-500">Korekcija artikala</span>
                <b className="tabular">{withDiff.length}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-walnut-500">Neto razlika</span>
                <b
                  className={`tabular ${shortage + surplus < 0 ? 'text-rose-700' : 'text-moss-600'}`}
                >
                  {money(shortage + surplus)}
                </b>
              </div>
            </div>
            <Button
              variant="copper"
              className="mt-4 w-full"
              disabled={busy || !entered.length}
              onClick={post}
            >
              <ClipboardCheck className="size-4" />{' '}
              {busy ? 'Knjižim…' : 'Knjiži inventuru'}
            </Button>
            {entered.length > 0 && (
              <Button
                variant="ghost"
                className="mt-2 w-full"
                onClick={() => setCounted({})}
              >
                Poništi unos
              </Button>
            )}
          </Card>

          <Card title="Ranije korekcije">
            {history.length === 0 ? (
              <p className="text-sm text-walnut-500">
                Još nije bilo inventure.
              </p>
            ) : (
              <ul className="space-y-2.5 text-sm">
                {history.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {productById(m.productId).name}
                      </div>
                      <div className="truncate text-[11px] text-walnut-500">
                        {date(m.date)} · {m.note}
                        {m.employeeId &&
                          ` · ${employeeById(m.employeeId).name.split(' ')[0]}`}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 font-bold tabular ${m.qty > 0 ? 'text-moss-600' : 'text-rose-700'}`}
                    >
                      {m.qty > 0 ? '+' : ''}
                      {m.qty}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
