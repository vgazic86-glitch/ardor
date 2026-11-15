import { KeyRound, Lock, ShieldCheck } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useAdmin } from '../lib/admin'
import { Button, Card, Field, inputCls } from './ui'

/** Prikazuje sadržaj samo uz upravljačku lozinku; prvi put nudi postavljanje lozinke. */
export function AdminGate({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const { token, status, login, setup } = useAdmin()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (token) return <>{children}</>
  if (!status)
    return <div className="h-64 animate-pulse rounded-2xl bg-walnut-100/70" />

  const first = !status.configured

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (first && pw !== pw2) return setErr('Lozinke se ne podudaraju.')
    setBusy(true)
    try {
      await (first ? setup(pw) : login(pw))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Greška.')
    } finally {
      setBusy(false)
      setPw('')
      setPw2('')
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-md">
      <Card>
        <div className="flex flex-col items-center text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-walnut-900 text-copper-400 shadow-card">
            {first ? (
              <KeyRound className="size-6" />
            ) : (
              <Lock className="size-6" />
            )}
          </span>
          <h2 className="mt-4 font-display text-2xl font-semibold">
            {first ? 'Postavite upravljačku lozinku' : title}
          </h2>
          <p className="mt-1.5 text-sm text-walnut-600">
            {first
              ? 'Lozinka štiti plaće, ugovore o radu i bonuse te uređivanje dokumenata. Podijelite je samo s osobama koje vode kadrovsku evidenciju.'
              : 'Ovaj dio sadrži povjerljive podatke. Unesite upravljačku lozinku.'}
          </p>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <Field
            label={first ? 'Nova lozinka (najmanje 8 znakova)' : 'Lozinka'}
          >
            <input
              className={inputCls}
              type="password"
              autoComplete={first ? 'new-password' : 'current-password'}
              autoFocus
              required
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
          </Field>
          {first && (
            <Field label="Ponovite lozinku">
              <input
                className={inputCls}
                type="password"
                autoComplete="new-password"
                required
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
              />
            </Field>
          )}
          {err && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {err}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            <ShieldCheck className="size-4" />{' '}
            {busy ? 'Provjeravam…' : first ? 'Postavi lozinku' : 'Otključaj'}
          </Button>
        </form>
        <p className="mt-4 text-center text-[11px] text-walnut-500">
          Prijava vrijedi 12 sati na ovom uređaju (do zatvaranja preglednika).
        </p>
      </Card>
    </div>
  )
}
