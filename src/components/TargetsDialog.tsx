import { useRouter } from '@tanstack/react-router'
import { Copy } from 'lucide-react'
import { useState } from 'react'
import { money, monthLong, parseAmount } from '../lib/format'
import { previousMonthKey } from '../lib/stats'
import { useStore } from '../lib/store'
import { targetFor } from '../lib/types'
import { saveTargetsFn } from '../server/api'
import { Modal } from './Modal'
import { Avatar, Button, Field, inputCls } from './ui'

const shift = (m: string, d: number) => {
  const [y, mm] = m.split('-').map(Number)
  return new Date(Date.UTC(y, mm - 1 + d, 1)).toISOString().slice(0, 7)
}
const title = (m: string) => `${monthLong(Number(m.slice(5)) - 1)} ${m.slice(0, 4)}.`
const fmt = (v: number | undefined) => (v == null ? '' : String(v).replace('.', ','))

/** Plan prometa po prodavaču za odabrani mjesec. Prazno polje = vrijedi osnovni cilj. */
export function TargetsDialog({ initialMonth, onClose }: { initialMonth: string; onClose: () => void }) {
  const { salesPeople, currentMonth, notify } = useStore()
  const router = useRouter()
  const [month, setMonth] = useState(initialMonth)
  const fill = (m: string) => Object.fromEntries(salesPeople.map((e) => [e.id, fmt(e.targets?.[m])]))
  const [values, setValues] = useState<Record<string, string>>(() => fill(initialMonth))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const months = Array.from({ length: 16 }, (_, i) => shift(currentMonth, i - 12)).reverse()
  const total = salesPeople.reduce((s, e) => s + (values[e.id]?.trim() ? parseAmount(values[e.id]) : e.monthlyTarget), 0)

  function pick(m: string) {
    setMonth(m)
    setValues(fill(m))
  }
  function copyPrev() {
    const prev = previousMonthKey(month)
    setValues(Object.fromEntries(salesPeople.map((e) => [e.id, fmt(targetFor(e, prev))])))
  }
  async function save() {
    setBusy(true)
    setErr(null)
    try {
      await saveTargetsFn({
        data: {
          month,
          rows: salesPeople.map((e) => ({ employeeId: e.id, target: values[e.id]?.trim() ? parseAmount(values[e.id]) : null })),
        },
      })
      await router.invalidate()
      notify(`Plan prometa za ${title(month)} je spremljen.`)
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Spremanje nije uspjelo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Plan prometa po mjesecima"
      subtitle="Svaki mjesec može imati drugačiji plan. Prazno polje znači da vrijedi osnovni cilj zaposlenika."
      onClose={onClose}
      footer={
        <>
          {err && <span className="mr-auto text-sm text-rose-700">{err}</span>}
          <Button variant="ghost" onClick={onClose}>
            Odustani
          </Button>
          <Button variant="copper" disabled={busy} onClick={save}>
            Spremi plan
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Mjesec">
          <select className={inputCls} value={month} onChange={(e) => pick(e.target.value)}>
            {months.map((m) => (
              <option key={m} value={m}>
                {title(m)}
              </option>
            ))}
          </select>
        </Field>
        <Button variant="outline" onClick={copyPrev}>
          <Copy className="size-4" /> Kao prethodni mjesec
        </Button>
      </div>
      <div className="mt-4 divide-y divide-walnut-100 rounded-xl border border-walnut-200/80">
        {salesPeople.map((e) => (
          <label key={e.id} className="flex items-center gap-3 px-4 py-2.5">
            <Avatar employee={e} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{e.name}</span>
              <span className="block text-xs text-walnut-500">osnovni cilj {money(e.monthlyTarget)}</span>
            </span>
            <input
              className={`${inputCls} w-36 text-right`}
              inputMode="decimal"
              placeholder={String(e.monthlyTarget)}
              value={values[e.id] ?? ''}
              onChange={(ev) => setValues((v) => ({ ...v, [e.id]: ev.target.value }))}
              aria-label={`Plan za ${e.name}`}
            />
            <span className="w-6 text-xs text-walnut-500">KM</span>
          </label>
        ))}
      </div>
      <p className="mt-3 text-right text-sm text-walnut-600">
        Plan salona za {title(month)}: <b className="text-walnut-900">{money(total)}</b>
      </p>
    </Modal>
  )
}
