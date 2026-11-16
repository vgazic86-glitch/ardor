import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { BookOpenCheck, FileSpreadsheet, Info, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge, Button, Card, Chip, EmptyState, PageHeader, Select, Stat } from '../components/ui'
import { date, money2, monthShort, parseAmount } from '../lib/format'
import { bookTotals, INPUT_SOURCE_LABEL, inputBook, type InputSource } from '../lib/kuf'
import { realized } from '../lib/reports'
import { useRemote } from '../lib/remote'
import { lastMonths } from '../lib/stats'
import { useStore } from '../lib/store'
import { getFinanceFn, setReceiptVatFn } from '../server/api'

export const Route = createFileRoute('/kuf')({
  validateSearch: (s: Record<string, unknown>): { mjesec?: string } => ({
    mjesec: typeof s.mjesec === 'string' && /^\d{4}-\d{2}$/.test(s.mjesec) ? s.mjesec : undefined,
  }),
  component: InputBookPage,
})

const TONE: Record<InputSource, string> = { primka: 'neutral', trosak: 'info', racun: 'warn', odobrenje: 'violet' }

/** Kontrolna knjiga ulaznih računa s PDV-om — podloga za provjeru s knjigovođom. */
function InputBookPage() {
  const { receipts, suppliers, orders, movements, currentMonth } = useStore()
  const { mjesec } = Route.useSearch()
  const [month, setMonth] = useState(mjesec ?? currentMonth)
  const [filter, setFilter] = useState<'sve' | InputSource>('sve')
  const fin = useRemote(() => getFinanceFn({ data: { token: 'sesija' } }), [])
  const from = `${month}-01`
  const to = (() => {
    const [y, m] = month.split('-').map(Number)
    return `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`
  })()
  const rows = useMemo(
    () => (fin.data ? inputBook({ receipts, expenses: fin.data.expenses, ledger: fin.data.ledger, suppliers }, from, to) : []),
    [fin.data, receipts, suppliers, from, to],
  )
  const tot = bookTotals(rows)
  const list = rows.filter((r) => filter === 'sve' || r.source === filter)
  const sales = useMemo(() => realized(orders, movements, { from, to }), [orders, movements, from, to])
  const outVat = sales.reduce((s, x) => s + x.vat, 0)
  const due = outVat - tot.all.vat
  const estimated = rows.filter((r) => !r.exactVat).length
  const router = useRouter()
  const { notify } = useStore()
  const [editing, setEditing] = useState<string | null>(null)
  const [vatDraft, setVatDraft] = useState('')
  async function saveVat(receiptId: string, reset = false) {
    try {
      await setReceiptVatFn({ data: { id: receiptId, vat: reset ? null : parseAmount(vatDraft || '0') } })
      await router.invalidate()
      notify(reset ? 'PDV primke vraćen na 17 %.' : 'PDV s računa je upisan.')
      setEditing(null)
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Spremanje nije uspjelo.')
    }
  }
  const label = (k: string) => `${monthShort(Number(k.slice(5)) - 1)} ${k.slice(0, 4)}`

  async function exportXlsx() {
    const { exportTables } = await import('../lib/excel')
    await exportTables(`knjiga-ulaznih-racuna-${month}.xlsx`, [
      {
        sheet: 'Ulazni računi',
        title: `Knjiga ulaznih računa (kontrolna) — ${label(month)}`,
        header: ['R.br.', 'Datum', 'Vrsta', 'Dobavljač', 'Broj računa', 'Opis', 'Osnovica', 'PDV', 'Ukupno', 'PDV s računa'],
        widths: [7, 12, 18, 26, 18, 34, 14, 12, 14, 12],
        rows: [
          ...rows.map((r, i) => [i + 1, { date: r.date }, INPUT_SOURCE_LABEL[r.source], r.supplier, r.document, r.description, r.base, r.vat, r.total, r.exactVat ? 'da' : 'procjena 17 %']),
          [],
          [null, null, { bold: 'Ukupno' }, '', '', '', tot.all.base, tot.all.vat, tot.all.total, ''],
        ],
      },
      {
        sheet: 'PDV kontrola',
        title: `PDV kontrola — ${label(month)}`,
        header: ['Stavka', 'Osnovica', 'PDV'],
        widths: [36, 16, 16],
        rows: [
          ['Izlazni PDV — prodaja', sales.reduce((s, x) => s + x.net, 0), outVat],
          ['Ulazni — primke', tot.primka.base, tot.primka.vat],
          ['Ulazni — troškovi', tot.trosak.base, tot.trosak.vat],
          ['Ulazni — računi dobavljača', tot.racun.base, tot.racun.vat],
          ['Ulazni — odobrenja', tot.odobrenje.base, tot.odobrenje.vat],
          [{ bold: due >= 0 ? 'Za uplatu' : 'Za povrat' }, null, Math.abs(due)],
        ],
      },
    ])
  }

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Poslovanje"
        title="Knjiga ulaznih računa"
        description="Kontrolni pregled svih ulaznih računa s PDV-om: primke robe, troškovi i računi dobavljača upisani na karticu. Služi za provjeru s knjigovođom; službenu evidenciju vodi knjigovodstvo."
        actions={
          <>
            <Select label="Mjesec" value={month} onChange={setMonth} options={lastMonths(currentMonth, 18).reverse().map((k) => ({ value: k, label: label(k) }))} />
            <Button variant="copper" onClick={exportXlsx} disabled={!fin.data}>
              <FileSpreadsheet className="size-4" /> Excel za knjigovođu
            </Button>
          </>
        }
      />

      {fin.error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{fin.error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat tone="accent" icon={BookOpenCheck} label="Ulazni PDV ukupno" value={money2(tot.all.vat)} hint={`${tot.all.count} računa · osnovica ${money2(tot.all.base)}`} />
        <Stat label="Izlazni PDV (prodaja)" value={money2(outVat)} hint="po realizaciji u mjesecu" />
        <Stat tone={due >= 0 ? 'warn' : 'good'} label={due >= 0 ? 'Razlika za uplatu' : 'Razlika za povrat'} value={money2(Math.abs(due))} hint="kontrolni izračun" />
        <Stat label="PDV po procjeni" value={String(estimated)} hint={estimated ? 'primke bez upisanog PDV-a s računa' : 'svi iznosi su s računa'} tone={estimated ? 'warn' : 'good'} />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(['primka', 'trosak', 'racun', 'odobrenje'] as InputSource[]).map((k) => (
          <div key={k} className="rounded-2xl border border-walnut-200/70 bg-linen px-4 py-3 text-sm">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-walnut-500">{INPUT_SOURCE_LABEL[k]}</div>
            <div className="mt-1 font-display text-lg font-semibold tabular">{money2(tot[k].vat)}</div>
            <div className="text-xs text-walnut-500">
              {tot[k].count} {tot[k].count === 1 ? 'račun' : 'računa'} · osnovica {money2(tot[k].base)}
            </div>
          </div>
        ))}
      </div>

      <Card flush>
        <div className="flex flex-wrap items-center gap-2 border-b border-walnut-200/70 px-5 py-3">
          <Chip active={filter === 'sve'} onClick={() => setFilter('sve')}>
            Svi ({rows.length})
          </Chip>
          {(['primka', 'trosak', 'racun', 'odobrenje'] as InputSource[]).map((k) => (
            <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>
              {INPUT_SOURCE_LABEL[k]} ({tot[k].count})
            </Chip>
          ))}
        </div>
        {!fin.data ? (
          <div className="px-5 py-10 text-center text-sm text-walnut-500">Učitavam…</div>
        ) : list.length === 0 ? (
          <EmptyState icon={BookOpenCheck} title="Nema ulaznih računa za ovaj mjesec" />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[900px]">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Vrsta</th>
                  <th>Dobavljač</th>
                  <th>Broj računa / opis</th>
                  <th className="text-right">Osnovica</th>
                  <th className="text-right">PDV</th>
                  <th className="text-right">Ukupno</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.key}>
                    <td className="tabular">{date(r.date)}</td>
                    <td>
                      <Badge tone={TONE[r.source]}>{INPUT_SOURCE_LABEL[r.source]}</Badge>
                    </td>
                    <td className="font-medium">{r.supplier}</td>
                    <td>
                      <div>{r.document || '—'}</div>
                      {r.description && <div className="text-xs text-walnut-500">{r.description}</div>}
                    </td>
                    <td className="text-right tabular">{money2(r.base)}</td>
                    <td className="text-right font-semibold tabular">
                      {r.source === 'primka' && editing === r.key ? (
                        <span className="inline-flex items-center gap-1">
                          <input
                            className="w-24 rounded-md border border-copper-300 bg-white px-2 py-1 text-right text-sm"
                            inputMode="decimal"
                            autoFocus
                            value={vatDraft}
                            onChange={(e) => setVatDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveVat(r.key.slice(1))
                              if (e.key === 'Escape') setEditing(null)
                            }}
                            aria-label="PDV s računa"
                          />
                          <button className="rounded px-1.5 py-1 text-xs font-semibold text-copper-700 hover:bg-copper-50" onClick={() => saveVat(r.key.slice(1))}>
                            Spremi
                          </button>
                          <button className="rounded px-1.5 py-1 text-xs text-walnut-500 hover:bg-walnut-100" title="Vrati na 17 %" onClick={() => saveVat(r.key.slice(1), true)}>
                            17 %
                          </button>
                        </span>
                      ) : (
                        <>
                          {money2(r.vat)}
                          {!r.exactVat && (
                            <span className="ml-1 text-[10px] font-normal text-amber-700" title="Procjena 17 % — upišite PDV s računa">
                              ≈
                            </span>
                          )}
                          {r.source === 'primka' && (
                            <button
                              className="ml-1.5 rounded p-1 align-middle text-walnut-400 hover:bg-walnut-100 hover:text-walnut-800"
                              aria-label="Upiši PDV s računa"
                              title="Upiši PDV s računa dobavljača"
                              onClick={() => {
                                setEditing(r.key)
                                setVatDraft(String(r.vat).replace('.', ','))
                              }}
                            >
                              <Pencil className="size-3" />
                            </button>
                          )}
                        </>
                      )}
                    </td>
                    <td className="text-right tabular">{money2(r.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={4}>Ukupno</td>
                  <td className="text-right tabular">{money2(list.reduce((s, r) => s + r.base, 0))}</td>
                  <td className="text-right tabular">{money2(list.reduce((s, r) => s + r.vat, 0))}</td>
                  <td className="text-right tabular">{money2(list.reduce((s, r) => s + r.total, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-4 flex items-start gap-2 text-xs text-walnut-500">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>
        Primke s oznakom ≈ nemaju upisan PDV s računa pa je uzeto 17 % od nabavne vrijednosti — PDV s računa upišite olovkom pored iznosa ili već pri prijemu robe. Troškovi se unose na{' '}
        <Link to="/troskovi" className="font-semibold text-copper-700 hover:underline">
          Troškovi i zarada
        </Link>
        , a računi dobavljača (npr. prevoz) na kartici dobavljača.
        </span>
      </p>
    </div>
  )
}
