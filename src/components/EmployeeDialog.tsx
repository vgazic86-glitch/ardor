import { useState } from 'react'
import { ROLES, type Employee, type Role } from '../lib/types'
import { parseAmount } from '../lib/format'
import { useStore } from '../lib/store'
import { Modal } from './Modal'
import { Button, Field, inputCls } from './ui'

const palette = [
  '#F15A29',
  '#F79328',
  '#58595B',
  '#7c4a2d',
  '#4f6b4a',
  '#3f5c78',
  '#8b5a7a',
  '#5a463a',
  '#a23b3b',
  '#2f6f6a',
]

export function EmployeeDialog({
  employee,
  onClose,
}: {
  employee: Employee | null
  onClose: () => void
}) {
  const { saveEmployee, deactivateEmployee, me, busy } = useStore()
  const [name, setName] = useState(employee?.name ?? '')
  const [role, setRole] = useState<Role>(employee?.role ?? 'Prodavač')
  const [phone, setPhone] = useState(employee?.phone ?? '')
  const [color, setColor] = useState(employee?.color ?? palette[0])
  const [target, setTarget] = useState(String(employee?.monthlyTarget ?? 20000))
  const [rate, setRate] = useState(
    String(Math.round((employee?.commissionRate ?? 0.03) * 1000) / 10),
  )
  const [confirm, setConfirm] = useState(false)

  return (
    <Modal
      title={employee ? 'Uredi zaposlenika' : 'Novi zaposlenik'}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          {employee && employee.id !== me?.id && (
            <Button
              variant="danger"
              onClick={async () => {
                if (!confirm) return setConfirm(true)
                await deactivateEmployee(employee.id)
                onClose()
              }}
            >
              {confirm ? 'Potvrdi deaktivaciju' : 'Deaktiviraj'}
            </Button>
          )}
          <Button variant="ghost" className="ml-auto" onClick={onClose}>
            Odustani
          </Button>
          <Button type="submit" form="employee-form" disabled={busy}>
            Spremi
          </Button>
        </div>
      }
    >
      <form
        id="employee-form"
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault()
          const r = await saveEmployee({
            id: employee?.id ?? null,
            name,
            role,
            phone,
            color,
            monthlyTarget: parseAmount(target),
            commissionRate: parseAmount(rate) / 100,
          })
          if (r) onClose()
        }}
      >
        <Field label="Ime i prezime">
          <input
            className={inputCls}
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Uloga">
          <select
            className={inputCls}
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label="Telefon">
          <input
            className={inputCls}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <div className="flex flex-col gap-1 text-xs font-semibold text-walnut-700">
          Boja
          <div className="flex flex-wrap gap-2 pt-1">
            {palette.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`size-7 rounded-full ring-offset-2 ring-offset-paper ${color === c ? 'ring-2 ring-walnut-900' : ''}`}
                style={{ background: c }}
                aria-label={`Boja ${c}`}
              />
            ))}
          </div>
        </div>
        {role !== 'Dostava i montaža' && (
          <>
            <Field label="Osnovni mjesečni cilj" hint="Vrijedi za mjesece bez posebnog plana (Zaposlenici → Plan prometa).">
              <input
                className={inputCls}
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </Field>
            <Field
              label="Provizija (%)"
              hint="Postotak od prometa koji ulazi u obračun provizija."
            >
              <input
                className={inputCls}
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </Field>
          </>
        )}
      </form>
    </Modal>
  )
}
