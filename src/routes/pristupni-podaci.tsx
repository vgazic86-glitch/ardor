import { createFileRoute } from '@tanstack/react-router'
import { Copy, Eye, EyeOff, ExternalLink, KeyRound, Lock, Pencil, Plus, Search, ShieldCheck, Trash2, Wand2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '../components/Modal'
import { Badge, Button, Card, EmptyState, Field, inputCls, PageHeader, Select } from '../components/ui'
import { date } from '../lib/format'
import { useRemote } from '../lib/remote'
import { useStore } from '../lib/store'
import { safeUrl, VAULT_KIND_LABEL, VAULT_KINDS, type VaultEntry, type VaultInput } from '../lib/vault'
import {
  vaultChangeMasterFn,
  vaultDeleteFn,
  vaultListFn,
  vaultLockFn,
  vaultRevealFn,
  vaultSaveFn,
  vaultSetupFn,
  vaultStatusFn,
  vaultUnlockFn,
} from '../server/api'

export const Route = createFileRoute('/pristupni-podaci')({ component: VaultPage })

const HIDE_AFTER_MS = 30_000

/** Nasumična lozinka: 16 znakova bez sličnih slova (0/O, 1/l/I). */
function generatePassword(len = 16) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%+-_?'
  const buf = new Uint32Array(len)
  crypto.getRandomValues(buf)
  return Array.from(buf, (n) => chars[n % chars.length]).join('')
}

function VaultPage() {
  const { user, notify } = useStore()
  const [token, setToken] = useState<string | null>(null)
  const status = useRemote(() => vaultStatusFn(), [])
  const tokenRef = useRef<string | null>(null)
  tokenRef.current = token

  // Napuštanje stranice zaključa trezor.
  useEffect(
    () => () => {
      if (tokenRef.current) vaultLockFn({ data: { token: tokenRef.current } }).catch(() => {})
    },
    [],
  )

  if (user?.role !== 'admin')
    return (
      <Card>
        <EmptyState icon={Lock} title="Samo administrator">
          Pristupne podatke vidi samo administrator.
        </EmptyState>
      </Card>
    )

  const lock = async () => {
    if (token) await vaultLockFn({ data: { token } }).catch(() => {})
    setToken(null)
    notify('Trezor je zaključan.')
  }

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Samo administrator"
        title="Pristupni podaci"
        description="Službeni mailovi, hosting, banke, društvene mreže i programi — korisnička imena, lozinke i bilješke na jednom mjestu. Lozinke su šifrirane lozinkom trezora koju znate samo vi."
        actions={
          token ? (
            <Button variant="outline" onClick={lock}>
              <Lock className="size-4" /> Zaključaj
            </Button>
          ) : undefined
        }
      />
      {status.error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{status.error}</p>}
      {!status.data ? (
        <Card>
          <div className="py-10 text-center text-sm text-walnut-500">Učitavam…</div>
        </Card>
      ) : !status.data.configured ? (
        <SetupCard
          onDone={(t) => {
            setToken(t)
            status.reload()
          }}
        />
      ) : !token ? (
        <UnlockCard onDone={setToken} />
      ) : (
        <VaultList token={token} onLocked={() => setToken(null)} onToken={setToken} />
      )}
    </div>
  )
}

function SetupCard({ onDone }: { onDone: (token: string) => void }) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (a !== b) return setErr('Lozinke se ne podudaraju.')
    setBusy(true)
    setErr(null)
    try {
      onDone((await vaultSetupFn({ data: { master: a } })).token)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Nije uspjelo.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card className="mx-auto max-w-lg" title={<span className="flex items-center gap-2"><ShieldCheck className="size-5 text-copper-600" /> Postavite lozinku trezora</span>}>
      <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <b>Važno:</b> ovom lozinkom se šifriraju svi pristupni podaci. Ne sprema se nigdje — ako je zaboravite, podatke <b>nije moguće vratiti</b>, ni nama ni programeru. Zapišite je i čuvajte na sigurnom (npr. u sefu). Neka bude drukčija od lozinke za prijavu.
      </div>
      <div className="grid gap-3">
        <Field label="Lozinka trezora (najmanje 10 znakova)">
          <input type="password" className={inputCls} value={a} onChange={(e) => setA(e.target.value)} autoComplete="new-password" aria-label="Nova lozinka trezora" />
        </Field>
        <Field label="Ponovite lozinku trezora">
          <input type="password" className={inputCls} value={b} onChange={(e) => setB(e.target.value)} autoComplete="new-password" aria-label="Ponovljena lozinka trezora" onKeyDown={(e) => e.key === 'Enter' && save()} />
        </Field>
        {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
        <Button variant="copper" disabled={busy || !a} onClick={save}>
          <KeyRound className="size-4" /> Postavi trezor
        </Button>
      </div>
    </Card>
  )
}

function UnlockCard({ onDone }: { onDone: (token: string) => void }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const open = async () => {
    setBusy(true)
    setErr(null)
    try {
      onDone((await vaultUnlockFn({ data: { master: pw } })).token)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Nije uspjelo.')
      setPw('')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card className="mx-auto max-w-md" title={<span className="flex items-center gap-2"><Lock className="size-5 text-copper-600" /> Trezor je zaključan</span>} subtitle="Zaključa se sam nakon 15 minuta bez rada i kad napustite stranicu.">
      <div className="grid gap-3">
        <Field label="Lozinka trezora">
          <input type="password" autoFocus className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && open()} autoComplete="off" aria-label="Lozinka trezora" />
        </Field>
        {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
        <Button variant="copper" disabled={busy || !pw} onClick={open}>
          Otključaj
        </Button>
      </div>
    </Card>
  )
}

function VaultList({ token, onLocked, onToken }: { token: string; onLocked: () => void; onToken: (t: string) => void }) {
  const { notify } = useStore()
  const r = useRemote(() => vaultListFn({ data: { token } }), [token])
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<(VaultInput & { loaded: boolean }) | null>(null)
  const [shown, setShown] = useState<Record<string, string>>({})
  const [changing, setChanging] = useState(false)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    if (r.error && /zaključan/i.test(r.error)) onLocked()
  }, [r.error, onLocked])
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])

  const reveal = async (e: VaultEntry) => {
    const res = await r.run(() => vaultRevealFn({ data: { token, id: e.id } }))
    return res && typeof res === 'object' ? res : null
  }
  const toggle = async (e: VaultEntry) => {
    if (shown[e.id] !== undefined) return setShown(({ [e.id]: _, ...rest }) => rest)
    const res = await reveal(e)
    if (!res) return
    setShown((s) => ({ ...s, [e.id]: res.secret }))
    clearTimeout(timers.current[e.id])
    timers.current[e.id] = setTimeout(() => setShown(({ [e.id]: _, ...rest }) => rest), HIDE_AFTER_MS)
  }
  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      notify(`${what} kopirano.`)
    } catch {
      notify('Kopiranje nije uspjelo — označite tekst i kopirajte ručno.')
    }
  }
  const copySecret = async (e: VaultEntry) => {
    const res = await reveal(e)
    if (res) await copy(res.secret, 'Lozinka')
  }
  const openEdit = async (e: VaultEntry | null) => {
    if (!e) return setEdit({ id: null, kind: 'email', title: '', username: '', url: '', secret: '', note: '', loaded: true })
    const res = await reveal(e)
    if (res) setEdit({ id: e.id, kind: e.kind, title: e.title, username: e.username, url: e.url, secret: res.secret, note: res.note, loaded: true })
  }

  const rows = r.data ?? []
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? rows.filter((e) => [e.title, e.username, e.url, VAULT_KIND_LABEL[e.kind]].join(' ').toLowerCase().includes(s)) : rows
  }, [rows, q])
  const groups = VAULT_KINDS.map((k) => ({ kind: k, items: filtered.filter((e) => e.kind === k) })).filter((g) => g.items.length)

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-60">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-walnut-400" />
          <input className={`${inputCls} pl-9`} placeholder="Traži: naziv, korisničko ime, adresa…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Pretraga pristupnih podataka" />
        </div>
        <Button variant="outline" onClick={() => setChanging(true)}>
          <KeyRound className="size-4" /> Lozinka trezora
        </Button>
        <Button variant="copper" onClick={() => openEdit(null)}>
          <Plus className="size-4" /> Novi zapis
        </Button>
      </div>
      {r.error && !/zaključan/i.test(r.error) && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{r.error}</p>}
      {!r.data ? (
        <Card>
          <div className="py-10 text-center text-sm text-walnut-500">Učitavam…</div>
        </Card>
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState icon={KeyRound} title={rows.length ? 'Ništa ne odgovara pretrazi' : 'Još nema zapisa'}>
            {rows.length ? 'Promijenite pretragu.' : 'Dodajte prvi zapis, npr. službeni mail info@ardornamjestaj.com s lozinkom i adresom webmaila.'}
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <Card key={g.kind} title={VAULT_KIND_LABEL[g.kind]} subtitle={`${g.items.length} ${g.items.length === 1 ? 'zapis' : 'zapisa'}`} flush>
              <ul className="divide-y divide-walnut-100">
                {g.items.map((e) => {
                  const link = safeUrl(e.url)
                  const secret = shown[e.id]
                  return (
                    <li key={e.id} className="px-5 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0 flex-1 basis-56">
                          <div className="font-semibold break-words">{e.title}</div>
                          {e.username && (
                            <button type="button" className="mt-0.5 inline-flex max-w-full items-center gap-1 text-sm text-walnut-700 hover:text-copper-700" onClick={() => copy(e.username, 'Korisničko ime')} title="Kopiraj korisničko ime">
                              <span className="truncate">{e.username}</span> <Copy className="size-3.5 shrink-0" />
                            </button>
                          )}
                          {link && (
                            <a href={link} target="_blank" rel="noopener noreferrer" className="mt-0.5 flex max-w-full items-center gap-1 text-xs text-copper-700 hover:underline">
                              <span className="truncate">{e.url}</span> <ExternalLink className="size-3 shrink-0" />
                            </a>
                          )}
                          <div className="mt-1 text-[11px] text-walnut-500">
                            {e.hasNote && <Badge tone="info" className="mr-1">bilješka</Badge>}
                            izmijenio/la {e.updatedBy || '—'} · {date(e.updatedAt)}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {e.hasSecret && (
                            <>
                              <code className="max-w-[14rem] truncate rounded-md bg-walnut-50 px-2 py-1 font-mono text-sm" aria-label={`Lozinka za ${e.title}`}>
                                {secret ?? '••••••••••'}
                              </code>
                              <Button size="sm" variant="ghost" onClick={() => toggle(e)} aria-label={secret ? 'Sakrij lozinku' : 'Prikaži lozinku'}>
                                {secret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => copySecret(e)} aria-label="Kopiraj lozinku">
                                <Copy className="size-4" />
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => openEdit(e)} aria-label={`Uredi ${e.title}`}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Obriši ${e.title}`}
                            onClick={() => {
                              if (confirm(`Obrisati „${e.title}”? Ovo se ne može vratiti.`)) r.run(() => vaultDeleteFn({ data: { token, id: e.id, title: e.title } }), 'Zapis je obrisan.')
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}
      {edit && (
        <EntryDialog
          entry={edit}
          busy={r.busy}
          onClose={() => setEdit(null)}
          onSave={async (entry) => {
            const ok = await r.run(() => vaultSaveFn({ data: { token, entry } }), 'Zapis je spremljen.')
            if (ok) {
              setEdit(null)
              setShown({})
            }
          }}
        />
      )}
      {changing && (
        <ChangeMasterDialog
          token={token}
          onClose={() => setChanging(false)}
          onDone={(t) => {
            setChanging(false)
            onToken(t)
            notify('Lozinka trezora je promijenjena.')
          }}
        />
      )}
    </>
  )
}

function EntryDialog({ entry, busy, onClose, onSave }: { entry: VaultInput; busy: boolean; onClose: () => void; onSave: (e: VaultInput) => void }) {
  const [f, setF] = useState<VaultInput>(entry)
  const [show, setShow] = useState(!entry.id)
  const set = (p: Partial<VaultInput>) => setF((x) => ({ ...x, ...p }))
  return (
    <Modal
      title={entry.id ? 'Uredi pristupne podatke' : 'Novi pristupni podaci'}
      help="pristupni-podaci"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Odustani
          </Button>
          <Button variant="copper" disabled={busy || !f.title.trim()} onClick={() => onSave(f)}>
            Spremi
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Vrsta" value={f.kind} onChange={(v) => set({ kind: v })} options={VAULT_KINDS.map((k) => ({ value: k, label: VAULT_KIND_LABEL[k] }))} />
        <Field label="Naziv">
          <input className={inputCls} value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="npr. info@ardornamjestaj.com" aria-label="Naziv zapisa" />
        </Field>
        <Field label="Korisničko ime / e-pošta">
          <input className={inputCls} value={f.username} onChange={(e) => set({ username: e.target.value })} autoComplete="off" aria-label="Korisničko ime" />
        </Field>
        <Field label="Adresa za prijavu">
          <input className={inputCls} value={f.url} onChange={(e) => set({ url: e.target.value })} placeholder="npr. mail.ardornamjestaj.com" aria-label="Adresa za prijavu" />
        </Field>
        <Field label="Lozinka" className="sm:col-span-2">
          <div className="flex gap-2">
            <input type={show ? 'text' : 'password'} className={`${inputCls} font-mono`} value={f.secret} onChange={(e) => set({ secret: e.target.value })} autoComplete="new-password" aria-label="Lozinka zapisa" />
            <Button variant="ghost" onClick={() => setShow((s) => !s)} aria-label={show ? 'Sakrij lozinku' : 'Prikaži lozinku'}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                set({ secret: generatePassword() })
                setShow(true)
              }}
              title="Napravi jaku nasumičnu lozinku"
            >
              <Wand2 className="size-4" /> Nova
            </Button>
          </div>
        </Field>
        <Field label="Bilješka (šifrirano)" className="sm:col-span-2">
          <textarea className={`${inputCls} min-h-24`} value={f.note} onChange={(e) => set({ note: e.target.value })} placeholder="npr. IMAP/SMTP postavke, PIN, kodovi za oporavak, tko još zna lozinku, broj ugovora…" aria-label="Bilješka" />
        </Field>
      </div>
    </Modal>
  )
}

function ChangeMasterDialog({ token, onClose, onDone }: { token: string; onClose: () => void; onDone: (token: string) => void }) {
  const [o, setO] = useState('')
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (a !== b) return setErr('Nove lozinke se ne podudaraju.')
    setBusy(true)
    setErr(null)
    try {
      onDone((await vaultChangeMasterFn({ data: { token, oldMaster: o, newMaster: a } })).token)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Nije uspjelo.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title="Promjena lozinke trezora"
      subtitle="Svi zapisi se ponovo šifriraju novom lozinkom. Staru više nije moguće koristiti."
      help="pristupni-podaci"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Odustani
          </Button>
          <Button variant="copper" disabled={busy || !o || !a} onClick={save}>
            Promijeni
          </Button>
        </div>
      }
    >
      <div className="grid gap-3">
        <Field label="Trenutna lozinka trezora">
          <input type="password" className={inputCls} value={o} onChange={(e) => setO(e.target.value)} autoComplete="off" aria-label="Trenutna lozinka trezora" />
        </Field>
        <Field label="Nova lozinka trezora (najmanje 10 znakova)">
          <input type="password" className={inputCls} value={a} onChange={(e) => setA(e.target.value)} autoComplete="new-password" aria-label="Nova lozinka trezora" />
        </Field>
        <Field label="Ponovite novu lozinku">
          <input type="password" className={inputCls} value={b} onChange={(e) => setB(e.target.value)} autoComplete="new-password" aria-label="Ponovljena lozinka trezora" />
        </Field>
        {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
      </div>
    </Modal>
  )
}
