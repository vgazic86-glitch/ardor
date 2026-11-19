import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  CalendarRange,
  ChevronDown,
  Wallet,
  Factory,
  FileText,
  PackagePlus,
  Search,
  Truck,
} from 'lucide-react'
import { Fragment, useState } from 'react'
import { ProductCard } from '../components/ProductCard'
import { ReceiptDialog } from '../components/ReceiptDialog'
import { TransferDialog } from '../components/TransferDialog'
import { openDownload } from '../lib/files'
import { receiptPdfFn } from '../server/api'
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Select,
  Stat,
} from '../components/ui'
import { count, date, money, money2, monthShort, VAT_RATE } from '../lib/format'
import { lastMonths, monthKey } from '../lib/stats'
import { useStore } from '../lib/store'
import type { Receipt } from '../lib/types'

export const Route = createFileRoute('/primke')({
  validateSearch: (s: Record<string, unknown>): { nova?: boolean } =>
    s.nova === true || s.nova === 'true' ? { nova: true } : {},
  component: ReceiptsPage,
})

const value = (r: Receipt) =>
  r.lines.reduce((s, l) => s + l.qty * l.unitCost, 0)
const pieces = (r: Receipt) => r.lines.reduce((s, l) => s + l.qty, 0)

function ReceiptsPage() {
  const {
    receipts,
    suppliers,
    currentMonth,
    supplierById,
    employeeById,
    productById,
    notify,
  } = useStore()
  const { nova } = Route.useSearch()
  const navigate = useNavigate({ from: '/primke' })
  const [sup, setSup] = useState('svi')
  const [month, setMonth] = useState('sve')
  const [q, setQ] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [product, setProduct] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)

  const list = receipts.filter((r) => {
    if (sup !== 'svi' && r.supplierId !== sup) return false
    if (month !== 'sve' && monthKey(r.date) !== month) return false
    if (q) {
      const hay =
        `${r.number} ${r.documentNumber} ${supplierById(r.supplierId)?.name ?? ''} ${r.lines.map((l) => productById(l.productId).name).join(' ')}`.toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  })
  const thisMonth = receipts.filter((r) => monthKey(r.date) === currentMonth)
  const label = (k: string) =>
    `${monthShort(Number(k.slice(5)) - 1)} ${k.slice(0, 4)}`

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Roba"
        title="Prijem robe"
        description="Svaka primka bilježi dobavljača, njegov broj dokumenta, količine i nabavne cijene. Iz primki se računa prosječna nabavna cijena i vrijednost zaliha."
        actions={
          <>
            <Button variant="outline" onClick={() => setTransferOpen(true)}>
              Interna primka (premještaj)
            </Button>
            <Button onClick={() => navigate({ search: { nova: true } })}>
              <PackagePlus className="size-4" /> Nova primka
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          tone="accent"
          icon={Wallet}
          label="Zaprimljeno ovaj mjesec"
          value={money(thisMonth.reduce((s, r) => s + value(r), 0))}
          hint="nabavna vrijednost bez PDV-a"
        />
        <Stat
          icon={FileText}
          label="Primki ovaj mjesec"
          value={count(thisMonth.length)}
          hint={`${count(thisMonth.reduce((s, r) => s + pieces(r), 0))} komada`}
        />
        <Stat
          icon={Factory}
          label="Dobavljača"
          value={count(suppliers.length)}
          hint={`${new Set(thisMonth.map((r) => r.supplierId)).size} aktivnih ovaj mjesec`}
        />
        <Stat
          icon={CalendarRange}
          label="Ukupno primki"
          value={count(receipts.length)}
          hint={receipts[0] ? `zadnja ${date(receipts[0].date)}` : 'još nema'}
        />
      </div>

      <Card flush className="mt-6">
        <div className="flex flex-col gap-3 border-b border-walnut-200/70 p-5 lg:flex-row lg:items-end">
          <label className="relative flex-1">
            <span className="mb-1 block text-xs font-semibold text-walnut-700">
              Pretraga
            </span>
            <Search className="pointer-events-none absolute left-3 top-[34px] size-4 text-walnut-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Broj primke, dokument, artikal…"
              className="w-full rounded-lg border border-walnut-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-copper-400 focus:outline-none"
            />
          </label>
          <Select
            label="Dobavljač"
            value={sup}
            onChange={setSup}
            options={[
              { value: 'svi', label: 'Svi dobavljači' },
              ...suppliers.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
          <Select
            label="Mjesec"
            value={month}
            onChange={setMonth}
            options={[
              { value: 'sve', label: 'Svi mjeseci' },
              ...lastMonths(currentMonth, 12)
                .reverse()
                .map((k) => ({ value: k, label: label(k) })),
            ]}
          />
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={Truck}
            title={
              receipts.length ? 'Nema primki za filtere' : 'Još nema primki'
            }
          >
            {receipts.length
              ? 'Promijenite filtere.'
              : 'Kad roba stigne od dobavljača, unesite je preko „Nova primka” i ona odmah ulazi na zalihu.'}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[820px]">
              <thead>
                <tr>
                  <th>Primka</th>
                  <th>Dobavljač</th>
                  <th>Dokument</th>
                  <th className="text-right">Stavki</th>
                  <th className="text-right">Komada</th>
                  <th className="text-right">Vrijednost</th>
                  <th className="!pl-6">Zaprimio</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const ex = expanded === r.id
                  const emp = r.employeeId ? employeeById(r.employeeId) : null
                  return (
                    <Fragment key={r.id}>
                      <tr
                        className="cursor-pointer"
                        onClick={() => setExpanded(ex ? null : r.id)}
                      >
                        <td>
                          <div className="font-semibold">{r.number}</div>
                          <div className="text-xs text-walnut-500">
                            {date(r.date)}
                          </div>
                        </td>
                        <td className="font-medium">
                          {supplierById(r.supplierId)?.name ?? '—'}
                        </td>
                        <td className="text-walnut-700">
                          {r.documentNumber || '—'}
                        </td>
                        <td className="text-right tabular">{r.lines.length}</td>
                        <td className="text-right tabular">{pieces(r)}</td>
                        <td className="text-right font-semibold tabular">
                          {money(value(r))}
                        </td>
                        <td className="!pl-6">
                          {emp ? (
                            <span className="flex items-center gap-2">
                              <Avatar employee={emp} size="sm" />
                              <span className="text-xs">
                                {emp.name.split(' ')[0]}
                              </span>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="w-8">
                          <ChevronDown
                            className={`size-4 text-walnut-400 transition-transform ${ex ? 'rotate-180' : ''}`}
                          />
                        </td>
                      </tr>
                      {ex && (
                        <tr className="!bg-walnut-50 hover:!bg-walnut-50">
                          <td colSpan={8} className="!py-4">
                            <div className="overflow-hidden rounded-xl border border-walnut-200 bg-white">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-walnut-100 text-left text-[11px] uppercase tracking-wider text-walnut-500">
                                    <th className="px-4 py-2 font-semibold">
                                      Artikal
                                    </th>
                                    <th className="py-2 text-right font-semibold">
                                      Kol.
                                    </th>
                                    <th className="py-2 text-right font-semibold">
                                      Nabavna / kom
                                    </th>
                                    <th className="px-4 py-2 text-right font-semibold">
                                      Iznos
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.lines.map((l, i) => (
                                    <tr
                                      key={i}
                                      className="border-b border-walnut-50 last:border-0"
                                    >
                                      <td className="px-4 py-2">
                                        <button
                                          className="font-medium hover:text-copper-600"
                                          onClick={() =>
                                            setProduct(l.productId)
                                          }
                                        >
                                          {productById(l.productId).name}
                                        </button>
                                        <span className="ml-2 text-xs text-walnut-500">
                                          {productById(l.productId).sku}
                                        </span>
                                      </td>
                                      <td className="py-2 text-right tabular">
                                        {l.qty}
                                      </td>
                                      <td className="py-2 text-right tabular">
                                        {money2(l.unitCost)}
                                      </td>
                                      <td className="px-4 py-2 text-right font-semibold tabular">
                                        {money2(l.qty * l.unitCost)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 border-t border-walnut-100 px-4 py-2.5 text-sm">
                                {r.note && (
                                  <span className="mr-auto text-walnut-600">
                                    Napomena: {r.note}
                                  </span>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    try {
                                      const f = await receiptPdfFn({ data: { id: r.id } })
                                      openDownload({ name: f.name, mime: 'application/pdf', dataB64: f.data })
                                    } catch (err) {
                                      notify(err instanceof Error ? err.message : 'Primjerak nije izrađen.')
                                    }
                                  }}
                                >
                                  Ispis primjerka (PDF)
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditing(r.id)
                                  }}
                                >
                                  Izmijeni primku
                                </Button>
                                <span>
                                  Osnovica{' '}
                                  <b className="tabular">{money2(value(r))}</b>
                                </span>
                                <span>
                                  PDV{' '}
                                  <b className="tabular">
                                    {money2(value(r) * VAT_RATE)}
                                  </b>
                                </span>
                                <span>
                                  Ukupno{' '}
                                  <b className="tabular">
                                    {money2(value(r) * (1 + VAT_RATE))}
                                  </b>
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {nova && (
        <ReceiptDialog
          onClose={() => navigate({ search: {} })}
          onSaved={() => setExpanded(null)}
        />
      )}
      {transferOpen && <TransferDialog onClose={() => setTransferOpen(false)} />}
      {editing &&
        (() => {
          const r = receipts.find((x) => x.id === editing)
          if (!r) return null
          return (
            <ReceiptDialog
              editing={{ id: r.id, number: r.number }}
              initial={{
                supplierId: r.supplierId ?? '',
                note: r.note,
                date: r.date,
                documentNumber: r.documentNumber,
                vat: r.vat,
                location: r.location,
                lines: r.lines.map((l) => ({ productId: l.productId, qty: l.qty, unitCost: l.unitCost })),
              }}
              onClose={() => setEditing(null)}
              onSaved={() => setEditing(null)}
            />
          )
        })()}
      {product && (
        <ProductCard productId={product} onClose={() => setProduct(null)} />
      )}
    </div>
  )
}
