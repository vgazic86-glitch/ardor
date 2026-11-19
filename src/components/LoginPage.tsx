import { useRouter } from '@tanstack/react-router'
import { KeyRound, LogIn, Quote, ShieldCheck } from 'lucide-react'
import { messageFor, todayBL } from '../lib/motivation'
import { tipsFor } from '../lib/savjeti'
import { markTabStarted } from '../lib/closeLogout'
import { useState } from 'react'
import { activateFn, loginFn } from '../server/api'
import { BrandMark, Logo } from './Logo'
import { Button, Field, inputCls } from './ui'

/** Poruka dana ima vlastiti (serifni) font; mali tekst ostaje u Ubuntu. */
const QUOTE_FONT = { fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700 } as const

/** Prijava u aplikaciju; prva prijava = aktivacijski kod + nova lozinka. */
export function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<'login' | 'activate'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const today = todayBL()
  const message = messageFor(today)
  const tips = tipsFor(today)
  const rawLabel = new Intl.DateTimeFormat('bs-BA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Sarajevo' })
    .format(new Date(`${today}T12:00:00Z`))
    .toLowerCase()
  const dayLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      if (step === 'login') {
        const r = await loginFn({ data: { username, password } })
        if ('needsActivation' in r) {
          setStep('activate')
          return
        }
      } else {
        if (pw1 !== pw2) throw new Error('Lozinke se ne podudaraju.')
        await activateFn({ data: { username, code, password: pw1 } })
      }
      markTabStarted()
      await router.invalidate()
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Prijava nije uspjela.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="sidebar-bg relative hidden overflow-hidden lg:block">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'url(/brand/ardor-znak.svg)', backgroundSize: '64px 64px' }}
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo light className="h-12 w-auto self-start" />
          <div>
            <BrandMark className="size-24" />
            <div className="mt-8 max-w-lg">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-copper-400">
                <Quote className="size-4" /> Poruka dana
              </div>
              <p suppressHydrationWarning className="mt-3 text-3xl leading-snug text-linen" style={QUOTE_FONT}>
                {message}
              </p>
              <p suppressHydrationWarning className="mt-4 text-sm text-walnut-300">
                {dayLabel}
              </p>
              <div className="mt-8 rounded-2xl border border-linen/20 bg-white/5 p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-copper-400">Savjet za dom</div>
                <ul suppressHydrationWarning className="mt-3 list-disc space-y-3 pl-5 text-lg leading-relaxed text-walnut-100 marker:text-copper-400">
                  {tips.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-8 text-sm uppercase tracking-[0.25em] text-copper-400">Namještaj za svačiji džep</p>
          </div>
          <p className="text-xs text-walnut-400">Vojvode Pere Krece 21, Banja Luka</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <Logo className="mb-6 h-10 lg:hidden" />
          <div className="mb-8 rounded-2xl border border-copper-200 bg-copper-50 p-4 lg:hidden">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-copper-700">
              <Quote className="size-3.5" /> Poruka dana
            </div>
            <p suppressHydrationWarning className="mt-1.5 text-base leading-snug text-walnut-900" style={QUOTE_FONT}>
              {message}
            </p>
          </div>
          <div className="mb-8 rounded-2xl border border-walnut-200 bg-white p-4 lg:hidden">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-copper-700">Savjet za dom</div>
            <ul suppressHydrationWarning className="mt-2 list-disc space-y-2.5 pl-5 text-base leading-relaxed text-walnut-800 marker:text-copper-600">
              {tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <h2 className="font-display text-3xl font-bold">{step === 'login' ? 'Prijava' : 'Prva prijava'}</h2>
          <p className="mt-1.5 text-sm text-walnut-600">
            {step === 'login'
              ? 'Unesite korisničko ime i lozinku.'
              : 'Unesite aktivacijski kod koji ste dobili od administratora i postavite svoju lozinku.'}
          </p>

          <div className="mt-7 space-y-4">
            <Field label="Korisničko ime">
              <input className={inputCls} autoComplete="username" autoFocus required value={username} onChange={(e) => setUsername(e.target.value)} disabled={step === 'activate'} placeholder="npr. trgovac1" />
            </Field>
            {step === 'login' ? (
              <Field label="Lozinka" hint="Prvi put? Ostavite prazno i kliknite Prijava.">
                <input className={inputCls} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
            ) : (
              <>
                <Field label="Aktivacijski kod">
                  <input className={`${inputCls} font-mono uppercase tracking-widest`} required autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXX-XXXX" />
                </Field>
                <Field label="Nova lozinka (najmanje 8 znakova)">
                  <input className={inputCls} type="password" autoComplete="new-password" required value={pw1} onChange={(e) => setPw1(e.target.value)} />
                </Field>
                <Field label="Ponovite lozinku">
                  <input className={inputCls} type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
                </Field>
              </>
            )}
            {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
            <Button type="submit" variant="copper" className="w-full py-2.5" disabled={busy}>
              {step === 'login' ? <LogIn className="size-4" /> : <ShieldCheck className="size-4" />}
              {busy ? 'Provjeravam…' : step === 'login' ? 'Prijava' : 'Postavi lozinku i uđi'}
            </Button>
            {step === 'activate' && (
              <button type="button" className="w-full text-center text-xs font-semibold text-walnut-500 hover:text-walnut-800" onClick={() => setStep('login')}>
                Nazad na prijavu
              </button>
            )}
          </div>
          <p className="mt-10 flex items-center gap-2 text-xs text-walnut-500">
            <KeyRound className="size-3.5" /> Zaboravljena lozinka? Administrator vam može dati novi aktivacijski kod.
          </p>
        </form>
      </div>
    </div>
  )
}
