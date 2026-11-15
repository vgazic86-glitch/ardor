import { createFileRoute } from '@tanstack/react-router'
import {
  CopyPlus,
  FileSpreadsheet,
  Landmark,
  LogOut,
  Paperclip,
  Pencil,
  Percent,
  Plus,
  Receipt as ReceiptIcon,
  Repeat,
  Scale,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminGate } from '../components/AdminGate'
import { GroupedChart } from '../components/Charts'
import { Modal } from '../components/Modal'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  PageHeader,
  Progress,
  Segmented,
  Select,
  Stat,
  inputCls,
} from '../components/ui'
import { isAuthError, useAdmin } from '../lib/admin'
import { ACCEPT, fileSize, openDownload, toUpload } from '../lib/files'
import {
  date,
  money,
  money2,
  monthLong,
  monthShort,
  parseAmount,
  pct,
  VAT_RATE,
} from '../lib/format'
import { monthProfit, type MonthProfit } from '../lib/profit'
import { lastMonths, previousMonthKey } from '../lib/stats'
import { useStore } from '../lib/store'
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  type Expense,
  type FinanceSettings,
} from '../lib/types'
import {
  copyRecurringFn,
  deleteExpenseFn,
  downloadExpenseFileFn,
  getFinanceFn,
  saveExpenseFn,
  saveFinanceSettingsFn,
} from '../server/api'
import type { FinanceData } from '../server/finance'

export const Route = createFileRoute('/troskovi')({ component: FinancePage })

const label = (k: string) =>
  `${monthLong(Number(k.slice(5)) - 1)} ${k.slice(0, 4)}.`

function useFinance() {
  const { token, expire } = useAdmin()
  const { notify } = useStore()
  const [data, setData] = useState<FinanceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    try {
      setData(await getFinanceFn({ data: { token } }))
      setError(null)
    } catch (e) {
      if (isAuthError(e)) expire()
      setError(e instanceof Error ? e.message : 'Greška pri učitavanju.')
    }
  }, [token, expire])

  useEffect(() => {
    load()
  }, [load])

  const run = useCallback(
    async <T,>(
      fn: (token: string) => Promise<T>,
      ok?: string | ((r: T) => string),
    ) => {
      if (!token) return false
      setBusy(true)
      try {
        const r = await fn(token)
        await load()
        if (ok) notify(typeof ok === 'function' ? ok(r) : ok)
        return true
      } catch (e) {
        if (isAuthError(e)) expire()
        notify(e instanceof Error ? e.message : 'Greška.')
        return false
      } finally {
        setBusy(false)
      }
    },
    [token, load, notify, expire],
  )
  return { data, error, busy, run, token }
}
type Fin = ReturnType<typeof useFinance>

function FinancePage() {
  return (
    <div className="rise">
      <PageHeader
        eyebrow="Poslovanje"
        title="Troškovi i zarada"
        description="Unos troškova poslovanja i mjesečni obračun zarade: prihod bez PDV-a, minus nabavna vrijednost prodane robe, troškovi i plaće. Dostupno uz upravljačku lozinku."
      />
      <AdminGate title="Troškovi i zarada">
        <FinanceContent />
      </AdminGate>
    </div>
  )
}

function FinanceContent() {
  const fin = useFinance()
  const { currentMonth } = useStore()
  const { logout } = useAdmin()
  const [tab, setTab] = useState<'zarada' | 'troskovi' | 'postavke'>('zarada')
  const [month, setMonth] = useState(currentMonth)
  const months = lastMonths(currentMonth, 12).reverse()

  if (!fin.data)
    return fin.error ? (
      <Card>
        <p className="text-sm text-rose-700">{fin.error}</p>
      </Card>
    ) : (
      <div className="h-64 animate-pulse rounded-2xl bg-walnut-100/70" />
    )

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'zarada', label: 'Obračun zarade' },
            { value: 'troskovi', label: 'Troškovi' },
            { value: 'postavke', label: 'Postavke' },
          ]}
        />
        {tab !== 'postavke' && (
          <Select
            label="Mjesec"
            value={month}
            onChange={setMonth}
            options={months.map((k) => ({ value: k, label: label(k) }))}
          />
        )}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={logout}>
          <LogOut className="size-3.5" /> Zaključaj
        </Button>
      </div>
      {tab === 'zarada' && <ProfitTab data={fin.data} month={month} />}
      {tab === 'troskovi' && (
        <ExpensesTab fin={fin} data={fin.data} month={month} />
      )}
      {tab === 'postavke' && (
        <SettingsTab fin={fin} settings={fin.data.settings} />
      )}
    </>
  )
}

/* ───────────────────────── obračun zarade ───────────────────────── */

function Line({
  label,
  value,
  strong,
  minus,
  sub,
  tone,
}: {
  label: string
  value: number
  strong?: boolean
  minus?: boolean
  sub?: boolean
  tone?: 'good' | 'bad'
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-2 ${strong ? 'border-t border-walnut-200 font-semibold' : ''} ${sub ? 'pl-5 text-[13px] text-walnut-600' : ''}`}
    >
      <span>{label}</span>
      <span
        className={`tabular ${tone === 'good' ? 'text-moss-600' : tone === 'bad' ? 'text-rose-700' : ''}`}
      >
        {minus && value ? '− ' : ''}
        {money2(Math.abs(value) * (value < 0 && !minus ? -1 : 1))}
      </span>
    </div>
  )
}

function ProfitTab({ data, month }: { data: FinanceData; month: string }) {
  const { orders, movements, receipts, employees, currentMonth, notify } =
    useStore()
  const input = useMemo(
    () => ({
      orders,
      movements,
      receipts,
      employees,
      expenses: data.expenses,
      salaries: data.hr.salaries,
      bonuses: data.hr.bonuses,
      settings: data.settings,
    }),
    [orders, movements, receipts, employees, data],
  )
  const p = useMemo(() => monthProfit(month, input), [month, input])
  const prev = useMemo(
    () => monthProfit(previousMonthKey(month), input),
    [month, input],
  )
  const year = useMemo(
    () => lastMonths(currentMonth, 12).map((k) => monthProfit(k, input)),
    [currentMonth, input],
  )
  const costMax = Math.max(
    1,
    ...p.expensesByCategory.map(([, v]) => v),
    p.payroll.total,
  )
  const delta = prev.profitBeforeTax
    ? (p.profitBeforeTax - prev.profitBeforeTax) /
      Math.abs(prev.profitBeforeTax)
    : NaN

  async function exportXlsx() {
    const { default: writeXlsxFile } = await import('write-excel-file/browser')
    const h = (v: string) => ({
      value: v,
      fontWeight: 'bold' as const,
      backgroundColor: '#EFE7DD',
    })
    const n = (v: number) => ({
      value: Math.round(v * 100) / 100,
      type: Number,
      format: '#,##0.00',
    })
    const statement = [
      [
        {
          value: `Ardor — obračun zarade, ${label(month)}`,
          fontWeight: 'bold' as const,
          fontSize: 14,
        },
      ],
      [
        'Upravljački izračun (nije zvanični finansijski izvještaj). Iznosi u KM, bez PDV-a.',
      ],
      [],
      [h('Stavka'), h('Iznos')],
      ['Prihod od prodaje (bez PDV-a)', n(p.revenueNet)],
      ['Nabavna vrijednost prodane robe', n(-p.cogs)],
      [{ value: 'Bruto marža', fontWeight: 'bold' as const }, n(p.grossMargin)],
      ...p.expensesByCategory.map(([c, v]) => [`  ${c}`, n(-v)]),
      ['Troškovi poslovanja ukupno', n(-p.expenses)],
      ['  Bruto plaće', n(-p.payroll.gross)],
      ['  Topli obrok i prijevoz', n(-p.payroll.allowances)],
      ['  Doprinosi poslodavca', n(-p.payroll.contributions)],
      ['  Odobreni bonusi', n(-p.payroll.bonuses)],
      ['Troškovi zaposlenih ukupno', n(-p.payroll.total)],
      [
        { value: 'Dobit prije poreza', fontWeight: 'bold' as const },
        n(p.profitBeforeTax),
      ],
      [
        `Procjena poreza na dobit (${pct(data.settings.profitTaxPct)})`,
        n(-p.tax),
      ],
      [{ value: 'Neto dobit', fontWeight: 'bold' as const }, n(p.netProfit)],
      [],
      [h('PDV'), h('Iznos')],
      ['Izlazni PDV', n(p.vat.output)],
      ['Ulazni PDV — primke', n(-p.vat.inputReceipts)],
      ['Ulazni PDV — troškovi', n(-p.vat.inputExpenses)],
      [{ value: 'PDV obaveza', fontWeight: 'bold' as const }, n(p.vat.due)],
    ]
    const trend = [
      [
        'Mjesec',
        'Prihod bez PDV-a',
        'Nabavna',
        'Bruto marža',
        'Troškovi',
        'Zaposleni',
        'Dobit prije poreza',
        'Neto dobit',
        'Marža %',
      ].map(h),
      ...year.map((y) => [
        label(y.month),
        n(y.revenueNet),
        n(y.cogs),
        n(y.grossMargin),
        n(y.expenses),
        n(y.payroll.total),
        n(y.profitBeforeTax),
        n(y.netProfit),
        { value: y.margin, type: Number, format: '0.0%' },
      ]),
    ]
    const exp = data.expenses.filter((e) => e.date.startsWith(month))
    const expSheet = [
      [
        'Datum',
        'Kategorija',
        'Opis',
        'Dobavljač',
        'Dokument',
        'Bez PDV-a',
        'PDV',
        'Ukupno',
        'Plaćanje',
        'Fiksni',
      ].map(h),
      ...exp.map((e) => [
        {
          value: new Date(e.date + 'T00:00:00Z'),
          type: Date,
          format: 'dd.mm.yyyy',
        },
        e.category,
        e.description,
        e.supplier,
        e.documentNumber,
        n(e.net),
        n(e.vat),
        n(e.net + e.vat),
        e.paymentMethod,
        e.recurring ? 'da' : '',
      ]),
    ]
    await writeXlsxFile([
      {
        sheet: 'Obračun zarade',
        data: statement,
        columns: [{ width: 44 }, { width: 18 }],
      },
      {
        sheet: '12 mjeseci',
        data: trend,
        columns: [16, 16, 14, 14, 14, 14, 18, 14, 10].map((width) => ({
          width,
        })),
      },
      {
        sheet: 'Troškovi',
        data: expSheet,
        columns: [12, 28, 34, 20, 14, 14, 12, 14, 12, 8].map((width) => ({
          width,
        })),
      },
    ] as never).toFile(`ardor-zarada-${month}.xlsx`)
    notify('Excel s obračunom zarade je preuzet.')
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat
          tone="accent"
          icon={Wallet}
          label="Prihod bez PDV-a"
          value={money(p.revenueNet)}
          hint={`${p.orders} realizovanih narudžbi`}
        />
        <Stat
          icon={Scale}
          label="Bruto marža"
          value={money(p.grossMargin)}
          hint={
            p.revenueNet ? `${pct(p.grossMargin / p.revenueNet)} prihoda` : '—'
          }
        />
        <Stat
          icon={ReceiptIcon}
          label="Troškovi i plaće"
          value={money(p.expenses + p.payroll.total)}
          hint={`troškovi ${money(p.expenses)} · zaposleni ${money(p.payroll.total)}`}
        />
        <Stat
          tone={p.profitBeforeTax >= 0 ? 'good' : 'warn'}
          icon={p.profitBeforeTax >= 0 ? TrendingUp : TrendingDown}
          label="Dobit prije poreza"
          value={money(p.profitBeforeTax)}
          hint={
            <>
              {Number.isFinite(delta) && (
                <span
                  className={delta >= 0 ? 'text-moss-600' : 'text-rose-700'}
                >
                  {delta >= 0 ? '▲' : '▼'} {Math.abs(Math.round(delta * 100))}
                  %{' '}
                </span>
              )}
              neto marža {pct(p.margin)}
            </>
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card
          title={`Račun dobiti i gubitka — ${label(month)}`}
          subtitle="Upravljački izračun, iznosi bez PDV-a"
          action={
            <Button variant="outline" size="sm" onClick={exportXlsx}>
              <FileSpreadsheet className="size-4" /> Excel
            </Button>
          }
        >
          <div className="text-sm">
            <Line label="Prihod od prodaje (bez PDV-a)" value={p.revenueNet} />
            <Line
              label="Nabavna vrijednost prodane robe"
              value={p.cogs}
              minus
            />
            <Line label="Bruto marža" value={p.grossMargin} strong />
            {p.expensesByCategory.map(([c, v]) => (
              <Line key={c} label={c} value={v} minus sub />
            ))}
            <Line label="Troškovi poslovanja" value={p.expenses} minus />
            {data.settings.includePayroll && (
              <>
                <Line label="Bruto plaće" value={p.payroll.gross} minus sub />
                <Line
                  label="Topli obrok i prijevoz"
                  value={p.payroll.allowances}
                  minus
                  sub
                />
                {p.payroll.contributions > 0 && (
                  <Line
                    label="Doprinosi poslodavca"
                    value={p.payroll.contributions}
                    minus
                    sub
                  />
                )}
                <Line
                  label="Odobreni bonusi"
                  value={p.payroll.bonuses}
                  minus
                  sub
                />
                <Line
                  label="Troškovi zaposlenih"
                  value={p.payroll.total}
                  minus
                />
              </>
            )}
            <Line
              label="Dobit prije poreza"
              value={p.profitBeforeTax}
              strong
              tone={p.profitBeforeTax >= 0 ? 'good' : 'bad'}
            />
            <Line
              label={`Procjena poreza na dobit (${pct(data.settings.profitTaxPct)})`}
              value={p.tax}
              minus
              sub
            />
            <div className="mt-1 flex items-baseline justify-between rounded-xl bg-walnut-900 px-4 py-3 text-linen">
              <span className="font-semibold">Neto dobit</span>
              <span
                className={`font-display text-2xl font-semibold tabular ${p.netProfit < 0 ? 'text-rose-300' : 'text-copper-400'}`}
              >
                {money2(p.netProfit)}
              </span>
            </div>
          </div>
          {!data.settings.includePayroll && (
            <p className="mt-3 text-xs text-walnut-500">
              Plaće iz kadrovske evidencije nisu uključene (Postavke).
            </p>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Struktura troškova" subtitle={label(month)}>
            {p.expensesByCategory.length === 0 && !p.payroll.total ? (
              <p className="text-sm text-walnut-500">
                Nema unesenih troškova za ovaj mjesec.
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {p.payroll.total > 0 && (
                  <li>
                    <div className="mb-1 flex justify-between">
                      <span className="font-medium">
                        Zaposleni (plaće, bonusi)
                      </span>
                      <span className="font-semibold tabular">
                        {money(p.payroll.total)}
                      </span>
                    </div>
                    <Progress
                      value={p.payroll.total / costMax}
                      color="#3d2f26"
                    />
                  </li>
                )}
                {p.expensesByCategory.map(([c, v]) => (
                  <li key={c}>
                    <div className="mb-1 flex justify-between">
                      <span>{c}</span>
                      <span className="font-semibold tabular">{money(v)}</span>
                    </div>
                    <Progress value={v / costMax} color="#F79328" />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card
            title="PDV za mjesec"
            subtitle={`stopa ${Math.round(VAT_RATE * 100)} %`}
          >
            <div className="text-sm">
              <Line label="Izlazni PDV (prodaja)" value={p.vat.output} />
              <Line
                label="Ulazni PDV — primke"
                value={p.vat.inputReceipts}
                minus
              />
              <Line
                label="Ulazni PDV — troškovi"
                value={p.vat.inputExpenses}
                minus
              />
              <Line
                label={p.vat.due >= 0 ? 'Za uplatu' : 'Za povrat'}
                value={Math.abs(p.vat.due)}
                strong
              />
            </div>
          </Card>
        </div>
      </div>

      <Card
        title="Zadnjih 12 mjeseci"
        subtitle="Prihod bez PDV-a, ukupni troškovi (nabavna + troškovi + zaposleni) i dobit prije poreza"
      >
        <GroupedChart
          labels={year.map((y) => monthShort(Number(y.month.slice(5)) - 1))}
          series={[
            {
              label: 'Prihod',
              values: year.map((y) => y.revenueNet),
              color: '#3d2f26',
            },
            {
              label: 'Troškovi',
              values: year.map((y) => y.costsTotal),
              color: '#c9b8a8',
            },
            {
              label: 'Dobit',
              values: year.map((y) => y.profitBeforeTax),
              color: '#F79328',
            },
          ]}
        />
        <div className="-mx-5 mt-5 overflow-x-auto">
          <table className="data-table min-w-[820px]">
            <thead>
              <tr>
                <th>Mjesec</th>
                <th className="text-right">Prihod</th>
                <th className="text-right">Bruto marža</th>
                <th className="text-right">Troškovi</th>
                <th className="text-right">Zaposleni</th>
                <th className="text-right">Dobit prije poreza</th>
                <th className="text-right">Marža</th>
              </tr>
            </thead>
            <tbody>
              {[...year].reverse().map((y: MonthProfit) => (
                <tr
                  key={y.month}
                  className={y.month === month ? '!bg-copper-50' : ''}
                >
                  <td className="font-medium capitalize">{label(y.month)}</td>
                  <td className="text-right tabular">{money(y.revenueNet)}</td>
                  <td className="text-right tabular">{money(y.grossMargin)}</td>
                  <td className="text-right tabular text-walnut-700">
                    {money(y.expenses)}
                  </td>
                  <td className="text-right tabular text-walnut-700">
                    {money(y.payroll.total)}
                  </td>
                  <td
                    className={`text-right font-semibold tabular ${y.profitBeforeTax < 0 ? 'text-rose-700' : ''}`}
                  >
                    {money(y.profitBeforeTax)}
                  </td>
                  <td className="text-right">
                    {y.revenueNet ? (
                      <Badge
                        tone={
                          y.margin < 0
                            ? 'bad'
                            : y.margin < 0.08
                              ? 'warn'
                              : 'good'
                        }
                      >
                        {pct(y.margin)}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-center text-xs text-walnut-500">
        Upravljački izračun za praćenje poslovanja. Prihod i nabavna vrijednost
        računaju se po izlazu robe iz salona; zvanični obračun i porezne prijave
        radi knjigovodstvo.
      </p>
    </div>
  )
}

/* ───────────────────────── troškovi ───────────────────────── */

function ExpenseDialog({
  fin,
  expense,
  month,
  onClose,
}: {
  fin: Fin
  expense: Expense | null
  month: string
  onClose: () => void
}) {
  const { me, today, notify } = useStore()
  const [dateV, setDate] = useState(
    expense?.date ?? (today.startsWith(month) ? today : `${month}-01`),
  )
  const [category, setCategory] = useState<string>(
    expense?.category ?? EXPENSE_CATEGORIES[0],
  )
  const [description, setDescription] = useState(expense?.description ?? '')
  const [supplier, setSupplier] = useState(expense?.supplier ?? '')
  const [doc, setDoc] = useState(expense?.documentNumber ?? '')
  const [net, setNet] = useState(expense ? String(expense.net) : '')
  const [vat, setVat] = useState(expense ? String(expense.vat) : '')
  const [vatAuto, setVatAuto] = useState(!expense)
  const [payment, setPayment] = useState(expense?.paymentMethod ?? 'Virman')
  const [recurring, setRecurring] = useState(expense?.recurring ?? false)
  const [file, setFile] = useState<File | null>(null)
  const vatValue = vatAuto
    ? Math.round(parseAmount(net) * VAT_RATE * 100) / 100
    : parseAmount(vat)

  return (
    <Modal
      title={expense ? 'Uredi trošak' : 'Novi trošak'}
      subtitle="Iznos se unosi bez PDV-a; PDV se vodi zasebno i ulazi u obračun PDV-a."
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <span className="text-sm">
            Ukupno s PDV-om:{' '}
            <b className="tabular">{money2(parseAmount(net) + vatValue)}</b>
          </span>
          <Button variant="ghost" className="ml-auto" onClick={onClose}>
            Odustani
          </Button>
          <Button type="submit" form="expense-form" disabled={fin.busy}>
            Spremi trošak
          </Button>
        </div>
      }
    >
      <form
        id="expense-form"
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault()
          let upload = null
          try {
            upload = file ? await toUpload(file) : null
          } catch (err) {
            return notify(err instanceof Error ? err.message : 'Greška.')
          }
          const ok = await fin.run(
            (token) =>
              saveExpenseFn({
                data: {
                  token,
                  actorId: me?.id ?? null,
                  id: expense?.id ?? null,
                  date: dateV,
                  category,
                  description,
                  supplier,
                  documentNumber: doc,
                  net: parseAmount(net),
                  vat: vatValue,
                  paymentMethod: payment,
                  recurring,
                  file: upload,
                },
              }),
            'Trošak je spremljen.',
          )
          if (ok) onClose()
        }}
      >
        <Field label="Datum">
          <input
            type="date"
            className={inputCls}
            required
            value={dateV}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Kategorija">
          <select
            className={inputCls}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {[...new Set([...EXPENSE_CATEGORIES, category])].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Opis" className="sm:col-span-2">
          <input
            className={inputCls}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="npr. Struja za oktobar"
          />
        </Field>
        <Field label="Dobavljač / izdavalac računa">
          <input
            className={inputCls}
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />
        </Field>
        <Field label="Broj računa">
          <input
            className={inputCls}
            value={doc}
            onChange={(e) => setDoc(e.target.value)}
          />
        </Field>
        <Field label="Iznos bez PDV-a">
          <input
            className={inputCls}
            inputMode="decimal"
            required
            value={net}
            onChange={(e) => setNet(e.target.value)}
            placeholder="0,00"
          />
        </Field>
        <Field
          label="PDV"
          hint={
            <label className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                className="size-3.5 accent-copper-500"
                checked={vatAuto}
                onChange={(e) => setVatAuto(e.target.checked)}
              />{' '}
              izračunaj {Math.round(VAT_RATE * 100)} % (isključite za račune bez
              PDV-a)
            </label>
          }
        >
          <input
            className={inputCls}
            inputMode="decimal"
            disabled={vatAuto}
            value={vatAuto ? String(vatValue) : vat}
            onChange={(e) => setVat(e.target.value)}
          />
        </Field>
        <Field label="Način plaćanja">
          <select
            className={inputCls}
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
          >
            {[
              ...new Set([
                ...PAYMENT_METHODS.filter((m) => m !== 'Rate'),
                payment,
              ]),
            ].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="size-4 accent-copper-500"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
          />
          Fiksni mjesečni trošak (ponavlja se)
        </label>
        <Field
          label="Račun (PDF ili slika, nije obavezno)"
          className="sm:col-span-2"
          hint={
            expense?.file
              ? `Trenutni prilog: ${expense.file.name}`
              : 'Najviše 4 MB.'
          }
        >
          <input
            type="file"
            accept={ACCEPT}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-walnut-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-walnut-800"
          />
        </Field>
        {category === 'Plaće (ručno uneseno)' && (
          <p className="rounded-lg bg-copper-50 px-3 py-2 text-xs text-copper-700 sm:col-span-2">
            Plaće iz kadrovske evidencije već se uračunavaju automatski. Ručno
            unesite plaće samo ako ste to isključili u Postavkama, da se ne bi
            računale dvaput.
          </p>
        )}
      </form>
    </Modal>
  )
}

function ExpensesTab({
  fin,
  data,
  month,
}: {
  fin: Fin
  data: FinanceData
  month: string
}) {
  const { me, notify } = useStore()
  const [edit, setEdit] = useState<Expense | 'new' | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const list = data.expenses.filter((e) => e.date.startsWith(month))
  const totNet = list.reduce((s, e) => s + e.net, 0)
  const totVat = list.reduce((s, e) => s + e.vat, 0)
  const prevMonth = previousMonthKey(month)
  const prevRecurring = data.expenses.filter(
    (e) => e.date.startsWith(prevMonth) && e.recurring,
  ).length
  const byCat = new Map<string, number>()
  for (const e of list)
    byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.net)

  async function download(e: Expense) {
    try {
      openDownload(
        await downloadExpenseFileFn({ data: { token: fin.token!, id: e.id } }),
      )
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Preuzimanje nije uspjelo.')
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <Card
        flush
        title={`Troškovi — ${label(month)}`}
        subtitle={`${list.length} stavki · bez PDV-a ${money2(totNet)} · PDV ${money2(totVat)}`}
        action={
          <div className="flex flex-wrap gap-2">
            {prevRecurring > 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={fin.busy}
                onClick={() =>
                  fin.run(
                    (token) =>
                      copyRecurringFn({
                        data: {
                          token,
                          fromMonth: prevMonth,
                          toMonth: month,
                          actorId: me?.id ?? null,
                        },
                      }),
                    (r) =>
                      r.copied
                        ? `Preneseno ${r.copied} fiksnih troškova iz prošlog mjeseca.`
                        : 'Fiksni troškovi su već preneseni.',
                  )
                }
              >
                <CopyPlus className="size-4" /> Prenesi fiksne iz{' '}
                {monthShort(Number(prevMonth.slice(5)) - 1)}
              </Button>
            )}
            <Button size="sm" onClick={() => setEdit('new')}>
              <Plus className="size-4" /> Novi trošak
            </Button>
          </div>
        }
      >
        {list.length === 0 ? (
          <EmptyState icon={ReceiptIcon} title="Nema troškova za ovaj mjesec">
            Dodajte račune za zakup, režije, gorivo, marketing…{' '}
            {prevRecurring > 0 &&
              'ili prenesite fiksne troškove iz prošlog mjeseca.'}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[860px]">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Trošak</th>
                  <th>Dobavljač</th>
                  <th className="text-right">Bez PDV-a</th>
                  <th className="text-right">PDV</th>
                  <th className="text-right">Ukupno</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap text-xs text-walnut-700">
                      {date(e.date)}
                    </td>
                    <td>
                      <div className="flex items-center gap-2 font-medium">
                        {e.description || e.category}
                        {e.recurring && (
                          <span title="Fiksni mjesečni trošak">
                            <Repeat className="size-3.5 text-copper-500" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-walnut-500">
                        {e.category} · {e.paymentMethod}
                      </div>
                    </td>
                    <td className="text-xs text-walnut-700">
                      {e.supplier || '—'}
                      {e.documentNumber && (
                        <div className="text-walnut-500">
                          br. {e.documentNumber}
                        </div>
                      )}
                      {e.file && (
                        <button
                          onClick={() => download(e)}
                          className="mt-0.5 inline-flex items-center gap-1 font-medium text-copper-700 hover:underline"
                        >
                          <Paperclip className="size-3" />{' '}
                          {fileSize(e.file.size)}
                        </button>
                      )}
                    </td>
                    <td className="text-right font-semibold tabular">
                      {money2(e.net)}
                    </td>
                    <td className="text-right tabular text-walnut-600">
                      {money2(e.vat)}
                    </td>
                    <td className="text-right tabular">
                      {money2(e.net + e.vat)}
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEdit(e)}
                        aria-label="Uredi trošak"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      {confirm === e.id ? (
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={fin.busy}
                          onClick={() =>
                            fin
                              .run(
                                (token) =>
                                  deleteExpenseFn({
                                    data: { token, id: e.id },
                                  }),
                                'Trošak je obrisan.',
                              )
                              .then(() => setConfirm(null))
                          }
                        >
                          Potvrdi
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirm(e.id)}
                          aria-label="Obriši trošak"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="!bg-walnut-50 font-bold">
                  <td colSpan={3}>Ukupno</td>
                  <td className="text-right tabular">{money2(totNet)}</td>
                  <td className="text-right tabular">{money2(totVat)}</td>
                  <td className="text-right tabular">
                    {money2(totNet + totVat)}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Po kategorijama">
        {byCat.size === 0 ? (
          <p className="text-sm text-walnut-500">—</p>
        ) : (
          <ul className="space-y-2.5 text-sm">
            {[...byCat.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([c, v]) => (
                <li key={c}>
                  <div className="mb-1 flex justify-between gap-2">
                    <span className="truncate">{c}</span>
                    <span className="font-semibold tabular">{money(v)}</span>
                  </div>
                  <Progress value={totNet ? v / totNet : 0} color="#F79328" />
                </li>
              ))}
          </ul>
        )}
      </Card>

      {edit && (
        <ExpenseDialog
          fin={fin}
          expense={edit === 'new' ? null : edit}
          month={month}
          onClose={() => setEdit(null)}
        />
      )}
    </div>
  )
}

/* ───────────────────────── postavke ───────────────────────── */

function SettingsTab({
  fin,
  settings,
}: {
  fin: Fin
  settings: FinanceSettings
}) {
  const [includePayroll, setInclude] = useState(settings.includePayroll)
  const [contrib, setContrib] = useState(
    String(Math.round(settings.employerContribPct * 1000) / 10),
  )
  const [tax, setTax] = useState(
    String(Math.round(settings.profitTaxPct * 1000) / 10),
  )
  return (
    <Card title="Postavke obračuna zarade" className="max-w-2xl">
      <div className="space-y-5">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-copper-500"
            checked={includePayroll}
            onChange={(e) => setInclude(e.target.checked)}
          />
          <span>
            <span className="block font-semibold">
              Uključi plaće iz kadrovske evidencije
            </span>
            <span className="block text-walnut-600">
              Bruto plaće, topli obrok i prijevoz važeći u mjesecu te odobreni
              bonusi. Isključite ako plaće unosite ručno kao trošak.
            </span>
          </span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Doprinosi na teret poslodavca (% bruto plaće)"
            hint="Ako se plaćaju povrh bruto plaće. Provjerite s knjigovođom."
          >
            <input
              className={inputCls}
              inputMode="decimal"
              value={contrib}
              onChange={(e) => setContrib(e.target.value)}
            />
          </Field>
          <Field
            label="Porez na dobit za procjenu (%)"
            hint="Samo procjena u mjesečnom obračunu."
          >
            <input
              className={inputCls}
              inputMode="decimal"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
            />
          </Field>
        </div>
        <Button
          disabled={fin.busy}
          onClick={() =>
            fin.run(
              (token) =>
                saveFinanceSettingsFn({
                  data: {
                    token,
                    settings: {
                      includePayroll,
                      employerContribPct: parseAmount(contrib) / 100,
                      profitTaxPct: parseAmount(tax) / 100,
                    },
                  },
                }),
              'Postavke su spremljene.',
            )
          }
        >
          <Percent className="size-4" /> Spremi postavke
        </Button>
        <p className="flex items-start gap-2 rounded-lg bg-walnut-50 p-3 text-xs text-walnut-600">
          <Landmark className="mt-0.5 size-4 shrink-0" />
          Obračun je upravljački alat za praćenje zarade iz mjeseca u mjesec.
          Zvanični finansijski izvještaji, PDV prijava i porez na dobit rade se
          kod knjigovođe.
        </p>
      </div>
    </Card>
  )
}
