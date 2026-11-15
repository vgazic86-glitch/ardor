import { createFileRoute } from '@tanstack/react-router'
import { Building2, Copy, KeyRound, Pencil, Plus, ShieldCheck, UserX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Modal } from '../components/Modal'
import { Badge, Button, Card, Field, inputCls, PageHeader, Segmented } from '../components/ui'
import { ROLE_LABEL } from '../lib/access'
import { useRemote } from '../lib/remote'
import { useStore } from '../lib/store'
import { DEFAULT_COMPANY, type CompanyInfo } from '../lib/types'
import type { UserAdminView, UserRole } from '../server/auth'
import { getCompanyFn, listUsersFn, resetUserFn, saveCompanyFn, saveUserFn } from '../server/api'

export const Route = createFileRoute('/korisnici')({
  validateSearch: (s: Record<string, unknown>): { tab?: 'firma' } => ({ tab: s.tab === 'firma' ? 'firma' : undefined }),
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
            onChange={(v) => navigate({ search: v === 'firma' ? { tab: 'firma' } : {} })}
            options={[
              { value: 'korisnici', label: 'Korisnici' },
              { value: 'firma', label: 'Podaci o firmi' },
            ]}
          />
        }
      />
      {tab === 'firma' ? <CompanyForm /> : <UsersList />}
    </div>
  )
}

const ROLE_HELP: Record<UserRole, string> = {
  admin: 'Sve, uključujući korisnike, plaće i troškove.',
  uprava: 'Sve osim upravljanja korisnicima. Plaće i troškovi samo uz posebno pravo.',
  trgovac: 'Prodaja, dostave, zalihe (bez nabavnih cijena), radno vrijeme i dokumenti. Ne vidi tuđe prodaje.',
}

function UsersList() {
  const { user, notify } = useStore()
  const remote = useRemote(() => listUsersFn(), [])
  const [edit, setEdit] = useState<UserAdminView | 'new' | null>(null)
  const users = remote.data ?? []
  const pending = users.filter((u) => u.active && !u.activated)

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
        subtitle={`${users.filter((u) => u.active).length} aktivnih`}
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
                <th className="px-3 py-2.5">Plaće i troškovi</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Zadnja prijava</th>
                <th className="w-12 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-walnut-100">
              {users.map((u) => (
                <tr key={u.id} className={u.active ? '' : 'opacity-50'}>
                  <td className="px-5 py-2.5 font-semibold">
                    {u.name} {u.id === user.id && <span className="text-xs font-normal text-walnut-500">(vi)</span>}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{u.username}</td>
                  <td className="px-3 py-2.5">
                    <Badge tone={u.role === 'admin' ? 'copper' : u.role === 'trgovac' ? 'info' : 'neutral'}>{ROLE_LABEL[u.role]}</Badge>
                  </td>
                  <td className="px-3 py-2.5">{u.hrAccess ? <ShieldCheck className="size-4 text-emerald-600" /> : <span className="text-walnut-300">—</span>}</td>
                  <td className="px-3 py-2.5">
                    {!u.active ? <Badge tone="bad">Isključen</Badge> : u.activated ? <Badge tone="good">Aktivan</Badge> : <Badge tone="warn">Čeka prvu prijavu</Badge>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-walnut-500">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('bs-BA', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </td>
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

      <div className="mt-5 grid gap-4 md:grid-cols-3">
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
  const [hrAccess, setHr] = useState(u?.hrAccess ?? false)
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
            onClick={() => onSave({ id: u?.id ?? null, username, name, role, hrAccess, employeeId: employeeId || null, active, phone, email })}
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
        {role === 'uprava' && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="size-4 accent-copper-500" checked={hrAccess} onChange={(e) => setHr(e.target.checked)} />
            Pristup plaćama, ugovorima, troškovima i zaradi (bez upravljačke lozinke)
          </label>
        )}
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
