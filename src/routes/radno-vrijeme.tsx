import { createFileRoute } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Clock, FileSpreadsheet, LogIn, LogOut, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../components/Modal'
import { Avatar, Badge, Button, Card, Field, inputCls, PageHeader, Stat } from '../components/ui'
import { monthLong, weekday } from '../lib/format'
import { useRemote } from '../lib/remote'
import { useStore } from '../lib/store'
import { WORK_KIND_LABEL, type Employee, type WorkDay, type WorkKind } from '../lib/types'
import { hours, monthDates, STANDARD_DAY_MIN, summarize, workedMin, workingDaysInMonth } from '../lib/worktime'
import { clockFn, listWorkTimeFn, saveWorkDayFn } from '../server/api'

export const Route = createFileRoute('/radno-vrijeme')({ component: WorkTimePage })

const KIND_TONE: Record<WorkKind, string> = {
  rad: 'neutral',
  godisnji: 'info',
  bolovanje: 'bad',
  slobodan: 'violet',
  praznik: 'copper',
}

const shiftMonth = (m: string, d: number) => {
  const [y, mm] = m.split('-').map(Number)
  const x = new Date(Date.UTC(y, mm - 1 + d, 1))
  return x.toISOString().slice(0, 7)
}
const monthTitle = (m: string) => `${monthLong(Number(m.slice(5, 7)) - 1)} ${m.slice(0, 4)}.`

function yesterdayOf(today: string) {
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function WorkTimePage() {
  const { employees, today, user, restricted } = useStore()
  const [month, setMonth] = useState(today.slice(0, 7))
  const remote = useRemote(() => listWorkTimeFn({ data: { month } }), [month])
  const staff = useMemo(() => employees.filter((e) => e.id !== '0'), [employees])
  const [empId, setEmpId] = useState<string>(restricted ? (user.employeeId ?? '') : (user.employeeId ?? staff[0]?.id ?? ''))
  const [edit, setEdit] = useState<{ date: string; day: WorkDay | null } | null>(null)
  const days = remote.data?.days ?? []
  const emp = staff.find((e) => e.id === empId) ?? null
  const mine = days.filter((d) => d.employeeId === empId)
  const byDate = new Map(mine.map((d) => [d.date, d]))
  const sum = summarize(mine)
  const fundDays = workingDaysInMonth(month)
  const myToday = user.employeeId ? days.find((d) => d.employeeId === user.employeeId && d.date === today) : undefined

  const canEdit = (date: string) => !restricted || date === today || date === yesterdayOf(today)

  async function exportXlsx() {
    const { exportTables } = await import('../lib/excel')
    const people = restricted ? staff.filter((e) => e.id === user.employeeId) : staff
    const tables = people.map((e) => {
      const list = days.filter((d) => d.employeeId === e.id)
      const map = new Map(list.map((d) => [d.date, d]))
      const s = summarize(list)
      return {
        sheet: e.name,
        title: `Evidencija radnog vremena — ${e.name}, ${monthTitle(month)}`,
        header: ['Datum', 'Dan', 'Vrsta', 'Dolazak', 'Odlazak', 'Pauza (min)', 'Sati', 'Prekovremeno', 'Napomena'],
        widths: [12, 8, 16, 10, 10, 12, 10, 14, 36],
        rows: [
          ...monthDates(month).map((dt) => {
            const d = map.get(dt)
            const w = d ? workedMin(d) : 0
            return [
              { date: dt },
              weekday(dt),
              d ? WORK_KIND_LABEL[d.kind] : '',
              d?.start ?? '',
              d?.end ?? '',
              d && d.kind === 'rad' && d.breakMin ? d.breakMin : null,
              w ? Math.round((w / 60) * 100) / 100 : null,
              w > STANDARD_DAY_MIN ? Math.round(((w - STANDARD_DAY_MIN) / 60) * 100) / 100 : null,
              d?.note ?? '',
            ]
          }),
          [],
          [{ bold: 'Ukupno sati' }, '', '', '', '', '', Math.round((s.workedMin / 60) * 100) / 100, Math.round((s.overtimeMin / 60) * 100) / 100, ''],
          [{ bold: 'Radnih dana' }, '', '', '', '', '', s.daysWorked, null, `fond: ${workingDaysInMonth(month)} dana`],
          [{ bold: 'Godišnji / bolovanje / praznik / slobodno' }, '', '', '', '', '', null, null, `${s.vacation} / ${s.sick} / ${s.holiday} / ${s.off}`],
        ],
      }
    })
    if (!restricted)
      tables.unshift({
        sheet: 'Pregled',
        title: `Radno vrijeme — pregled za ${monthTitle(month)}`,
        header: ['Zaposlenik', 'Radnih dana', 'Sati', 'Prekovremeno', 'Godišnji', 'Bolovanje', 'Praznik', 'Slobodno', 'Napomena'],
        widths: [24, 12, 10, 14, 10, 10, 10, 10, 20],
        rows: people.map((e) => {
          const s = summarize(days.filter((d) => d.employeeId === e.id))
          return [e.name, s.daysWorked, Math.round((s.workedMin / 60) * 100) / 100, Math.round((s.overtimeMin / 60) * 100) / 100, s.vacation, s.sick, s.holiday, s.off, '']
        }),
      })
    await exportTables(`radno-vrijeme-${month}.xlsx`, tables)
  }

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Ljudi"
        title="Radno vrijeme"
        description={
          restricted
            ? 'Upišite dolazak i odlazak. Godišnji, bolovanje i ispravke starijih dana upisuje voditelj.'
            : 'Dolasci, odlasci, pauze, godišnji i bolovanja. Mjesečni pregled sati i prekovremenih, s izvozom u Excel.'
        }
        actions={
          <Button variant="outline" onClick={exportXlsx} disabled={!remote.data}>
            <FileSpreadsheet className="size-4" /> Excel
          </Button>
        }
      />

      {user.employeeId && (
        <Card className="mb-5">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-copper-100 text-copper-700">
              <Clock className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-walnut-500">
                Danas, {weekday(today)} · trenutno {remote.data?.now ?? '—'}
              </div>
              <div className="font-display text-xl font-semibold">
                {myToday?.kind && myToday.kind !== 'rad'
                  ? WORK_KIND_LABEL[myToday.kind]
                  : myToday?.start
                    ? myToday.end
                      ? `Radili ste ${myToday.start}–${myToday.end} (${hours(workedMin(myToday))} h)`
                      : `Na poslu od ${myToday.start}`
                    : 'Dolazak još nije upisan'}
              </div>
            </div>
            <Button
              variant="copper"
              disabled={remote.busy || !!myToday?.start || (!!myToday && myToday.kind !== 'rad')}
              onClick={() => remote.run(() => clockFn({ data: { action: 'dolazak' } }), 'Dolazak je upisan.')}
            >
              <LogIn className="size-4" /> Dolazak
            </Button>
            <Button
              variant="primary"
              disabled={remote.busy || !myToday?.start}
              onClick={() => remote.run(() => clockFn({ data: { action: 'odlazak' } }), 'Odlazak je upisan.')}
            >
              <LogOut className="size-4" /> {myToday?.end ? 'Ponovo upiši odlazak' : 'Odlazak'}
            </Button>
          </div>
        </Card>
      )}

      {remote.error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{remote.error}</p>}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-xl border border-walnut-200 bg-linen shadow-sm">
          <button className="p-2 text-walnut-600 hover:text-walnut-900" aria-label="Prethodni mjesec" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-36 text-center text-sm font-semibold capitalize">{monthTitle(month)}</span>
          <button className="p-2 text-walnut-600 hover:text-walnut-900" aria-label="Sljedeći mjesec" onClick={() => setMonth((m) => shiftMonth(m, 1))}>
            <ChevronRight className="size-4" />
          </button>
        </div>
        {!restricted && (
          <select className={`${inputCls} w-auto`} value={empId} onChange={(e) => setEmpId(e.target.value)} aria-label="Zaposlenik">
            {staff.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} · {e.role}
              </option>
            ))}
          </select>
        )}
      </div>

      {!emp ? (
        <Card>
          <p className="text-sm text-walnut-600">Vaš korisnički račun nije povezan sa zaposlenikom. Administrator to može podesiti pod „Korisnici i pristup”.</p>
        </Card>
      ) : (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Odrađeno sati" value={hours(sum.workedMin)} hint={`fond ${fundDays * 8} h (${fundDays} radnih dana)`} tone="accent" />
            <Stat label="Radnih dana" value={String(sum.daysWorked)} />
            <Stat label="Prekovremeno" value={hours(sum.overtimeMin)} hint="preko 8 h dnevno" tone={sum.overtimeMin > 0 ? 'warn' : 'default'} />
            <Stat label="Odsustva" value={`${sum.vacation + sum.sick + sum.holiday + sum.off} dana`} hint={`godišnji ${sum.vacation} · bolovanje ${sum.sick} · praznik ${sum.holiday}`} />
          </div>

          <Card flush title={<span className="flex items-center gap-2"><Avatar employee={emp} size="sm" /> {emp.name}</span>} subtitle={monthTitle(month)}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-walnut-50 text-left text-[11px] uppercase tracking-wider text-walnut-500">
                  <tr>
                    <th className="px-5 py-2.5">Datum</th>
                    <th className="px-3 py-2.5">Vrsta</th>
                    <th className="px-3 py-2.5">Dolazak</th>
                    <th className="px-3 py-2.5">Odlazak</th>
                    <th className="px-3 py-2.5 text-right">Pauza</th>
                    <th className="px-3 py-2.5 text-right">Sati</th>
                    <th className="px-3 py-2.5">Napomena</th>
                    <th className="w-12 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-walnut-100">
                  {monthDates(month).map((dt) => {
                    const d = byDate.get(dt)
                    const wd = new Date(dt + 'T12:00:00Z').getUTCDay()
                    const weekend = wd === 0 || wd === 6
                    const w = d ? workedMin(d) : 0
                    const future = dt > today
                    return (
                      <tr key={dt} className={`${weekend ? 'bg-walnut-50/60' : ''} ${dt === today ? 'outline outline-2 -outline-offset-2 outline-copper-300' : ''}`}>
                        <td className="px-5 py-2 tabular">
                          <span className="inline-block w-8 text-walnut-500">{weekday(dt).slice(0, 3)}</span> {Number(dt.slice(8))}.
                        </td>
                        <td className="px-3 py-2">{d ? <Badge tone={KIND_TONE[d.kind]}>{WORK_KIND_LABEL[d.kind]}</Badge> : <span className="text-walnut-300">—</span>}</td>
                        <td className="px-3 py-2 tabular">{d?.start || ''}</td>
                        <td className="px-3 py-2 tabular">{d?.end || (d?.start && dt === today ? <span className="text-copper-600">u toku</span> : '')}</td>
                        <td className="px-3 py-2 text-right tabular text-walnut-500">{d?.kind === 'rad' && d.breakMin ? `${d.breakMin} min` : ''}</td>
                        <td className={`px-3 py-2 text-right font-semibold tabular ${w > STANDARD_DAY_MIN ? 'text-copper-700' : ''}`}>{w ? hours(w) : ''}</td>
                        <td className="max-w-64 truncate px-3 py-2 text-walnut-600" title={d?.note}>
                          {d?.note}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {canEdit(dt) && !(restricted && future) && (
                            <button className="rounded p-1 text-walnut-400 hover:bg-walnut-100 hover:text-walnut-800" aria-label={`Uredi ${dt}`} onClick={() => setEdit({ date: dt, day: d ?? null })}>
                              <Pencil className="size-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {!restricted && <TeamOverview staff={staff} days={days} onPick={setEmpId} current={empId} />}
        </>
      )}

      {edit && emp && (
        <WorkDayDialog
          employee={emp}
          date={edit.date}
          day={edit.day}
          restricted={restricted}
          busy={remote.busy}
          error={remote.error}
          onClose={() => {
            setEdit(null)
            remote.clearError()
          }}
          onSave={async (input) => {
            if (await remote.run(() => saveWorkDayFn({ data: input }), 'Radno vrijeme je spremljeno.')) setEdit(null)
          }}
        />
      )}
    </div>
  )
}

function TeamOverview({ staff, days, onPick, current }: { staff: Employee[]; days: WorkDay[]; onPick: (id: string) => void; current: string }) {
  return (
    <Card flush className="mt-5" title="Svi zaposlenici" subtitle="Kliknite na red za detalje">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-walnut-50 text-left text-[11px] uppercase tracking-wider text-walnut-500">
            <tr>
              <th className="px-5 py-2.5">Zaposlenik</th>
              <th className="px-3 py-2.5 text-right">Radnih dana</th>
              <th className="px-3 py-2.5 text-right">Sati</th>
              <th className="px-3 py-2.5 text-right">Prekovremeno</th>
              <th className="px-3 py-2.5 text-right">Godišnji</th>
              <th className="px-3 py-2.5 text-right">Bolovanje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-walnut-100">
            {staff.map((e) => {
              const s = summarize(days.filter((d) => d.employeeId === e.id))
              return (
                <tr key={e.id} className={`cursor-pointer hover:bg-walnut-50/70 ${e.id === current ? 'bg-copper-50/60' : ''}`} onClick={() => onPick(e.id)}>
                  <td className="px-5 py-2.5">
                    <span className="flex items-center gap-2">
                      <Avatar employee={e} size="sm" /> {e.name}
                      <span className="text-xs text-walnut-500">{e.role}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular">{s.daysWorked}</td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular">{hours(s.workedMin)}</td>
                  <td className="px-3 py-2.5 text-right tabular">{s.overtimeMin ? hours(s.overtimeMin) : '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular">{s.vacation || '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular">{s.sick || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function WorkDayDialog({
  employee,
  date,
  day,
  restricted,
  onClose,
  onSave,
  busy,
  error,
}: {
  employee: Employee
  date: string
  day: WorkDay | null
  restricted: boolean
  onClose: () => void
  onSave: (d: { employeeId: string; date: string; kind: WorkKind; start: string; end: string; breakMin: number; note: string }) => void
  busy: boolean
  error: string | null
}) {
  const [kind, setKind] = useState<WorkKind>(day?.kind ?? 'rad')
  const [start, setStart] = useState(day?.start ?? '')
  const [end, setEnd] = useState(day?.end ?? '')
  const [brk, setBrk] = useState(String(day?.breakMin ?? 30))
  const [note, setNote] = useState(day?.note ?? '')
  const preview = workedMin({ kind, start, end, breakMin: Number(brk) || 0 })
  return (
    <Modal
      title={`${employee.name} · ${weekday(date)}, ${Number(date.slice(8))}.${date.slice(5, 7)}.`}
      subtitle={day?.updatedByName ? `Zadnji upis: ${day.updatedByName}` : undefined}
      onClose={onClose}
      footer={
        <>
          {error && <span className="mr-auto text-sm text-rose-700">{error}</span>}
          <Button variant="ghost" onClick={onClose}>
            Odustani
          </Button>
          <Button variant="copper" disabled={busy} onClick={() => onSave({ employeeId: employee.id, date, kind, start, end, breakMin: Number(brk) || 0, note })}>
            Spremi
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Vrsta dana" className="sm:col-span-3">
          <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as WorkKind)} disabled={restricted}>
            {(Object.keys(WORK_KIND_LABEL) as WorkKind[]).map((k) => (
              <option key={k} value={k}>
                {WORK_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>
        {kind === 'rad' && (
          <>
            <Field label="Dolazak">
              <input type="time" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="Odlazak">
              <input type="time" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
            <Field label="Pauza (min)">
              <input type="number" min={0} className={inputCls} value={brk} onChange={(e) => setBrk(e.target.value)} />
            </Field>
          </>
        )}
        <Field label="Napomena" className="sm:col-span-3">
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="npr. teren, dostava u Prijedor, ranije otišao uz dogovor" />
        </Field>
      </div>
      {kind === 'rad' && preview > 0 && (
        <p className="mt-3 text-sm text-walnut-600">
          Odrađeno: <b className="text-walnut-900">{hours(preview)} h</b>
          {preview > STANDARD_DAY_MIN && <> · prekovremeno {hours(preview - STANDARD_DAY_MIN)} h</>}
        </p>
      )}
      {kind === 'rad' && !start && !end && !note && day && <p className="mt-3 text-xs text-walnut-500">Prazan unos briše zapis za taj dan.</p>}
    </Modal>
  )
}
