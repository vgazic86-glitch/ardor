import { createFileRoute } from '@tanstack/react-router'
import {
  Banknote,
  Download,
  FileSpreadsheet,
  Landmark,
  Percent,
  Receipt as ReceiptIcon,
  Scale,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { GroupedChart } from '../components/Charts'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  PageHeader,
  Progress,
  Segmented,
  Stat,
  inputCls,
} from '../components/ui'
import {
  count,
  date,
  money,
  money2,
  monthLong,
  monthShort,
  pct,
  VAT_RATE,
} from '../lib/format'
import {
  advances,
  debts,
  marginBy,
  marginBySeller,
  monthRange,
  paymentsByMethod,
  paymentsIn,
  realized,
  stockValue,
  sum,
  vatSummary,
  type Group,
  type Period,
} from '../lib/reports'
import { lastMonths, previousMonthKey } from '../lib/stats'
import { useStore } from '../lib/store'
import { PAYMENT_METHODS } from '../lib/types'

export const Route = createFileRoute('/izvjestaji')({ component: ReportsPage })

type Preset = 'mjesec' | 'prosli' | 'godina' | 'vlastito'

function MarginTable({
  title,
  rows,
  unit,
}: {
  title: string
  rows: Group[]
  unit: string
}) {
  const total = sum(rows, (r) => r.net)
  return (
    <Card title={title} flush>
      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-walnut-500">
          Nema prodaje u periodu.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table min-w-[520px]">
            <thead>
              <tr>
                <th>Naziv</th>
                <th className="text-right">{unit}</th>
                <th className="text-right">Prihod bez PDV-a</th>
                <th className="text-right">Marža</th>
                <th className="w-28 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const m = r.net ? r.margin / r.net : 0
                return (
                  <tr key={r.key}>
                    <td>
                      <div className="font-medium">{r.label}</div>
                      <div className="mt-1 w-full max-w-[180px]">
                        <Progress
                          value={total ? r.net / total : 0}
                          color="#c9b8a8"
                        />
                      </div>
                    </td>
                    <td className="text-right tabular text-walnut-700">
                      {r.qty}
                    </td>
                    <td className="text-right tabular">{money(r.net)}</td>
                    <td className="text-right font-semibold tabular">
                      {money(r.margin)}
                    </td>
                    <td className="text-right">
                      <Badge
                        tone={m < 0.15 ? 'bad' : m < 0.25 ? 'warn' : 'good'}
                      >
                        {pct(m)}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function ReportsPage() {
  const store = useStore()
  const {
    orders,
    movements,
    receipts,
    products,
    today,
    currentMonth,
    customerById,
    employeeById,
    productById,
    supplierById,
  } = store
  const [preset, setPreset] = useState<Preset>('mjesec')
  const [from, setFrom] = useState(monthRange(currentMonth).from)
  const [to, setTo] = useState(today)
  const [exporting, setExporting] = useState(false)

  const period: Period = useMemo(() => {
    if (preset === 'mjesec')
      return { from: monthRange(currentMonth).from, to: today }
    if (preset === 'prosli') return monthRange(previousMonthKey(currentMonth))
    if (preset === 'godina')
      return { from: `${today.slice(0, 4)}-01-01`, to: today }
    return { from, to }
  }, [preset, from, to, currentMonth, today])

  const sales = useMemo(
    () => realized(orders, movements, period),
    [orders, movements, period],
  )
  const vat = useMemo(
    () => vatSummary(sales, receipts, period),
    [sales, receipts, period],
  )
  const pays = useMemo(() => paymentsIn(orders, period), [orders, period])
  const byMethod = paymentsByMethod(pays)
  const byCategory = useMemo(
    () => marginBy(sales, movements, productById, 'category'),
    [sales, movements, productById],
  )
  const byProduct = useMemo(
    () => marginBy(sales, movements, productById, 'product').slice(0, 10),
    [sales, movements, productById],
  )
  const bySeller = useMemo(
    () => marginBySeller(sales, employeeById),
    [sales, employeeById],
  )
  const debtList = useMemo(
    () => debts(orders, customerById, today),
    [orders, customerById, today],
  )
  const adv = advances(orders)

  const gross = sum(sales, (s) => s.gross)
  const net = sum(sales, (s) => s.net)
  const cogs = sum(sales, (s) => s.cogs)
  const margin = net - cogs
  const paid = sum(pays, (p) => p.amount)
  const debtTotal = sum(debtList, (d) => d.due)
  const debtIssued = sum(debtList, (d) => d.issuedDue)

  const months = lastMonths(currentMonth, 12)
  const trend = months.map((k) => {
    const s = realized(orders, movements, monthRange(k))
    return { net: sum(s, (x) => x.net), cogs: sum(s, (x) => x.cogs) }
  })

  const title =
    preset === 'mjesec'
      ? `${monthLong(Number(currentMonth.slice(5)) - 1)} ${currentMonth.slice(0, 4)}.`
      : preset === 'prosli'
        ? `${monthLong(Number(previousMonthKey(currentMonth).slice(5)) - 1)} ${previousMonthKey(currentMonth).slice(0, 4)}.`
        : preset === 'godina'
          ? `${today.slice(0, 4)}. godina`
          : `${date(period.from)} – ${date(period.to)}`

  async function doExport() {
    setExporting(true)
    try {
      const { exportReport } = await import('../lib/excel')
      await exportReport({
        period,
        title,
        sales,
        vat,
        payments: pays,
        byCategory,
        bySeller,
        debts: debtList,
        advances: adv,
        products,
        customerById,
        employeeById,
        supplierById,
        productById,
      })
      store.notify('Excel izvještaj je preuzet.')
    } catch (e) {
      store.notify(`Izvoz nije uspio: ${e instanceof Error ? e.message : e}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Knjigovodstvo"
        title="Izvještaji"
        description="Prihod se priznaje kada roba izađe iz salona (realizacija). Marža je razlika između prihoda bez PDV-a i nabavne vrijednosti prodane robe iz zaliha."
        actions={
          <Button variant="copper" onClick={doExport} disabled={exporting}>
            <FileSpreadsheet className="size-4" />{' '}
            {exporting ? 'Pripremam…' : 'Izvoz u Excel'}
          </Button>
        }
      />

      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <div className="mb-1 text-xs font-semibold text-walnut-700">
              Period
            </div>
            <Segmented
              value={preset}
              onChange={setPreset}
              options={[
                { value: 'mjesec', label: 'Ovaj mjesec' },
                { value: 'prosli', label: 'Prošli mjesec' },
                { value: 'godina', label: 'Ova godina' },
                { value: 'vlastito', label: 'Odaberi datume' },
              ]}
            />
          </div>
          {preset === 'vlastito' && (
            <>
              <Field label="Od">
                <input
                  type="date"
                  className={inputCls}
                  value={from}
                  max={to}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </Field>
              <Field label="Do">
                <input
                  type="date"
                  className={inputCls}
                  value={to}
                  min={from}
                  onChange={(e) => setTo(e.target.value)}
                />
              </Field>
            </>
          )}
          <div className="ml-auto text-right">
            <div className="font-display text-xl font-semibold capitalize">
              {title}
            </div>
            <div className="text-xs text-walnut-500">
              {date(period.from)} – {date(period.to)} · {count(sales.length)}{' '}
              realizovanih narudžbi
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat
          tone="accent"
          icon={Wallet}
          label="Prihod s PDV-om"
          value={money(gross)}
          hint={`osnovica ${money(net)}`}
        />
        <Stat
          icon={Scale}
          label="Nabavna vrijednost"
          value={money(cogs)}
          hint="prodane robe, iz zaliha"
        />
        <Stat
          tone="good"
          icon={Percent}
          label="Bruto marža"
          value={money(margin)}
          hint={net ? `${pct(margin / net)} od prihoda bez PDV-a` : '—'}
        />
        <Stat
          tone={vat.due > 0 ? 'warn' : 'default'}
          icon={Landmark}
          label="PDV obaveza"
          value={money(vat.due)}
          hint={`izlazni ${money(vat.outVat)} − ulazni ${money(vat.inVat)}`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card
          title="Prihod i marža — zadnjih 12 mjeseci"
          subtitle="po realizaciji, bez PDV-a"
        >
          <GroupedChart
            labels={months.map((k) => monthShort(Number(k.slice(5)) - 1))}
            series={[
              {
                label: 'Prihod',
                values: trend.map((t) => t.net),
                color: '#3d2f26',
              },
              {
                label: 'Nabavna',
                values: trend.map((t) => t.cogs),
                color: '#c9b8a8',
              },
              {
                label: 'Marža',
                values: trend.map((t) => t.net - t.cogs),
                color: '#b0703b',
              },
            ]}
          />
        </Card>

        <Card
          title="PDV pregled"
          subtitle={`stopa ${Math.round(VAT_RATE * 100)}%`}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-walnut-500">
                <th className="pb-2 font-semibold" />
                <th className="pb-2 text-right font-semibold">Osnovica</th>
                <th className="pb-2 text-right font-semibold">PDV</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-walnut-100">
                <td className="py-2.5">Izlazni — prodaja</td>
                <td className="py-2.5 text-right tabular">
                  {money2(vat.outBase)}
                </td>
                <td className="py-2.5 text-right tabular">
                  {money2(vat.outVat)}
                </td>
              </tr>
              <tr className="border-t border-walnut-100">
                <td className="py-2.5">
                  Ulazni — {vat.receipts.length} primki
                </td>
                <td className="py-2.5 text-right tabular">
                  {money2(vat.inBase)}
                </td>
                <td className="py-2.5 text-right tabular">
                  − {money2(vat.inVat)}
                </td>
              </tr>
              <tr className="border-t-2 border-walnut-300 font-bold">
                <td className="py-2.5">
                  {vat.due >= 0 ? 'Za uplatu' : 'Za povrat'}
                </td>
                <td />
                <td className="py-2.5 text-right font-display text-lg tabular">
                  {money2(Math.abs(vat.due))}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 rounded-lg bg-walnut-50 p-3 text-xs text-walnut-600">
            Ulazni PDV računa se iz primki po nabavnoj cijeni bez PDV-a. Za
            prijavu PDV-a provjerite s knjigovođom ostale ulazne račune (režije,
            usluge).
          </p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card
          title="Naplata u periodu"
          subtitle={`${count(pays.length)} uplata`}
          action={
            <span className="font-display text-xl font-semibold tabular">
              {money(paid)}
            </span>
          }
        >
          <div className="space-y-3">
            {PAYMENT_METHODS.map((m) => {
              const g = byMethod.get(m) ?? { n: 0, amount: 0 }
              return (
                <div key={m}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <Banknote className="size-4 text-walnut-400" /> {m}
                      <span className="text-xs font-normal text-walnut-500">
                        {g.n} uplata
                      </span>
                    </span>
                    <span className="font-semibold tabular">
                      {money(g.amount)}
                    </span>
                  </div>
                  <Progress
                    value={paid ? g.amount / paid : 0}
                    color={
                      m === 'Gotovina'
                        ? '#4f6b4a'
                        : m === 'Kartica'
                          ? '#3d2f26'
                          : m === 'Virman'
                            ? '#b0703b'
                            : '#8b7464'
                    }
                  />
                </div>
              )
            })}
          </div>
        </Card>

        <Card title="Potraživanja i avansi" subtitle="stanje na današnji dan">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-copper-50 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-copper-700">
                Dospjelo
              </div>
              <div className="font-display text-xl font-semibold tabular">
                {money(debtIssued)}
              </div>
              <div className="text-[11px] text-walnut-600">roba isporučena</div>
            </div>
            <div className="rounded-xl bg-walnut-50 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-walnut-500">
                Nedospjelo
              </div>
              <div className="font-display text-xl font-semibold tabular">
                {money(debtTotal - debtIssued)}
              </div>
              <div className="text-[11px] text-walnut-600">
                ostatak do isporuke
              </div>
            </div>
            <div className="rounded-xl bg-moss-50 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-moss-700">
                Avansi
              </div>
              <div className="font-display text-xl font-semibold tabular">
                {money(adv)}
              </div>
              <div className="text-[11px] text-walnut-600">
                primljeno, nije isporučeno
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-walnut-200 p-3 text-sm">
            <span className="flex items-center gap-2">
              <ReceiptIcon className="size-4 text-walnut-400" /> Vrijednost
              zaliha po nabavnoj
            </span>
            <b className="tabular">{money(stockValue(products))}</b>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <MarginTable
          title="Marža po kategoriji"
          rows={byCategory}
          unit="Kom."
        />
        <MarginTable
          title="Marža po prodavaču"
          rows={bySeller}
          unit="Narudžbi"
        />
      </div>

      <div className="mt-6">
        <MarginTable
          title="Najprodavaniji artikli (top 10)"
          rows={byProduct}
          unit="Kom."
        />
      </div>

      <Card
        title="Dugovanja kupaca"
        subtitle="Nenaplaćeni iznosi po kupcu, najveći prvi"
        flush
        className="mt-6"
        action={<Badge tone="copper">{debtList.length} kupaca</Badge>}
      >
        {debtList.length === 0 ? (
          <EmptyState icon={Wallet} title="Nema dugovanja">
            Svi kupci su platili.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[760px]">
              <thead>
                <tr>
                  <th>Kupac</th>
                  <th>Narudžbe</th>
                  <th className="text-right">Ukupno</th>
                  <th className="text-right">Dug</th>
                  <th className="text-right">Dospjelo</th>
                  <th className="text-right">Starost</th>
                </tr>
              </thead>
              <tbody>
                {debtList.slice(0, 25).map((d) => (
                  <tr key={d.customer.id}>
                    <td>
                      <div className="font-semibold">{d.customer.name}</div>
                      <div className="text-xs text-walnut-500">
                        {[d.customer.phone, d.customer.city]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </td>
                    <td className="text-xs text-walnut-700">
                      {d.orders.map((o) => o.number).join(', ')}
                    </td>
                    <td className="text-right tabular text-walnut-700">
                      {money(d.total)}
                    </td>
                    <td className="text-right font-semibold tabular">
                      {money(d.due)}
                    </td>
                    <td
                      className={`text-right tabular ${d.issuedDue > 0 ? 'font-semibold text-copper-600' : 'text-walnut-400'}`}
                    >
                      {d.issuedDue > 0 ? money(d.issuedDue) : '—'}
                    </td>
                    <td className="text-right">
                      <Badge
                        tone={
                          d.days > 60 ? 'bad' : d.days > 30 ? 'warn' : 'neutral'
                        }
                      >
                        {d.days} dana
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-6 flex justify-center">
        <Button variant="outline" onClick={doExport} disabled={exporting}>
          <Download className="size-4" /> Preuzmi sve tablice u Excelu (10
          listova)
        </Button>
      </div>
    </div>
  )
}
