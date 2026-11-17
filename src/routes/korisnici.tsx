import { createFileRoute } from '@tanstack/react-router'
import { Building2, Copy, KeyRound, Pencil, Plus, ShieldAlert, ShieldCheck, Unlock, UserX } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AuditRow } from '../server/audit'
import { Modal } from '../components/Modal'
import { ClearDemoCard } from '../components/ClearDemoCard'
import { Badge, Button, Card, Field, inputCls, PageHeader, Segmented } from '../components/ui'
import { ROLE_LABEL } from '../lib/access'
import { useRemote } from '../lib/remote'
import { useStore } from '../lib/store'
import { DEFAULT_COMPANY, type CompanyInfo } from '../lib/types'
import type { UserAdminView, UserRole } from '../server/auth'
import { auditListFn, unlockUserFn, getCompanyFn, listUsersFn, presenceFn, resetUserFn, saveCompanyFn, saveUserFn } from '../server/api'

export const Route = createFileRoute('/korisnici')({
  validateSearch: (s: Record<string, unknown>): { tab?: 'firma' | 'dnevnik' } => ({ tab: s.tab === 'firma' || s.tab === 'dnevnik' ? s.tab : undefined }),
  component: UsersPage,
})

function UsersPage() {
  const { tab } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <div className="rise">
      <PageHeader
        eyebrow="Administracija"
        title="Korisnici i pristup"
        description="Ko se može prijaviti u aplikaciju i šta vidi. Novi korisnik dobija jednokratni aktivacijski kod i sam postavlja lozinku pri prvoj prijavi."
        actions={
          <Segmented
            value={tab ?? 'korisnici'}
            onChange={(v) => navigate({ search: v === 'korisnici' ? {} : { tab: v } })}
            options={[
              { value: 'korisnici', label: 'Korisnici' },
              { value: 'dnevnik', label: 'Dnevnik izmjena' },
              { value: 'firma', label: 'Podaci o firmi' },
            ]}
          />
        }
      />
      {tab === 'firma' ? (
        <>
          <CompanyForm />
          <ClearDemoCard />
        </>
      ) : tab === 'dnevnik' ? (
        <AuditLog />
      ) : (
        <UsersList />
      )}
    </div>
  )
}

const ROLE_HELP: Record<UserRole, string> = {
  admin: 'Sve, uključujući korisnike, plaće i troškove.',
  uprava: 'Sve osim upravljanja korisnicima, uključujući zaradu, plaće i troškove (bez dodatne lozinke).',
  voditelj: 'Voditelj salona: promet i plan cijelog tima, dnevni pazar, zadaci trgovcima, nabava, primke, kartice dobavljača i inventura. Ne vidi zaradu, marže, troškove, plaće ni izvještaje.',
  operativa: 'Srednji pristup: primke, narudžbe dobavljačima, kartice i izvodi dobavljača, artikli, inventura i prodaja. Ne vidi tuđe prodaje, zaradu, izvještaje, troškove ni plaće.',
  trgovac: 'Prodaja, dostave, zalihe (bez nabavnih cijena), radno vrijeme i dokumenti. Ne vidi tuđe prodaje.',
}

function UsersList() {
  const { user, notify } = useStore()
  const remote = useRemote(() => listUsersFn(), [])
  const [edit, setEdit] = useState<UserAdminView | 'new' | null>(null)
  const users = remote.data ?? []
  const pending = users.filter((u) => u.active && !u.activated)
  const [presence, setPresence] = useState<Record<string, { lastSeenAt: string; online: boolean; devices: number; mobile: boolean }>>({})
  useEffect(() => {
    let alive = true
    const load = () => presenceFn().then((p) => alive && setPresence(p)).catch(() => {})
    load()
    const id = setInterval(load, 30_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])
  const onlineCount = Object.values(presence).filter((p) => p.online).length
  const when = (iso: string | null) => {
    if (!iso) return '—'
    const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
    if (min < 1) return 'upravo'
    if (min < 60) return `prije ${min} min`
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Sarajevo' })
        .formatToParts(new Date(iso))
        .map((x) => [x.type, x.value]),
    )
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sarajevo' }).format(new Date())
    const day = `${p.year}-${p.month.padStart(2, '0')}-${p.day.padStart(2, '0')}`
    const hm = `${p.hour}:${p.minute}`
    if (day === today) return `danas u ${hm}`
    return `${p.day}. ${p.month}. ${p.year}. u ${hm}`
  }

  function copyText(t: string) {
    navigator.clipboard?.writeText(t).then(() => notify('Kopirano.'))
  }

  return (
    <>
      {remote.error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{remote.error}</p>}
      {pending.length > 0 && (
        <Card className="mb-5" title="Pristupni podaci za prvu prijavu" subtitle="Pošaljite svakoj osobi njeno korisničko ime i kod. Kod vrijedi dok ne postavi svoju lozinku.">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {pending.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl border border-walnut-200/80 bg-white px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{u.name}</div>
                  <div className="text-xs text-walnut-500">
                    korisnik <b className="font-mono text-walnut-800">{u.username}</b> · kod{' '}
                    <b className="font-mono tracking-wider text-copper-700">{u.activationCode ?? '—'}</b>
                  </div>
                </div>
                <button
                  className="rounded-lg p-2 text-walnut-400 hover:bg-walnut-100 hover:text-walnut-800"
                  aria-label={`Kopiraj podatke za ${u.name}`}
                  onClick={() =>
                    copyText(
                      `ARDOR aplikacija: ${typeof window !== 'undefined' ? window.location.origin : ''}\nKorisničko ime: ${u.username}\nAktivacijski kod: ${u.activationCode}\nPri prvoj prijavi ostavite lozinku praznu, unesite kod i postavite svoju lozinku.`,
                    )
                  }
                >
                  <Copy className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card
        flush
        title="Korisnici"
        subtitle={`${users.filter((u) => u.active).length} aktivnih · ${onlineCount} trenutno online`}
        action={
          <Button variant="copper" size="sm" onClick={() => setEdit('new')}>
            <Plus className="size-3.5" /> Novi korisnik
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-walnut-50 text-left text-[11px] uppercase tracking-wider text-walnut-500">
              <tr>
                <th className="px-5 py-2.5">Ime</th>
                <th className="px-3 py-2.5">Korisničko ime</th>
                <th className="px-3 py-2.5">Uloga</th>
                <th className="px-3 py-2.5">Zarada i plaće</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Sada</th>
                <th className="px-3 py-2.5">Zadnja prijava</th>
                <th className="w-12 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-walnut-100">
              {users.map((u) => (
                <tr key={u.id} className={u.active ? '' : 'opacity-50'}>
                  <td className="px-5 py-2.5 font-semibold">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={`size-2.5 rounded-full ${presence[u.id]?.online ? 'bg-emerald-500 ring-4 ring-emerald-100' : presence[u.id] ? 'bg-amber-400' : 'bg-walnut-200'}`}
                        title={presence[u.id]?.online ? 'Online' : presence[u.id] ? 'Neaktivan (aplikacija otvorena, bez aktivnosti)' : 'Nije prijavljen'}
                      />
                      {u.name} {u.id === user.id && <span className="text-xs font-normal text-walnut-500">(vi)</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{u.username}</td>
                  <td className="px-3 py-2.5">
                    <Badge tone={u.role === 'admin' ? 'copper' : u.role === 'trgovac' ? 'info' : u.role === 'operativa' ? 'violet' : u.role === 'voditelj' ? 'warn' : 'neutral'}>{ROLE_LABEL[u.role]}</Badge>
                  </td>
                  <td className="px-3 py-2.5">{u.hrAccess ? <ShieldCheck className="size-4 text-emerald-600" /> : <span className="text-walnut-300">—</span>}</td>
                  <td className="px-3 py-2.5">
                    {!u.active ? <Badge tone="bad">Isključen</Badge> : u.activated ? <Badge tone="good">Aktivan</Badge> : <Badge tone="warn">Čeka prvu prijavu</Badge>}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {presence[u.id]?.online ? (
                      <span className="font-semibold text-emerald-700">
                        Online{presence[u.id].devices > 1 ? ` · ${presence[u.id].devices} uređaja` : presence[u.id].mobile ? ' · mobitel' : ''}
                      </span>
                    ) : presence[u.id] ? (
                      <span className="text-amber-700">aktivan {when(presence[u.id].lastSeenAt)}</span>
                    ) : (
                      <span className="text-walnut-400">odjavljen</span>
                    )}
                  </td>
                  <td suppressHydrationWarning className="px-3 py-2.5 text-xs text-walnut-500">{when(u.lastLoginAt)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button className="rounded p-1 text-walnut-400 hover:bg-walnut-100 hover:text-walnut-800" aria-label={`Uredi ${u.name}`} onClick={() => setEdit(u)}>
                      <Pencil className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(ROLE_HELP) as UserRole[]).map((r) => (
          <div key={r} className="rounded-2xl border border-walnut-200/70 bg-linen p-4 text-sm">
            <div className="font-semibold">{ROLE_LABEL[r]}</div>
            <p className="mt-1 text-walnut-600">{ROLE_HELP[r]}</p>
          </div>
        ))}
      </div>

      {edit && (
        <UserDialog
          u={edit === 'new' ? null : edit}
          self={edit !== 'new' && edit.id === user.id}
          busy={remote.busy}
          error={remote.error}
          onClose={() => {
            setEdit(null)
            remote.clearError()
          }}
          onSave={async (input) => {
            if (await remote.run(() => saveUserFn({ data: input }), input.id ? 'Korisnik je spremljen.' : 'Korisnik je dodan. Aktivacijski kod je gore na stranici.')) setEdit(null)
          }}
          onReset={async (id) => {
            if (await remote.run(() => resetUserFn({ data: { id } }), 'Lozinka je poništena. Novi aktivacijski kod je gore na stranici.')) setEdit(null)
          }}
        />
      )}
    </>
  )
}

function UserDialog({
  u,
  self,
  onClose,
  onSave,
  onReset,
  busy,
  error,
}: {
  u: UserAdminView | null
  self: boolean
  onClose: () => void
  onSave: (x: { id: string | null; username: string; name: string; role: UserRole; hrAccess: boolean; employeeId: string | null; active: boolean; phone: string; email: string }) => void
  onReset: (id: string) => void
  busy: boolean
  error: string | null
}) {
  const { employees } = useStore()
  const [name, setName] = useState(u?.name ?? '')
  const [username, setUsername] = useState(u?.username ?? '')
  const [role, setRole] = useState<UserRole>(u?.role ?? 'trgovac')
  const [employeeId, setEmp] = useState(u?.employeeId ?? '')
  const [active, setActive] = useState(u?.active ?? true)
  const [phone, setPhone] = useState(u?.phone ?? '')
  const [email, setEmail] = useState(u?.email ?? '')
  const [confirmReset, setConfirmReset] = useState(false)
  return (
    <Modal
      title={u ? `Korisnik: ${u.name}` : 'Novi korisnik'}
      onClose={onClose}
      footer={
        <>
          {error && <span className="mr-auto text-sm text-rose-700">{error}</span>}
          <Button variant="ghost" onClick={onClose}>
            Odustani
          </Button>
          <Button
            variant="copper"
            disabled={busy || !name.trim() || !username.trim()}
            onClick={() => onSave({ id: u?.id ?? null, username, name, role, hrAccess: role === 'admin' || role === 'uprava', employeeId: employeeId || null, active, phone, email })}
          >
            Spremi
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ime i prezime">
          <input className={inputCls} value={name} autoFocus onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Korisničko ime" hint="Mala slova bez kvačica, npr. trgovac5">
          <input className={`${inputCls} font-mono`} value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label="Uloga" hint={ROLE_HELP[role]}>
          <select className={inputCls} value={role} disabled={self} onChange={(e) => setRole(e.target.value as UserRole)}>
            {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={role === 'trgovac' ? 'Zaposlenik (obavezno)' : 'Povezani zaposlenik'} hint="Na njega se upisuju prodaje i radno vrijeme.">
          <select className={inputCls} value={employeeId} onChange={(e) => setEmp(e.target.value)}>
            <option value="">— nije povezan —</option>
            {employees
              .filter((e) => e.id !== '0')
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} · {e.role}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Telefon (za narudžbe dobavljačima)">
          <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="E-mail (za narudžbe dobavljačima)">
          <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {!self && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="size-4 accent-copper-500" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Može se prijaviti (isključite kad osoba više ne radi)
          </label>
        )}
      </div>
      {u && !self && (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-walnut-200 bg-walnut-50 px-4 py-3 text-sm">
          <KeyRound className="size-4 text-walnut-500" />
          <span className="flex-1 text-walnut-700">Zaboravljena lozinka? Poništite je i osoba dobija novi aktivacijski kod.</span>
          {confirmReset ? (
            <Button variant="danger" size="sm" disabled={busy} onClick={() => onReset(u.id)}>
              <UserX className="size-3.5" /> Potvrdi
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)}>
              Poništi lozinku
            </Button>
          )}
        </div>
      )}
    </Modal>
  )
}

const COMPANY_FIELDS: { key: keyof CompanyInfo; label: string; hint?: string }[] = [
  { key: 'name', label: 'Naziv (kratki)', hint: 'Npr. ARDOR namještaj' },
  { key: 'legalName', label: 'Puni pravni naziv', hint: 'Npr. ARDOR d.o.o. Banja Luka' },
  { key: 'address', label: 'Adresa' },
  { key: 'city', label: 'Poštanski broj i grad' },
  { key: 'phone', label: 'Telefon' },
  { key: 'email', label: 'E-mail' },
  { key: 'web', label: 'Web' },
  { key: 'jib', label: 'JIB' },
  { key: 'vatNumber', label: 'PDV broj' },
  { key: 'bankAccount', label: 'Žiro račun' },
  { key: 'bank', label: 'Banka' },
]

function CompanyForm() {
  const remote = useRemote(() => getCompanyFn(), [])
  const [c, setC] = useState<CompanyInfo>(DEFAULT_COMPANY)
  useEffect(() => {
    if (remote.data) setC(remote.data)
  }, [remote.data])
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <Building2 className="size-5 text-copper-600" /> Podaci o firmi
        </span>
      }
      subtitle="Ispisuju se na memorandumu narudžbi dobavljačima (zaglavlje i podnožje)."
    >
      {remote.error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{remote.error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {COMPANY_FIELDS.map((f) => (
          <Field key={f.key} label={f.label} hint={f.hint}>
            <input className={inputCls} value={c[f.key]} onChange={(e) => setC({ ...c, [f.key]: e.target.value })} />
          </Field>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <Button variant="copper" disabled={remote.busy || !remote.data} onClick={() => remote.run(() => saveCompanyFn({ data: c }), 'Podaci o firmi su spremljeni.')}>
          Spremi podatke
        </Button>
      </div>
    </Card>
  )
}

const fmtAt = (iso: string) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Sarajevo' })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  )
  return `${p.day}. ${p.month}. ${p.year}. ${p.hour}:${p.minute}`
}

/** Dnevnik izmjena i prijava (samo administrator). */
function AuditLog() {
  const { notify } = useStore()
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [entity, setEntity] = useState('')
  const [onlyFails, setOnlyFails] = useState(false)
  const [more, setMore] = useState<AuditRow[]>([])
  const [end, setEnd] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setQuery(q), 350)
    return () => clearTimeout(id)
  }, [q])
  const r = useRemote(() => auditListFn({ data: { q: query, entity, onlyFails } }), [query, entity, onlyFails])
  useEffect(() => {
    setMore([])
    setEnd(false)
  }, [query, entity, onlyFails])
  const rows = [...(r.data?.rows ?? []), ...more]
  const sec = r.data?.security

  const loadMore = async () => {
    const last = rows[rows.length - 1]
    if (!last) return
    const next = await auditListFn({ data: { q: query, entity, onlyFails, before: last.id } })
    setMore((m) => [...m, ...next.rows])
    if (next.rows.length < 200) setEnd(true)
  }
  const unlock = async (username: string) => {
    if (await r.run(() => unlockUserFn({ data: { username } }))) notify(`Račun ${username} je otključan.`)
  }

  return (
    <div className="space-y-5">
      {sec && (sec.locked.length > 0 || sec.failed24h > 0) && (
        <Card className={sec.locked.length ? 'border-rose-200 bg-rose-50/60' : 'border-amber-200 bg-amber-50/60'}>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <ShieldAlert className={`size-5 ${sec.locked.length ? 'text-rose-600' : 'text-amber-600'}`} />
            <span>
              <strong>{sec.failed24h}</strong> neuspjelih prijava u zadnja 24 sata.
              {sec.locked.length > 0 && ' Privremeno zaključano (15 min):'}
            </span>
            {sec.locked.map((u) => (
              <Button key={u} size="sm" variant="outline" onClick={() => unlock(u)}>
                <Unlock className="size-4" /> Otključaj {u}
              </Button>
            ))}
          </div>
        </Card>
      )}
      <Card
        title="Dnevnik izmjena"
        subtitle="Ko je i kada šta unio, promijenio ili obrisao, uključujući prijave. Čitanja i pregledi se ne bilježe."
        flush
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-walnut-100 px-5 py-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Traži: korisnik, broj narudžbe, artikal…" className={`${inputCls} max-w-xs`} />
          <select value={entity} onChange={(e) => setEntity(e.target.value)} className={`${inputCls} max-w-[220px]`}>
            <option value="">Sve cjeline</option>
            {(r.data?.entities ?? []).map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-walnut-700">
            <input type="checkbox" checked={onlyFails} onChange={(e) => setOnlyFails(e.target.checked)} /> Samo neuspjele prijave
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-walnut-500">
                <th className="px-5 py-2.5">Vrijeme</th>
                <th className="px-3 py-2.5">Ko</th>
                <th className="px-3 py-2.5">Cjelina</th>
                <th className="px-3 py-2.5">Radnja</th>
                <th className="px-3 py-2.5">Detalji</th>
                <th className="px-3 py-2.5">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-walnut-100">
              {rows.map((x) => (
                <tr key={x.id} className={x.ok ? '' : 'bg-rose-50/60'}>
                  <td suppressHydrationWarning className="whitespace-nowrap px-5 py-2 text-xs tabular text-walnut-600">{fmtAt(x.at)}</td>
                  <td className="px-3 py-2 font-medium">{x.userName || <span className="text-walnut-500">{x.subject || '—'}</span>}</td>
                  <td className="px-3 py-2">{x.entity}</td>
                  <td className={`px-3 py-2 ${x.ok ? '' : 'font-semibold text-rose-700'}`}>{x.action}</td>
                  <td className="max-w-md px-3 py-2 text-walnut-700">{x.detail}</td>
                  <td className="px-3 py-2 text-xs text-walnut-500">{x.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="px-5 py-8 text-sm text-walnut-500">{r.data ? 'Nema zapisa.' : 'Učitavam…'}</p>}
        </div>
        {rows.length >= 200 && !end && (
          <div className="border-t border-walnut-100 px-5 py-3">
            <Button size="sm" variant="ghost" onClick={loadMore}>
              Učitaj starije
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
