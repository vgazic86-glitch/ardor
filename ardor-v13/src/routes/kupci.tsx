import { createFileRoute, useRouter } from '@tanstack/react-router'
import { HandCoins, Mail, MapPin, Phone, Search, ShoppingBag, StickyNote, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../components/Modal'
import { OrderDrawer } from '../components/OrderDrawer'
import { Badge, Button, Card, Chip, EmptyState, Field, inputCls, OrderBadge, PageHeader, Stat } from '../components/ui'
import { count, date, money } from '../lib/format'
import { isRevenue, orderTotal, outstanding } from '../lib/stats'
import { useStore } from '../lib/store'
import type { Customer, Order } from '../lib/types'
import { saveCustomerFn } from '../server/api'

export const Route = createFileRoute('/kupci')({
  validateSearch: (s: Record<string, unknown>): { dug?: boolean } => ({ dug: s.dug === true || s.dug === 'true' ? true : undefined }),
  component: CustomersPage,
})

interface Row {
  c: Customer
  orders: Order[]
  revenue: number
  debt: number
  last: string | null
}

function CustomersPage() {
  const { customers, orders } = useStore()
  const { dug } = Route.useSearch()
  const [q, setQ] = useState('')
  const [onlyDebt, setOnlyDebt] = useState(!!dug)
  const [sort, setSort] = useState<'promet' | 'zadnji' | 'ime'>('promet')
  const [open, setOpen] = useState<string | null>(null)

  const rows = useMemo<Row[]>(() => {
    const by = new Map<string, Order[]>()
    for (const o of orders) by.set(o.customerId, [...(by.get(o.customerId) ?? []), o])
    return customers.map((c) => {
      const list = (by.get(c.id) ?? []).sort((a, b) => b.date.localeCompare(a.date))
      return {
        c,
        orders: list,
        revenue: list.filter(isRevenue).reduce((s, o) => s + orderTotal(o), 0),
        debt: list.filter((o) => o.status !== 'otkazana' && o.status !== 'ponuda').reduce((s, o) => s + outstanding(o), 0),
        last: list[0]?.date ?? null,
      }
    })
  }, [customers, orders])

  const needle = q.trim().toLowerCase()
  const list = rows
    .filter((r) => !onlyDebt || r.debt > 0.5)
    .filter((r) => !needle || `${r.c.name} ${r.c.phone} ${r.c.city} ${r.c.email}`.toLowerCase().includes(needle))
    .sort((a, b) => (sort === 'ime' ? a.c.name.localeCompare(b.c.name, 'bs') : sort === 'zadnji' ? (b.last ?? '').localeCompare(a.last ?? '') : b.revenue - a.revenue))
  const totalDebt = rows.reduce((s, r) => s + r.debt, 0)
  const returning = rows.filter((r) => r.orders.filter(isRevenue).length > 1).length
  const openRow = rows.find((r) => r.c.id === open) ?? null
  const [orderId, setOrderId] = useState<string | null>(null)

  return (
    <div className="rise">
      <PageHeader eyebrow="Prodaja" title="Kupci" description="Ko je šta kupio, koliko duguje i šta smo s kim dogovorili. Klik na kupca otvara karticu." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat tone="accent" icon={Users} label="Kupaca" value={count(rows.length)} hint={`${returning} se vratilo više puta`} />
        <Stat icon={ShoppingBag} label="Prosječno po kupcu" value={money(rows.length ? rows.reduce((s, r) => s + r.revenue, 0) / rows.length : 0)} />
        <Stat tone={totalDebt > 0 ? 'warn' : 'good'} icon={HandCoins} label="Kupci duguju" value={money(totalDebt)} hint={`${rows.filter((r) => r.debt > 0.5).length} kupaca`} />
        <Stat icon={StickyNote} label="S napomenom" value={count(rows.filter((r) => r.c.note).length)} hint="dogovori i želje" />
      </div>

      <Card flush>
        <div className="flex flex-wrap items-center gap-3 border-b border-walnut-200/70 px-5 py-3">
          <label className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-walnut-500" />
            <input className={`${inputCls} pl-9`} placeholder="Ime, telefon, grad…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <Chip active={onlyDebt} onClick={() => setOnlyDebt((v) => !v)}>
            Samo koji duguju
          </Chip>
          <select className={`${inputCls} w-auto`} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Poredak">
            <option value="promet">Najveći kupci</option>
            <option value="zadnji">Zadnja kupovina</option>
            <option value="ime">Po imenu</option>
          </select>
        </div>
        {list.length === 0 ? (
          <EmptyState icon={Users} title="Nema kupaca">
            Promijenite pretragu ili filter.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[760px]">
              <thead>
                <tr>
                  <th>Kupac</th>
                  <th>Kontakt</th>
                  <th className="text-right">Narudžbi</th>
                  <th className="text-right">Kupio ukupno</th>
                  <th className="text-right">Duguje</th>
                  <th>Zadnja kupovina</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.c.id} className="cursor-pointer" onClick={() => setOpen(r.c.id)}>
                    <td>
                      <div className="font-semibold">{r.c.name}</div>
                      <div className="text-xs text-walnut-500">
                        {r.c.city}
                        {r.c.note && <StickyNote className="ml-1.5 inline size-3 text-copper-500" />}
                      </div>
                    </td>
                    <td className="text-sm text-walnut-700">{r.c.phone || '—'}</td>
                    <td className="text-right tabular">{r.orders.filter(isRevenue).length}</td>
                    <td className="text-right font-semibold tabular">{money(r.revenue)}</td>
                    <td className="text-right tabular">{r.debt > 0.5 ? <Badge tone="warn">{money(r.debt)}</Badge> : <span className="text-walnut-300">—</span>}</td>
                    <td className="tabular text-walnut-700">{r.last ? date(r.last) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {openRow && !orderId && <CustomerCard row={openRow} onClose={() => setOpen(null)} onOrder={setOrderId} />}
      {orderId && <OrderDrawer orderId={orderId} onClose={() => setOrderId(null)} />}
    </div>
  )
}

function CustomerCard({ row, onClose, onOrder }: { row: Row; onClose: () => void; onOrder: (id: string) => void }) {
  const { notify } = useStore()
  const router = useRouter()
  const { c } = row
  const [edit, setEdit] = useState(false)
  const [f, setF] = useState({ name: c.name, phone: c.phone, email: c.email, city: c.city, address: c.address, note: c.note ?? '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  async function save() {
    setBusy(true)
    setErr(null)
    try {
      await saveCustomerFn({ data: { id: c.id, ...f } })
      await router.invalidate()
      notify('Kupac je spremljen.')
      setEdit(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Spremanje nije uspjelo.')
    } finally {
      setBusy(false)
    }
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  return (
    <Modal
      side
      help="kupci"
      title={c.name}
      subtitle={`${row.orders.filter(isRevenue).length} narudžbi · kupio ukupno ${money(row.revenue)}`}
      onClose={onClose}
      footer={
        edit ? (
          <>
            {err && <span className="mr-auto text-sm text-rose-700">{err}</span>}
            <Button variant="ghost" onClick={() => setEdit(false)}>
              Odustani
            </Button>
            <Button variant="copper" disabled={busy} onClick={save}>
              Spremi
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => setEdit(true)}>
            Uredi podatke i napomenu
          </Button>
        )
      }
    >
      {edit ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ime i prezime" className="sm:col-span-2">
            <input className={inputCls} value={f.name} onChange={set('name')} />
          </Field>
          <Field label="Telefon">
            <input className={inputCls} value={f.phone} onChange={set('phone')} />
          </Field>
          <Field label="E-mail">
            <input className={inputCls} type="email" value={f.email} onChange={set('email')} />
          </Field>
          <Field label="Adresa">
            <input className={inputCls} value={f.address} onChange={set('address')} />
          </Field>
          <Field label="Grad">
            <input className={inputCls} value={f.city} onChange={set('city')} />
          </Field>
          <Field label="Napomena (vidi samo osoblje)" className="sm:col-span-2">
            <textarea className={`${inputCls} min-h-24`} value={f.note} onChange={set('note')} placeholder="npr. traži tamni orah, zvati poslije 16 h, stalni kupac" />
          </Field>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-walnut-200 bg-linen p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-walnut-500">Kupio ukupno</div>
              <div className="mt-0.5 font-display text-xl font-semibold tabular">{money(row.revenue)}</div>
            </div>
            <div className="rounded-xl border border-walnut-200 bg-linen p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-walnut-500">Duguje</div>
              <div className={`mt-0.5 font-display text-xl font-semibold tabular ${row.debt > 0.5 ? 'text-copper-700' : ''}`}>{money(row.debt)}</div>
            </div>
            <div className="rounded-xl border border-walnut-200 bg-linen p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-walnut-500">Zadnja kupovina</div>
              <div className="mt-0.5 font-display text-xl font-semibold">{row.last ? date(row.last) : '—'}</div>
            </div>
          </div>
          <div className="space-y-1.5 text-sm text-walnut-700">
            {c.phone && (
              <a href={`tel:${c.phone}`} className="flex items-center gap-2 hover:text-copper-600">
                <Phone className="size-4" /> {c.phone}
              </a>
            )}
            {c.email && (
              <a href={`mailto:${c.email}`} className="flex items-center gap-2 hover:text-copper-600">
                <Mail className="size-4" /> {c.email}
              </a>
            )}
            {(c.address || c.city) && (
              <div className="flex items-center gap-2">
                <MapPin className="size-4" /> {[c.address, c.city].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
          {c.note && (
            <div className="rounded-xl border border-copper-200 bg-copper-50 p-3 text-sm">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-copper-700">
                <StickyNote className="size-3.5" /> Napomena
              </div>
              <p className="whitespace-pre-line">{c.note}</p>
            </div>
          )}
          <div>
            <h3 className="mb-2 font-display text-base font-semibold">Narudžbe</h3>
            {row.orders.length === 0 ? (
              <p className="text-sm text-walnut-500">Još nema narudžbi.</p>
            ) : (
              <ul className="divide-y divide-walnut-100 rounded-xl border border-walnut-200/70">
                {row.orders.map((o) => (
                  <li key={o.id}>
                    <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-walnut-50" onClick={() => onOrder(o.id)}>
                      <span className="flex-1">
                        <span className="font-semibold">{o.number}</span> <span className="text-walnut-500">· {date(o.date)}</span>
                        <span className="block text-xs text-walnut-500">{o.items.length} stavki{outstanding(o) > 0.5 && o.status !== 'ponuda' ? ` · duguje ${money(outstanding(o))}` : ''}</span>
                      </span>
                      <OrderBadge status={o.status} />
                      <span className="w-24 text-right font-semibold tabular">{money(orderTotal(o))}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
