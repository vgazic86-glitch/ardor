import { createFileRoute } from '@tanstack/react-router'
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  LogOut,
  Paperclip,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  Wallet,
} from 'lucide-react'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { AdminGate } from '../components/AdminGate'
import { Modal } from '../components/Modal'
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  PageHeader,
  Segmented,
  Select,
  Stat,
  inputCls,
} from '../components/ui'
import { isAuthError, useAdmin } from '../lib/admin'
import { DEFAULT_POLICY, proposeBonus, type BonusPolicy } from '../lib/bonus'
import { ACCEPT, fileSize, openDownload, toUpload } from '../lib/files'
import {
  count,
  date,
  money,
  money2,
  monthLong,
  parseAmount,
  pct,
} from '../lib/format'
import { contractState, monthEnd, salaryOn } from '../lib/hr'
import { lastMonths, previousMonthKey } from '../lib/stats'
import { useStore } from '../lib/store'
import {
  EMPLOYEE_FILE_CATEGORIES,
  type Bonus,
  type BonusStatus,
  type Employee,
  type EmployeeFile,
  type Salary,
} from '../lib/types'
import {
  addEmployeeFileFn,
  deleteEmployeeFileFn,
  deleteSalaryFn,
  downloadEmployeeFileFn,
  getHrFn,
  saveBonusesFn,
  savePolicyFn,
  saveSalaryFn,
} from '../server/api'
import type { HrData } from '../server/hr'

export const Route = createFileRoute('/kadrovska')({ component: HrPage })

type Tab = 'dokumenti' | 'place' | 'bonusi' | 'postavke'

/** Učitava kadrovske podatke i nudi pozive koji automatski osvježe podatke. */
function useHr() {
  const { token, expire } = useAdmin()
  const { notify } = useStore()
  const [data, setData] = useState<HrData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    try {
      setData(await getHrFn({ data: { token } }))
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
    async (fn: (token: string) => Promise<unknown>, ok?: string) => {
      if (!token) return false
      setBusy(true)
      try {
        await fn(token)
        await load()
        if (ok) notify(ok)
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

function HrPage() {
  return (
    <div className="rise">
      <PageHeader
        eyebrow="Ljudi i dokumenti"
        title="Kadrovska evidencija"
        description="Ugovori o radu i ostali dokumenti zaposlenika, plaće i mjesečni prijedlog bonusa (fiksni + varijabilni dio). Povjerljivo — dostupno samo uz upravljačku lozinku."
      />
      <AdminGate title="Kadrovska evidencija">
        <HrContent />
      </AdminGate>
    </div>
  )
}

function HrContent() {
  const hr = useHr()
  const { employees, today } = useStore()
  const { logout } = useAdmin()
  const [tab, setTab] = useState<Tab>('dokumenti')

  if (!hr.data) {
    return hr.error ? (
      <Card>
        <p className="text-sm text-rose-700">{hr.error}</p>
      </Card>
    ) : (
      <div className="h-64 animate-pulse rounded-2xl bg-walnut-100/70" />
    )
  }
  const d = hr.data
  const states = employees.map((e) => contractState(d.files, e.id, today))
  const fund = employees.reduce(
    (s, e) => s + (salaryOn(d.salaries, e.id, today)?.gross ?? 0),
    0,
  )
  const warn = states.filter(
    (s) => s.tone === 'warn' || s.tone === 'bad',
  ).length

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          tone="accent"
          icon={Users}
          label="Zaposlenih"
          value={count(employees.length)}
          hint={`${d.files.length} dok. u evidenciji`}
        />
        <Stat
          icon={Wallet}
          label="Bruto fond plaća"
          value={money(fund)}
          hint="mjesečno, trenutne plaće"
        />
        <Stat
          tone={warn ? 'warn' : 'good'}
          icon={AlertTriangle}
          label="Ugovori za provjeru"
          value={count(warn)}
          hint="istekli, ističu ili nedostaju"
        />
        <Stat
          icon={BadgeCheck}
          label="Bonusi prošli mjesec"
          value={money(
            d.bonuses
              .filter(
                (b) =>
                  b.month === previousMonthKey(today.slice(0, 7)) &&
                  b.status === 'odobreno',
              )
              .reduce((s, b) => s + (b.approved ?? 0), 0),
          )}
          hint="odobreni varijabilni dio"
        />
      </div>

      <div className="my-6 flex flex-wrap items-center gap-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'dokumenti', label: 'Dokumenti zaposlenika' },
            { value: 'place', label: 'Plaće' },
            { value: 'bonusi', label: 'Bonusi' },
            { value: 'postavke', label: 'Pravila i lozinka' },
          ]}
        />
        <Button variant="ghost" size="sm" className="ml-auto" onClick={logout}>
          <LogOut className="size-3.5" /> Zaključaj
        </Button>
      </div>

      {tab === 'dokumenti' && <FilesTab hr={hr} data={d} />}
      {tab === 'place' && <SalariesTab hr={hr} data={d} />}
      {tab === 'bonusi' && <BonusTab hr={hr} data={d} />}
      {tab === 'postavke' && <SettingsTab hr={hr} data={d} />}
    </>
  )
}

type Hr = ReturnType<typeof useHr>

/* ───────────────────────── dokumenti zaposlenika ───────────────────────── */

function FilesTab({ hr, data }: { hr: Hr; data: HrData }) {
  const { employees, today, me, notify } = useStore()
  const [sel, setSel] = useState(employees[0]?.id ?? '')
  const [category, setCategory] = useState<string>(EMPLOYEE_FILE_CATEGORIES[0])
  const [title, setTitle] = useState('')
  const [from, setFrom] = useState('')
  const [until, setUntil] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [inputKey, setInputKey] = useState(0)
  const [confirm, setConfirm] = useState<string | null>(null)
  const emp = employees.find((e) => e.id === sel)
  const mine = data.files.filter((f) => f.employeeId === sel)

  async function upload(e: React.FormEvent) {
    e.preventDefault()
    let payload: Awaited<ReturnType<typeof toUpload>> | null = null
    try {
      payload = file ? await toUpload(file) : null
    } catch (err) {
      return notify(err instanceof Error ? err.message : 'Greška.')
    }
    const ok = await hr.run(
      (token) =>
        addEmployeeFileFn({
          data: {
            token,
            actorId: me?.id ?? null,
            employeeId: sel,
            category,
            title,
            validFrom: from || null,
            validUntil: until || null,
            note,
            file: payload,
          },
        }),
      'Dokument je spremljen.',
    )
    if (ok) {
      setTitle('')
      setFrom('')
      setUntil('')
      setNote('')
      setFile(null)
      setInputKey((k) => k + 1)
    }
  }

  async function download(f: EmployeeFile) {
    try {
      openDownload(
        await downloadEmployeeFileFn({ data: { token: hr.token!, id: f.id } }),
      )
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Preuzimanje nije uspjelo.')
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <Card title="Zaposlenici" flush>
        <ul className="pb-2">
          {employees.map((e) => {
            const st = contractState(data.files, e.id, today)
            const n = data.files.filter((f) => f.employeeId === e.id).length
            return (
              <li key={e.id}>
                <button
                  onClick={() => setSel(e.id)}
                  className={`flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors ${sel === e.id ? 'bg-copper-50' : 'hover:bg-walnut-50'}`}
                >
                  <Avatar employee={e} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {e.name}
                    </span>
                    <span className="block text-[11px] text-walnut-500">
                      {e.role} · {n} dok.
                    </span>
                  </span>
                  <Badge tone={st.tone} className="!px-2 !text-[10px]">
                    {st.label}
                  </Badge>
                </button>
              </li>
            )
          })}
        </ul>
      </Card>

      {emp && (
        <div className="space-y-6">
          <Card title={`Dokumenti — ${emp.name}`} subtitle={emp.role} flush>
            {mine.length === 0 ? (
              <EmptyState icon={FileText} title="Još nema dokumenata">
                Učitajte ugovor o radu i ostale dokumente ispod.
              </EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table min-w-[680px]">
                  <thead>
                    <tr>
                      <th>Dokument</th>
                      <th>Vrijedi</th>
                      <th>Datoteka</th>
                      <th className="text-right" />
                    </tr>
                  </thead>
                  <tbody>
                    {mine.map((f) => (
                      <tr key={f.id}>
                        <td>
                          <div className="font-semibold">{f.title}</div>
                          <div className="text-xs text-walnut-500">
                            {f.category}
                            {f.note && ` · ${f.note}`}
                          </div>
                        </td>
                        <td className="text-xs text-walnut-700">
                          {f.validFrom ? date(f.validFrom) : '—'} –{' '}
                          {f.validUntil
                            ? date(f.validUntil)
                            : f.category.startsWith('Ugovor') ||
                                f.category.startsWith('Aneks')
                              ? 'neodređeno'
                              : '—'}
                        </td>
                        <td>
                          {f.file ? (
                            <button
                              onClick={() => download(f)}
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-copper-700 hover:underline"
                            >
                              <Paperclip className="size-3.5" /> {f.file.name}{' '}
                              <span className="text-xs text-walnut-500">
                                {fileSize(f.file.size)}
                              </span>
                            </button>
                          ) : (
                            <span className="text-xs text-walnut-400">
                              bez datoteke
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap text-right">
                          {confirm === f.id ? (
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={hr.busy}
                              onClick={() =>
                                hr
                                  .run(
                                    (token) =>
                                      deleteEmployeeFileFn({
                                        data: { token, id: f.id },
                                      }),
                                    'Dokument je obrisan.',
                                  )
                                  .then(() => setConfirm(null))
                              }
                            >
                              Potvrdi brisanje
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirm(f.id)}
                              aria-label={`Obriši ${f.title}`}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card
            title="Učitaj dokument"
            subtitle="PDF, Word, Excel ili slika do 4 MB. Datoteka se čuva u bazi i vidljiva je samo uz lozinku."
          >
            <form onSubmit={upload} className="grid gap-4 sm:grid-cols-2">
              <Field label="Vrsta dokumenta">
                <select
                  className={inputCls}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {EMPLOYEE_FILE_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Naziv">
                <input
                  className={inputCls}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`npr. ${category} ${today.slice(0, 4)}.`}
                />
              </Field>
              <Field label="Vrijedi od">
                <input
                  type="date"
                  className={inputCls}
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </Field>
              <Field
                label="Vrijedi do"
                hint="Prazno = neodređeno. Aplikacija upozorava 30 dana prije isteka."
              >
                <input
                  type="date"
                  className={inputCls}
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                />
              </Field>
              <Field label="Napomena" className="sm:col-span-2">
                <input
                  className={inputCls}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="npr. probni rad 3 mjeseca"
                />
              </Field>
              <Field label="Datoteka" className="sm:col-span-2">
                <input
                  key={inputKey}
                  type="file"
                  accept={ACCEPT}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-walnut-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-walnut-800"
                />
              </Field>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={hr.busy}>
                  <Upload className="size-4" />{' '}
                  {hr.busy ? 'Spremam…' : 'Spremi dokument'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── plaće ───────────────────────── */

function SalaryDialog({
  employee,
  current,
  hr,
  onClose,
}: {
  employee: Employee
  current: Salary | null
  hr: Hr
  onClose: () => void
}) {
  const { today } = useStore()
  const [validFrom, setValidFrom] = useState(today.slice(0, 8) + '01')
  const [gross, setGross] = useState(current ? String(current.gross) : '')
  const [net, setNet] = useState(current ? String(current.net) : '')
  const [meal, setMeal] = useState(current ? String(current.meal) : '0')
  const [transport, setTransport] = useState(
    current ? String(current.transport) : '0',
  )
  const [note, setNote] = useState('')
  const change =
    current && parseAmount(gross)
      ? parseAmount(gross) / current.gross - 1
      : null

  return (
    <Modal
      title={`Plaća — ${employee.name}`}
      subtitle="Nova stavka se dodaje u historiju; prethodne plaće ostaju zapisane."
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Odustani
          </Button>
          <Button type="submit" form="salary-form" disabled={hr.busy}>
            Spremi plaću
          </Button>
        </div>
      }
    >
      <form
        id="salary-form"
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault()
          const ok = await hr.run(
            (token) =>
              saveSalaryFn({
                data: {
                  token,
                  employeeId: employee.id,
                  validFrom,
                  gross: parseAmount(gross),
                  net: parseAmount(net),
                  meal: parseAmount(meal),
                  transport: parseAmount(transport),
                  note,
                },
              }),
            'Plaća je spremljena.',
          )
          if (ok) onClose()
        }}
      >
        <Field label="Vrijedi od">
          <input
            type="date"
            className={inputCls}
            required
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
          />
        </Field>
        <div />
        <Field
          label="Bruto plaća (fiksni dio)"
          hint={
            change !== null && Math.abs(change) > 0.001
              ? `${change > 0 ? '+' : ''}${(change * 100).toFixed(1)} % u odnosu na trenutnu`
              : undefined
          }
        >
          <input
            className={inputCls}
            inputMode="decimal"
            required
            value={gross}
            onChange={(e) => setGross(e.target.value)}
          />
        </Field>
        <Field label="Neto plaća">
          <input
            className={inputCls}
            inputMode="decimal"
            required
            value={net}
            onChange={(e) => setNet(e.target.value)}
          />
        </Field>
        <Field label="Topli obrok (mjesečno)">
          <input
            className={inputCls}
            inputMode="decimal"
            value={meal}
            onChange={(e) => setMeal(e.target.value)}
          />
        </Field>
        <Field label="Prijevoz (mjesečno)">
          <input
            className={inputCls}
            inputMode="decimal"
            value={transport}
            onChange={(e) => setTransport(e.target.value)}
          />
        </Field>
        <Field label="Napomena" className="sm:col-span-2">
          <input
            className={inputCls}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="npr. povišica nakon probnog rada"
          />
        </Field>
      </form>
    </Modal>
  )
}

function SalariesTab({ hr, data }: { hr: Hr; data: HrData }) {
  const { employees, today } = useStore()
  const [edit, setEdit] = useState<Employee | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const rows = employees.map((e) => ({
    e,
    s: salaryOn(data.salaries, e.id, today),
  }))
  const tot = (k: 'gross' | 'net' | 'meal' | 'transport') =>
    rows.reduce((a, r) => a + (r.s?.[k] ?? 0), 0)

  return (
    <Card
      flush
      title="Plaće zaposlenika"
      subtitle="Trenutno važeće plaće; klik na red prikazuje historiju"
      action={<Badge tone="copper">povjerljivo</Badge>}
    >
      <div className="overflow-x-auto">
        <table className="data-table min-w-[860px]">
          <thead>
            <tr>
              <th>Zaposlenik</th>
              <th>Vrijedi od</th>
              <th className="text-right">Bruto</th>
              <th className="text-right">Neto</th>
              <th className="text-right">Topli obrok</th>
              <th className="text-right">Prijevoz</th>
              <th className="text-right">Isplata ukupno</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ e, s }) => {
              const history = data.salaries.filter((x) => x.employeeId === e.id)
              const ex = open === e.id
              return (
                <Fragment key={e.id}>
                  <tr
                    className="cursor-pointer"
                    onClick={() => setOpen(ex ? null : e.id)}
                  >
                    <td>
                      <span className="flex items-center gap-2.5">
                        <ChevronDown
                          className={`size-4 text-walnut-400 transition-transform ${ex ? 'rotate-180' : ''}`}
                        />
                        <Avatar employee={e} size="sm" />
                        <span>
                          <span className="block font-semibold">{e.name}</span>
                          <span className="block text-[11px] text-walnut-500">
                            {e.role}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="text-xs text-walnut-700">
                      {s ? (
                        date(s.validFrom)
                      ) : (
                        <Badge tone="warn">nije unesena</Badge>
                      )}
                    </td>
                    <td className="text-right font-semibold tabular">
                      {s ? money2(s.gross) : '—'}
                    </td>
                    <td className="text-right tabular">
                      {s ? money2(s.net) : '—'}
                    </td>
                    <td className="text-right tabular text-walnut-700">
                      {s ? money2(s.meal) : '—'}
                    </td>
                    <td className="text-right tabular text-walnut-700">
                      {s ? money2(s.transport) : '—'}
                    </td>
                    <td className="text-right font-semibold tabular">
                      {s ? money2(s.net + s.meal + s.transport) : '—'}
                    </td>
                    <td
                      className="text-right"
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEdit(e)}
                      >
                        <Plus className="size-3.5" /> {s ? 'Promjena' : 'Unesi'}
                      </Button>
                    </td>
                  </tr>
                  {ex && (
                    <tr className="!bg-walnut-50 hover:!bg-walnut-50">
                      <td colSpan={8} className="!py-3">
                        {history.length === 0 ? (
                          <span className="text-sm text-walnut-500">
                            Nema zapisa.
                          </span>
                        ) : (
                          <ul className="divide-y divide-walnut-100 rounded-xl border border-walnut-200 bg-white text-sm">
                            {history.map((h) => (
                              <li
                                key={h.id}
                                className="flex items-center gap-4 px-4 py-2"
                              >
                                <span className="w-28 text-xs text-walnut-500">
                                  od {date(h.validFrom)}
                                </span>
                                <span className="tabular">
                                  bruto {money2(h.gross)}
                                </span>
                                <span className="tabular text-walnut-600">
                                  neto {money2(h.net)}
                                </span>
                                <span className="flex-1 truncate text-xs text-walnut-500">
                                  {h.note}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={hr.busy}
                                  onClick={() =>
                                    hr.run(
                                      (token) =>
                                        deleteSalaryFn({
                                          data: { token, id: h.id },
                                        }),
                                      'Zapis je obrisan.',
                                    )
                                  }
                                  aria-label="Obriši zapis"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            <tr className="!bg-walnut-50 font-bold">
              <td>Ukupno</td>
              <td />
              <td className="text-right tabular">{money2(tot('gross'))}</td>
              <td className="text-right tabular">{money2(tot('net'))}</td>
              <td className="text-right tabular">{money2(tot('meal'))}</td>
              <td className="text-right tabular">{money2(tot('transport'))}</td>
              <td className="text-right tabular">
                {money2(tot('net') + tot('meal') + tot('transport'))}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="border-t border-walnut-200/70 px-5 py-3 text-xs text-walnut-500">
        Iznose unosi računovodstvo prema obračunu. Aplikacija ne računa poreze i
        doprinose — bruto i neto se upisuju iz obračuna plaće.
      </p>
      {edit && (
        <SalaryDialog
          employee={edit}
          current={salaryOn(data.salaries, edit.id, today)}
          hr={hr}
          onClose={() => setEdit(null)}
        />
      )}
    </Card>
  )
}

/* ───────────────────────── bonusi ───────────────────────── */

function BonusTab({ hr, data }: { hr: Hr; data: HrData }) {
  const { employees, salesPeople, orders, currentMonth, me, notify } =
    useStore()
  const months = lastMonths(currentMonth, 12).reverse()
  const [month, setMonth] = useState(previousMonthKey(currentMonth))
  const policy = data.policy
  const saved = useMemo(
    () =>
      new Map(
        data.bonuses
          .filter((b) => b.month === month)
          .map((b) => [b.employeeId, b]),
      ),
    [data.bonuses, month],
  )

  const proposals = useMemo(
    () =>
      employees.map((e) => {
        const s = salaryOn(data.salaries, e.id, monthEnd(month))
        return proposeBonus(
          e,
          month,
          orders,
          salesPeople,
          s?.gross ?? 0,
          policy,
        )
      }),
    [employees, data.salaries, month, orders, salesPeople, policy],
  )

  const [approved, setApproved] = useState<Record<string, string>>({})
  useEffect(() => {
    setApproved(
      Object.fromEntries(
        proposals.map((p) => [
          p.employee.id,
          String(saved.get(p.employee.id)?.approved ?? p.variable),
        ]),
      ),
    )
  }, [proposals, saved])

  const label = (k: string) =>
    `${monthLong(Number(k.slice(5)) - 1)} ${k.slice(0, 4)}.`
  const value = (id: string) => parseAmount(approved[id] ?? '0')
  const totalFixed = proposals.reduce((s, p) => s + p.fixedGross, 0)
  const totalVar = proposals.reduce((s, p) => s + value(p.employee.id), 0)
  const allApproved =
    proposals.length > 0 &&
    proposals.every((p) => saved.get(p.employee.id)?.status === 'odobreno')

  function rows(status: BonusStatus) {
    return proposals.map((p) => ({
      employeeId: p.employee.id,
      fixedGross: p.fixedGross,
      proposed: p.variable,
      approved: value(p.employee.id),
      status,
      basis: p.basis,
      note: '',
    }))
  }

  async function exportXlsx() {
    const { default: writeXlsxFile } = await import('write-excel-file/browser')
    const head = [
      'Zaposlenik',
      'Uloga',
      'Fiksni dio (bruto)',
      'Osnova',
      'Prijedlog varijabilnog',
      'Odobreno',
      'Ukupno bruto',
      'Status',
    ].map((v) => ({
      value: v,
      fontWeight: 'bold' as const,
      backgroundColor: '#EFE7DD',
    }))
    const num = (v: number) => ({
      value: Math.round(v * 100) / 100,
      type: Number,
      format: '#,##0.00',
    })
    const data = [
      [
        {
          value: `Ardor — bonusi za ${label(month)}`,
          fontWeight: 'bold' as const,
        },
      ],
      [],
      head,
      ...proposals.map((p) => [
        p.employee.name,
        p.employee.role,
        num(p.fixedGross),
        p.basis,
        num(p.variable),
        num(value(p.employee.id)),
        num(p.fixedGross + value(p.employee.id)),
        saved.get(p.employee.id)?.status ?? 'nije spremljeno',
      ]),
      [
        { value: 'Ukupno', fontWeight: 'bold' as const },
        null,
        num(totalFixed),
        null,
        num(proposals.reduce((s, p) => s + p.variable, 0)),
        num(totalVar),
        num(totalFixed + totalVar),
        null,
      ],
    ]
    await writeXlsxFile(data as never, {
      columns: [24, 18, 16, 60, 18, 14, 16, 14].map((width) => ({ width })),
    }).toFile(`ardor-bonusi-${month}.xlsx`)
    notify('Excel s bonusima je preuzet.')
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="Mjesec obračuna"
            value={month}
            onChange={setMonth}
            options={months.map((k) => ({ value: k, label: label(k) }))}
          />
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge tone="neutral">
              prag {pct(policy.salesThreshold)} cilja
            </Badge>
            <Badge tone="neutral">
              na 100 % cilja: {pct(policy.salesMaxPct)} plaće
            </Badge>
            <Badge tone="neutral">
              iznad cilja: {pct(policy.overTargetRate)} prometa
            </Badge>
            <Badge tone="neutral">
              popust &gt; {pct(policy.discountLimit)} → −
              {pct(policy.discountPenalty)}
            </Badge>
            <Badge tone="neutral">voditelj: {pct(policy.managerMaxPct)}</Badge>
            <Badge tone="neutral">
              dostava {policy.deliveryPerJob} KM + montaža{' '}
              {policy.assemblyPerJob} KM
            </Badge>
            <Badge tone="neutral">najviše {pct(policy.capPct)} plaće</Badge>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={exportXlsx}>
              <FileSpreadsheet className="size-4" /> Excel
            </Button>
            <Button
              variant="outline"
              disabled={hr.busy}
              onClick={() =>
                hr.run(
                  (token) =>
                    saveBonusesFn({
                      data: {
                        token,
                        month,
                        rows: rows('prijedlog'),
                        actorId: me?.id ?? null,
                      },
                    }),
                  'Prijedlog bonusa je spremljen.',
                )
              }
            >
              <Save className="size-4" /> Spremi prijedlog
            </Button>
            <Button
              variant="copper"
              disabled={hr.busy}
              onClick={() =>
                hr.run(
                  (token) =>
                    saveBonusesFn({
                      data: {
                        token,
                        month,
                        rows: rows('odobreno'),
                        actorId: me?.id ?? null,
                      },
                    }),
                  'Bonusi su odobreni.',
                )
              }
            >
              <BadgeCheck className="size-4" />{' '}
              {allApproved ? 'Ponovo odobri' : 'Odobri sve'}
            </Button>
          </div>
        </div>
      </Card>

      <Card
        flush
        title={`Prijedlog bonusa — ${label(month)}`}
        subtitle="Fiksni dio je bruto plaća važeća na kraju mjeseca. Varijabilni prijedlog računa aplikacija; iznos u koloni „Odobreno” možete promijeniti."
      >
        <div className="overflow-x-auto">
          <table className="data-table min-w-[980px]">
            <thead>
              <tr>
                <th>Zaposlenik</th>
                <th className="text-right">Fiksni (bruto)</th>
                <th>Osnova za varijabilni dio</th>
                <th className="text-right">Prijedlog</th>
                <th className="w-36 text-right">Odobreno</th>
                <th className="text-right">Ukupno bruto</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => {
                const s: Bonus | undefined = saved.get(p.employee.id)
                const v = value(p.employee.id)
                return (
                  <tr key={p.employee.id}>
                    <td>
                      <span className="flex items-center gap-2.5">
                        <Avatar employee={p.employee} size="sm" />
                        <span>
                          <span className="block font-semibold">
                            {p.employee.name}
                          </span>
                          <span className="block text-[11px] text-walnut-500">
                            {p.employee.role}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="text-right tabular">
                      {p.fixedGross ? (
                        money2(p.fixedGross)
                      ) : (
                        <Badge tone="warn">nema plaće</Badge>
                      )}
                    </td>
                    <td className="max-w-[300px] text-xs text-walnut-700">
                      {p.achievement !== null && (
                        <div className="mb-1 h-1.5 w-40 overflow-hidden rounded-full bg-walnut-100">
                          <div
                            className={`h-full rounded-full ${p.achievement >= 1 ? 'bg-moss-600' : p.achievement >= policy.salesThreshold ? 'bg-copper-500' : 'bg-walnut-300'}`}
                            style={{
                              width: `${Math.min(100, p.achievement * 100)}%`,
                            }}
                          />
                        </div>
                      )}
                      {p.basis}
                    </td>
                    <td className="text-right font-semibold tabular">
                      {money2(p.variable)}
                    </td>
                    <td className="text-right">
                      <input
                        aria-label={`Odobreno: ${p.employee.name}`}
                        inputMode="decimal"
                        className={`${inputCls} ml-auto w-28 text-right tabular`}
                        value={approved[p.employee.id] ?? ''}
                        onChange={(e) =>
                          setApproved((a) => ({
                            ...a,
                            [p.employee.id]: e.target.value,
                          }))
                        }
                      />
                    </td>
                    <td className="text-right font-semibold tabular">
                      {money2(p.fixedGross + v)}
                    </td>
                    <td>
                      {s ? (
                        <Badge tone={s.status === 'odobreno' ? 'good' : 'info'}>
                          {s.status === 'odobreno' ? 'Odobreno' : 'Prijedlog'}
                        </Badge>
                      ) : (
                        <Badge>Nije spremljeno</Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
              <tr className="!bg-walnut-50 font-bold">
                <td>Ukupno</td>
                <td className="text-right tabular">{money2(totalFixed)}</td>
                <td />
                <td className="text-right tabular">
                  {money2(proposals.reduce((s, p) => s + p.variable, 0))}
                </td>
                <td className="text-right tabular">{money2(totalVar)}</td>
                <td className="text-right tabular">
                  {money2(totalFixed + totalVar)}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        <p className="border-t border-walnut-200/70 px-5 py-3 text-xs text-walnut-500">
          Svi iznosi su bruto. Varijabilni dio za {label(month)} iznosi{' '}
          {totalFixed ? pct(totalVar / totalFixed) : '—'} ukupnog fiksnog
          dijela. Neto isplatu obračunava računovodstvo.
        </p>
      </Card>

      <Card title="Kako se računa prijedlog">
        <div className="grid gap-5 text-sm text-walnut-700 md:grid-cols-3">
          <div>
            <div className="mb-1 flex items-center gap-2 font-semibold text-walnut-900">
              <Banknote className="size-4 text-copper-600" /> Prodavači
            </div>
            Ispod {pct(policy.salesThreshold)} mjesečnog cilja nema varijabilnog
            dijela. Od praga do 100 % cilja raste linearno do{' '}
            {pct(policy.salesMaxPct)} fiksne plaće. Iznad cilja dodaje se{' '}
            {pct(policy.overTargetRate)} od prometa preko cilja. Ako su popusti
            veći od {pct(policy.discountLimit)} prometa, iznos se umanjuje za{' '}
            {pct(policy.discountPenalty)}.
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2 font-semibold text-walnut-900">
              <ShieldCheck className="size-4 text-copper-600" /> Voditelj salona
            </div>
            Isto pravilo, ali prema ukupnom prometu salona i zbiru ciljeva svih
            prodavača. Na 100 % cilja salona: {pct(policy.managerMaxPct)} fiksne
            plaće.
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2 font-semibold text-walnut-900">
              <Download className="size-4 text-copper-600" /> Dostava i montaža
            </div>
            {policy.deliveryPerJob} KM po završenoj dostavi i dodatnih{' '}
            {policy.assemblyPerJob} KM po montaži u mjesecu (status
            „Dostavljeno”). Za sve uloge gornja granica je {pct(policy.capPct)}{' '}
            fiksne plaće.
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ───────────────────────── pravila i lozinka ───────────────────────── */

const POLICY_FIELDS: { key: keyof BonusPolicy; label: string; pct: boolean }[] =
  [
    { key: 'salesThreshold', label: 'Prag ostvarenja cilja (%)', pct: true },
    {
      key: 'salesMaxPct',
      label: 'Prodavač: varijabilni dio na 100 % cilja (% plaće)',
      pct: true,
    },
    {
      key: 'overTargetRate',
      label: 'Iznad cilja (% od prometa preko cilja)',
      pct: true,
    },
    {
      key: 'discountLimit',
      label: 'Dozvoljeni prosječni popust (%)',
      pct: true,
    },
    {
      key: 'discountPenalty',
      label: 'Umanjenje kod većih popusta (%)',
      pct: true,
    },
    {
      key: 'managerMaxPct',
      label: 'Voditelj: na 100 % cilja salona (% plaće)',
      pct: true,
    },
    { key: 'deliveryPerJob', label: 'Dostava: KM po dostavi', pct: false },
    { key: 'assemblyPerJob', label: 'Montaža: KM po montaži', pct: false },
    {
      key: 'capPct',
      label: 'Gornja granica varijabilnog dijela (% plaće)',
      pct: true,
    },
  ]

function SettingsTab({ hr, data }: { hr: Hr; data: HrData }) {
  const { change, status } = useAdmin()
  const { notify } = useStore()
  const [form, setForm] = useState(() =>
    Object.fromEntries(
      POLICY_FIELDS.map((f) => [
        f.key,
        String(
          f.pct
            ? Math.round(data.policy[f.key] * 1000) / 10
            : data.policy[f.key],
        ),
      ]),
    ),
  )
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')

  const policy = Object.fromEntries(
    POLICY_FIELDS.map((f) => [
      f.key,
      f.pct ? parseAmount(form[f.key]) / 100 : parseAmount(form[f.key]),
    ]),
  ) as unknown as BonusPolicy

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <Card
        title="Pravila za varijabilni dio plaće"
        subtitle="Primjenjuju se na sve prijedloge bonusa"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {POLICY_FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <input
                className={inputCls}
                inputMode="decimal"
                value={form[f.key]}
                onChange={(e) =>
                  setForm((x) => ({ ...x, [f.key]: e.target.value }))
                }
              />
            </Field>
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <Button
            disabled={hr.busy}
            onClick={() =>
              hr.run(
                (token) => savePolicyFn({ data: { token, policy } }),
                'Pravila su spremljena.',
              )
            }
          >
            <Settings2 className="size-4" /> Spremi pravila
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              setForm(
                Object.fromEntries(
                  POLICY_FIELDS.map((f) => [
                    f.key,
                    String(
                      f.pct
                        ? Math.round(DEFAULT_POLICY[f.key] * 1000) / 10
                        : DEFAULT_POLICY[f.key],
                    ),
                  ]),
                ),
              )
            }
          >
            Vrati preporučene vrijednosti
          </Button>
        </div>
      </Card>

      <Card
        title="Upravljačka lozinka"
        subtitle="Štiti kadrovski dio i uređivanje dokumenata"
      >
        {status?.fromEnv ? (
          <p className="text-sm text-walnut-600">
            Lozinka je postavljena na poslužitelju (varijabla ADMIN_LOZINKA) i
            mijenja se tamo.
          </p>
        ) : (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                await change(oldPw, newPw)
                notify('Lozinka je promijenjena.')
                setOldPw('')
                setNewPw('')
              } catch (err) {
                notify(err instanceof Error ? err.message : 'Greška.')
              }
            }}
          >
            <Field label="Trenutna lozinka">
              <input
                type="password"
                autoComplete="current-password"
                className={inputCls}
                value={oldPw}
                onChange={(e) => setOldPw(e.target.value)}
                required
              />
            </Field>
            <Field label="Nova lozinka (najmanje 8 znakova)">
              <input
                type="password"
                autoComplete="new-password"
                className={inputCls}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" variant="outline">
              Promijeni lozinku
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
