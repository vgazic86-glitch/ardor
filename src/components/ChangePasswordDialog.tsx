import { useState } from 'react'
import { changePasswordFn } from '../server/api'
import { useStore } from '../lib/store'
import { Modal } from './Modal'
import { Button, Field, inputCls } from './ui'

export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const { notify } = useStore()
  const [oldPassword, setOld] = useState('')
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  async function save() {
    setErr(null)
    if (p1 !== p2) return setErr('Nove lozinke se ne podudaraju.')
    setBusy(true)
    try {
      await changePasswordFn({ data: { oldPassword, newPassword: p1 } })
      notify('Lozinka je promijenjena.')
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Promjena nije uspjela.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title="Promjena lozinke"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Odustani</Button>
          <Button variant="copper" onClick={save} disabled={busy || !oldPassword || p1.length < 8}>Spremi lozinku</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Trenutna lozinka">
          <input type="password" className={inputCls} autoComplete="current-password" value={oldPassword} onChange={(e) => setOld(e.target.value)} />
        </Field>
        <Field label="Nova lozinka (najmanje 8 znakova)">
          <input type="password" className={inputCls} autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} />
        </Field>
        <Field label="Ponovite novu lozinku">
          <input type="password" className={inputCls} autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} />
        </Field>
        {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
      </div>
    </Modal>
  )
}
