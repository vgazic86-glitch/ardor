import { useRouter } from '@tanstack/react-router'
import { CalendarDays, Pencil, Sunrise, Sunset } from 'lucide-react'
import { useState } from 'react'
import { addDaysIso, dotDate, SHIFT_LABEL, type ShiftKind, type ShiftsData } from '../lib/inbox'
import { useRemote } from '../lib/remote'
import { useStore } from '../lib/store'
import { listShiftsFn, saveShiftsFn } from '../server/api'
import { Modal } from './Modal'
import { Button, Card, Field, inputCls } from './ui'

/** Smjene trgovaca za danas i sutra: tko otvara, tko zatvara. Uređuju administrator, uprava i voditelj salona. */
export function ShiftsCard() {
  const { today, notify } = useStore()
  const router = useRouter()
  const tomorrow = addDaysIso(today, 1)
  const remote = useRemote<ShiftsData>(() => listShiftsFn({ data: { days: [today, tomorrow] } }), [today])
  const [editing, setEditing] = useState<string | null>(null)
  const data = remote.data
  if (!data) return null
  return (
    <>
      <Card
        className="mb-6"
        title={
          <span className="flex items-center gap-2">
            <CalendarDays className="size-5 text-copper-600" /> Smjene trgovaca
          </span>
        }
        subtitle="Tko je na prvoj, a tko na drugoj smjeni. Dnevnu listu dobiju trgovci prema smjeni tog dana."
        action={
          data.canEdit ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(today)}>
                <Pencil className="size-3.5" /> Smjene za danas
              </Button>
              <Button size="sm" variant="copper" onClick={() => setEditing(tomorrow)}>
                Smjene za sutra
              </Button>
            </div>
          ) : undefined
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          {data.days.map((d, i) => (
            <DayShifts key={d.date} label={i === 0 ? 'Danas' : 'Sutra'} date={d.date} rows={d.rows} />
          ))}
        </div>
      </Card>
      {editing && (
        <EditShifts
          date={editing}
          today={today}
          label={editing === today ? 'danas' : 'sutra'}
          data={data}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            notify('Smjene su spremljene. Dnevne liste su dodijeljene prema smjeni.')
            await remote.reload()
            await router.invalidate()
          }}
        />
      )}
    </>
  )
}

function DayShifts({ label, date, rows }: { label: string; date: string; rows: ShiftsData['days'][number]['rows'] }) {
  const of = (s: ShiftKind) => rows.filter((r) => r.shift === s).map((r) => r.name)
  const none = rows.filter((r) => !r.shift).map((r) => r.name)
  const opening = of('otvaranje')
  return (
    <div className="rounded-xl border border-walnut-200/70 p-4">
      <div className="mb-2 font-semibold">
        {label}, {dotDate(date)}
      </div>
      <dl className="space-y-2 text-sm">
        <Row icon={<Sunrise className="size-4 text-copper-600" />} label={SHIFT_LABEL.otvaranje} names={opening} empty="Nitko nije upisan. Upišite smjenu da dobiju dnevnu listu." />
        <Row icon={<Sunset className="size-4 text-walnut-600" />} label={SHIFT_LABEL.zatvaranje} names={of('zatvaranje')} empty="Nitko nije upisan." />
        {none.length > 0 && <Row icon={null} label="Nije na smjeni" names={none} empty="" muted />}
      </dl>
    </div>
  )
}

function Row({ icon, label, names, empty, muted }: { icon: React.ReactNode; label: string; names: string[]; empty: string; muted?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="mt-0.5">{icon}</span>}
      <div className="min-w-0 flex-1">
        <dt className={`font-semibold ${muted ? 'text-walnut-500' : 'text-walnut-900'}`}>{label}</dt>
        <dd className={muted ? 'text-walnut-500' : 'text-walnut-700'}>{names.length ? names.join(', ') : <span className="text-walnut-500">{empty}</span>}</dd>
      </div>
    </div>
  )
}

function EditShifts({
  date,
  today,
  label,
  data,
  onClose,
  onSaved,
}: {
  date: string
  today: string
  label: string
  data: ShiftsData
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const current = data.days.find((d) => d.date === date)?.rows ?? []
  const [values, setValues] = useState<Record<string, ShiftKind | ''>>(() =>
    Object.fromEntries(current.map((r) => [r.userId, r.shift ?? ''])),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setBusy(true)
    setError('')
    try {
      await saveShiftsFn({ data: { date, today, assignments: data.traders.map((tr) => ({ userId: tr.id, shift: values[tr.id] ?? '' })) } })
      await onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Smjene nisu spremljene.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={`Smjene za ${label} (${dotDate(date)})`}
      subtitle="Odaberite smjenu za svakog trgovca. Trgovac na prvoj smjeni dobija listu za otvaranje salona, a na drugoj listu za zatvaranje salona."
      onClose={onClose}
      help={false}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Odustani
          </Button>
          <Button variant="copper" disabled={busy} onClick={save}>
            {busy ? 'Spremam…' : 'Spremi smjene'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {data.traders.length === 0 && <p className="text-sm text-walnut-500">Nema aktivnih trgovaca.</p>}
        {data.traders.map((tr) => (
          <Field key={tr.id} label={tr.name}>
            <select className={inputCls} value={values[tr.id] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [tr.id]: e.target.value as ShiftKind | '' }))}>
              <option value="">Nije na smjeni</option>
              <option value="otvaranje">{SHIFT_LABEL.otvaranje}</option>
              <option value="zatvaranje">{SHIFT_LABEL.zatvaranje}</option>
            </select>
          </Field>
        ))}
        {error && <p className="text-sm text-rose-700">{error}</p>}
      </div>
    </Modal>
  )
}
