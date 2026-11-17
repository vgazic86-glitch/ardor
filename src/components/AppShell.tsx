import { Link, useNavigate, useRouter, useRouterState } from '@tanstack/react-router'
import { canSee, ROLE_LABEL, type Area } from '../lib/access'
import { computeAlerts } from '../lib/alerts'
import { useInstall } from '../lib/pwa'
import { logoutFn, pingFn, securityFn } from '../server/api'
import { ChangePasswordDialog } from './ChangePasswordDialog'
import {
  BarChart3,
  BookOpen,
  Calculator,
  LockKeyhole,
  Boxes,
  CheckCircle2,
  ChevronsUpDown,
  BookOpenCheck,
  Smartphone,
  Contact,
  Wallet,
  Bell,
  ListChecks,
  Clock,
  KeyRound,
  LogOut,
  Send,
  ShieldCheck,
  ClipboardCheck,
  ClipboardList,
  Factory,
  LayoutDashboard,
  Menu,
  Package,
  PackagePlus,
  Plus,
  Search,
  Truck,
  Users,
  X,
  XCircle,
  LifeBuoy,
  Wrench,
  Tablet,
  ScanLine,
  Hourglass,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useStore } from '../lib/store'
import { CommandPalette } from './CommandPalette'
import { HeaderClock } from './HeaderClock'
import { QrScanner } from './QrScanner'
import { HelpButton } from './Help'
import { Assistant } from './Assistant'
import { helpForPath } from '../lib/help'
import { waitingOrders } from '../lib/stats'
import { Avatar } from './ui'
import { Logo } from './Logo'

type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  badge?: 'orders' | 'deliveries' | 'low' | 'tasks' | 'waiting'
  area: Area
}

const groups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Prodaja',
    items: [
      { to: '/', label: 'Pregled', icon: LayoutDashboard, area: 'pregled' },
      { to: '/zadaci', label: 'Zadaci', icon: ListChecks, badge: 'tasks', area: 'zadaci' },
      { to: '/narudzbe', label: 'Prodaja', icon: ClipboardList, badge: 'orders', area: 'narudzbe' },
      { to: '/narudzbe-kupaca', label: 'Narudžbe kupaca', icon: Hourglass, badge: 'waiting', area: 'narudzbe' },
      { to: '/kupci', label: 'Kupci', icon: Contact, area: 'kupci' },
      { to: '/reklamacije', label: 'Reklamacije', icon: Wrench, area: 'reklamacije' },
      { to: '/katalog', label: 'Katalog za kupca', icon: Tablet, area: 'pregled' },
      { to: '/dostave', label: 'Dostave', icon: Truck, badge: 'deliveries', area: 'dostave' },
      { to: '/pazar', label: 'Dnevni pazar', icon: Wallet, area: 'pazar' },
    ],
  },
  {
    title: 'Roba',
    items: [
      { to: '/zalihe', label: 'Zalihe', icon: Package, badge: 'low', area: 'zalihe' },
      { to: '/nabava', label: 'Nabava od dobavljača', icon: Send, area: 'nabava' },
      { to: '/primke', label: 'Prijem robe', icon: PackagePlus, area: 'primke' },
      { to: '/artikli', label: 'Artikli', icon: Boxes, area: 'artikli' },
      { to: '/inventura', label: 'Inventura', icon: ClipboardCheck, area: 'inventura' },
    ],
  },
  {
    title: 'Poslovanje',
    items: [
      { to: '/izvjestaji', label: 'Izvještaji', icon: BarChart3, area: 'izvjestaji' },
      { to: '/troskovi', label: 'Troškovi i zarada', icon: Calculator, area: 'troskovi' },
      { to: '/kuf', label: 'Ulazni računi (PDV)', icon: BookOpenCheck, area: 'izvjestaji' },
      { to: '/dobavljaci', label: 'Dobavljači i kartice', icon: Factory, area: 'dobavljaci' },
    ],
  },
  {
    title: 'Ljudi i dokumenti',
    items: [
      { to: '/zaposlenici', label: 'Zaposlenici', icon: Users, area: 'zaposlenici' },
      { to: '/radno-vrijeme', label: 'Radno vrijeme', icon: Clock, area: 'radno' },
      { to: '/kadrovska', label: 'Kadrovska', icon: LockKeyhole, area: 'kadrovska' },
      { to: '/dokumenti', label: 'Dokumenti', icon: BookOpen, area: 'dokumenti' },
      { to: '/korisnici', label: 'Korisnici i pristup', icon: ShieldCheck, area: 'korisnici' },
      { to: '/pomoc', label: 'Pomoć i upute', icon: LifeBuoy, area: 'pregled' },
    ],
  },
]

export { Logo }

function useBadges() {
  const { orders, products, today, openTasks } = useStore()
  return {
    tasks: openTasks,
    orders: orders.filter((o) =>
      ['potvrđena', 'u_izradi', 'spremna'].includes(o.status),
    ).length,
    deliveries: orders.filter(
      (o) =>
        o.delivery?.date === today &&
        o.delivery.status !== 'dostavljeno' &&
        o.status !== 'otkazana',
    ).length,
    low: products.filter((p) => p.minStock > 0 && p.stock <= p.minStock).length,
    waiting: waitingOrders(orders, products).size,
  }
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname })
  const badges = useBadges()
  const { user } = useStore()
  const visible = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => canSee(user, i.area)) }))
    .filter((g) => g.items.length > 0)
  return (
    <nav className="flex flex-col gap-5" aria-label="Glavna navigacija">
      {visible.map((g) => (
        <div key={g.title}>
          <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-walnut-500">
            {g.title}
          </div>
          <div className="flex flex-col gap-0.5">
            {g.items.map(({ to, label, icon: Icon, badge }) => {
              const active = to === '/' ? path === '/' : path === to || path.startsWith(`${to}/`)
              const n = badge ? badges[badge] : 0
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={onNavigate}
                  className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors ${
                    active
                      ? 'bg-white/[0.08] text-linen'
                      : 'text-walnut-300 hover:bg-white/[0.04] hover:text-linen'
                  }`}
                >
                  {active && (
                    <span className="absolute -left-4 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-copper-400" />
                  )}
                  <Icon
                    className={`size-[17px] ${active ? 'text-copper-400' : 'text-walnut-500 group-hover:text-copper-400'}`}
                  />
                  <span className="flex-1">{label}</span>
                  {n > 0 && (
                    <span
                      className={`min-w-5 rounded-full px-1.5 py-px text-center text-[10.5px] font-bold tabular ${
                        badge === 'low' || badge === 'tasks' || badge === 'waiting'
                          ? 'bg-copper-500/25 text-copper-400'
                          : 'bg-white/10 text-walnut-200'
                      }`}
                    >
                      {n}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

function UserSwitcher() {
  const { me, employees, setMe, user, restricted } = useStore()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState(false)
  const pwa = useInstall()
  async function logout() {
    await logoutFn()
    await router.invalidate()
  }
  return (
    <div className="relative">
      {open && (
        <>
          <button className="fixed inset-0 z-10 cursor-default" aria-label="Zatvori" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 z-20 mb-2 max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-walnut-800 p-1.5 shadow-lift">
            {!restricted && me && (
              <>
                <div className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-walnut-400">
                  Prodaju unosi
                </div>
                {employees.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => {
                      setMe(e.id)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${e.id === me.id ? 'bg-white/10 text-linen' : 'text-walnut-200 hover:bg-white/5'}`}
                  >
                    <Avatar employee={e} size="sm" />
                    <span className="flex-1 truncate">{e.name}</span>
                    {e.id === me.id && <CheckCircle2 className="size-4 text-copper-400" />}
                  </button>
                ))}
                <div className="my-1.5 h-px bg-white/10" />
              </>
            )}
            <button
              onClick={() => {
                setPw(true)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-walnut-200 hover:bg-white/5"
            >
              <KeyRound className="size-4 text-walnut-400" /> Promijeni lozinku
            </button>
            {pwa.canInstall && (
              <button
                onClick={() => {
                  pwa.install()
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-copper-300 hover:bg-white/5"
              >
                <Smartphone className="size-4" /> Instaliraj aplikaciju
              </button>
            )}
            {pwa.iosHint && (
              <div className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-xs text-walnut-300">
                <Smartphone className="mt-0.5 size-4 shrink-0" /> Na iPhoneu: Dijeli → „Dodaj na početni zaslon”
              </div>
            )}
            <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-walnut-200 hover:bg-white/5">
              <LogOut className="size-4 text-walnut-400" /> Odjava
            </button>
          </div>
        </>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.04] p-3 text-left transition-colors hover:bg-white/[0.08]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-copper-500 text-sm font-bold text-white">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-linen">{user.name}</div>
          <div className="truncate text-[11px] text-walnut-400">
            {ROLE_LABEL[user.role]}
            {!restricted && me ? ` · prodaja: ${me.name}` : ''}
          </div>
        </div>
        <ChevronsUpDown className="size-4 text-walnut-400" />
      </button>
      {pw && <ChangePasswordDialog onClose={() => setPw(false)} />}
    </div>
  )
}

/** Zvonce: šta danas traži pažnju (zadaci, dostave, kašnjenja, zalihe, ponude, dugovanja). */
/** Pomoć za trenutnu stranicu. */
function PageHelp() {
  const path = useRouterState({ select: (s) => s.location.pathname })
  const topic = helpForPath(path)
  return topic ? <HelpButton key={topic.id} topic={topic} /> : null
}

/** Sigurnosna upozorenja za administratora (zaključani računi, neuspjele prijave). */
function useSecurity(on: boolean) {
  const [s, setS] = useState<{ failed24h: number; locked: string[] } | null>(null)
  useEffect(() => {
    if (!on) return
    let alive = true
    const load = () => securityFn().then((r) => alive && setS(r)).catch(() => {})
    load()
    const id = setInterval(load, 120_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [on])
  return s
}

function NotificationBell() {
  const { orders, products, today, openTasks, restricted, me, user, priceChanges } = useStore()
  const [open, setOpen] = useState(false)
  const security = useSecurity(user.role === 'admin')
  const alerts = computeAlerts({ orders, products, today, openTasks, ownEmployeeId: restricted ? (me?.id ?? null) : null, priceChanges })
  if (security && (security.locked.length || security.failed24h >= 3))
    alerts.unshift({
      key: 'sigurnost',
      count: security.locked.length || 1,
      title: security.locked.length ? `Zaključan račun: ${security.locked.join(', ')}` : `${security.failed24h} neuspjelih prijava (24 h)`,
      detail: 'Previše pogrešnih lozinki — provjerite dnevnik prijava.',
      tone: security.locked.length ? 'bad' : 'warn',
      to: '/korisnici',
      search: { tab: 'dnevnik' },
    })
  const urgent = alerts.filter((a) => a.tone === 'bad' || a.key === 'zadaci').reduce((s, a) => s + a.count, 0)
  const total = alerts.reduce((s, a) => s + a.count, 0)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-walnut-700 hover:bg-walnut-100"
        aria-label={`Obavijesti (${total})`}
        aria-expanded={open}
      >
        <Bell className={`size-5 ${urgent ? 'bell-ring' : ''}`} />
        {total > 0 && (
          <span className={`absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full px-1 text-center text-[10px] font-bold leading-[18px] text-white ${urgent ? 'bg-rose-600' : 'bg-copper-500'}`}>
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-label="Zatvori" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-walnut-200 bg-white shadow-lift">
            <div className="border-b border-walnut-100 px-4 py-3 font-display font-semibold">Obavijesti</div>
            {alerts.length === 0 ? (
              <p className="px-4 py-5 text-sm text-walnut-500">Nema ništa hitno. Sve je pod kontrolom.</p>
            ) : (
              <ul className="max-h-[60vh] divide-y divide-walnut-100 overflow-y-auto">
                {alerts.map((a) => (
                  <li key={a.key}>
                    <Link to={a.to} search={a.search as never} onClick={() => setOpen(false)} className="flex items-start gap-3 px-4 py-3 hover:bg-walnut-50">
                      <span className={`mt-1 size-2.5 shrink-0 rounded-full ${a.tone === 'bad' ? 'bg-rose-500' : a.tone === 'warn' ? 'bg-amber-500' : a.tone === 'info' ? 'bg-sky-500' : 'bg-copper-500'}`} />
                      <span>
                        <span className="block text-sm font-semibold text-walnut-900">{a.title}</span>
                        <span className="block text-xs text-walnut-500">{a.detail}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Toaster() {
  const { toast, dismissToast, error, clearError } = useStore()
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(dismissToast, 3200)
    return () => clearTimeout(t)
  }, [toast, dismissToast])
  return (
    <div
      className="pointer-events-none fixed bottom-20 right-5 z-[60] flex w-[min(380px,calc(100%-2.5rem))] flex-col gap-2"
      aria-live="polite"
    >
      {error && (
        <div className="toast-in pointer-events-auto flex items-start gap-3 rounded-xl border border-rose-200 bg-white p-3.5 shadow-lift">
          <XCircle className="mt-0.5 size-5 shrink-0 text-rose-600" />
          <div className="flex-1 text-sm">
            <div className="font-semibold text-rose-800">Nije spremljeno</div>
            <div className="text-walnut-700">{error}</div>
          </div>
          <button
            onClick={clearError}
            className="rounded p-0.5 text-walnut-400 hover:text-walnut-700"
            aria-label="Zatvori"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
      {toast && (
        <div
          key={toast.id}
          className="toast-in pointer-events-auto flex items-center gap-3 rounded-xl bg-walnut-900 p-3.5 text-sm text-linen shadow-lift"
        >
          <CheckCircle2 className="size-5 shrink-0 text-copper-400" />
          <span className="flex-1">{toast.text}</span>
        </div>
      )}
    </div>
  )
}

/** Otkucaj svake minute: drži prijavu živom dok je aplikacija otvorena; zatvaranjem prestaje. */
function useHeartbeat() {
  const router = useRouter()
  const { openTasks } = useStore()
  const known = useRef(openTasks)
  known.current = openTasks
  useEffect(() => {
    let alive = true
    const beat = async () => {
      try {
        const r = await pingFn()
        if (alive && r.openTasks !== known.current) router.invalidate()
      } catch {
        // prijava je istekla (npr. aplikacija dugo zatvorena) — prikaži ekran za prijavu
        if (alive) router.invalidate()
      }
    }
    const id = setInterval(beat, 60_000)
    const onVisible = () => document.visibilityState === 'visible' && beat()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [router])
}

export function AppShell({ children }: { children: ReactNode }) {
  useHeartbeat()
  const [open, setOpen] = useState(false)
  const [palette, setPalette] = useState(false)
  const [scan, setScan] = useState(false)
  const { busy, user } = useStore()
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_1fr]">
      {busy && (
        <div className="fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden bg-copper-100">
          <div className="busy-bar h-full w-1/3 bg-copper-500" />
        </div>
      )}

      <aside className="sidebar-bg sticky top-0 hidden h-screen flex-col gap-7 overflow-hidden px-4 py-6 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-56 opacity-[0.07] [mask-image:linear-gradient(to_top,black,transparent)]"
          style={{
            backgroundImage: 'url(/brand/ardor-znak.svg)',
            backgroundSize: '34px 34px',
          }}
        />
        <Link to="/" aria-label="Pregled" className="leaf relative block bg-white px-4 py-3 shadow-card transition-transform hover:scale-[1.02]">
          <Logo className="h-9 w-full" />
        </Link>
        <div className="relative -mx-1 flex-1 overflow-y-auto px-1">
          <NavLinks />
        </div>
        <UserSwitcher />
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <button
            className="absolute inset-0 bg-walnut-950/50"
            aria-label="Zatvori izbornik"
            onClick={() => setOpen(false)}
          />
          <div className="sidebar-bg absolute left-0 top-0 flex h-full w-72 flex-col gap-7 p-5">
            <div className="flex items-center justify-between">
              <Link to="/" aria-label="Pregled" onClick={() => setOpen(false)}>
                <Logo light className="h-9" />
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="text-walnut-300"
                aria-label="Zatvori"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <UserSwitcher />
          </div>
        </div>
      )}

      <div className="min-w-0">
        <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-walnut-200/60 bg-paper/80 px-4 py-3 backdrop-blur-md sm:px-8">
          <button
            className="text-walnut-700 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Otvori izbornik"
          >
            <Menu className="size-6" />
          </button>
          <Link to="/" aria-label="Pregled" className="lg:hidden">
            <Logo className="h-8" />
          </Link>
          <button
            onClick={() => setPalette(true)}
            className="group hidden min-w-0 w-full max-w-sm items-center gap-2.5 rounded-xl border border-walnut-200 bg-linen/80 py-2 pl-3 pr-2 text-left text-sm text-walnut-400 shadow-sm transition-colors hover:border-walnut-300 md:flex"
          >
            <Search className="size-4 text-walnut-500" />
            <span className="flex-1 truncate">Pretraži narudžbe, kupce, artikle…</span>
            <kbd className="rounded-md border border-walnut-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold text-walnut-500">
              Ctrl K
            </kbd>
          </button>
          <button
            onClick={() => setPalette(true)}
            className="ml-auto rounded-lg p-2 text-walnut-700 hover:bg-walnut-100 md:hidden"
            aria-label="Pretraga"
          >
            <Search className="size-5" />
          </button>
          <button onClick={() => setScan(true)} className="rounded-lg p-2 text-walnut-700 hover:bg-walnut-100 md:hidden" aria-label="Skeniraj QR naljepnicu">
            <ScanLine className="size-5" />
          </button>
          <div className="flex items-center gap-2 md:ml-auto">
            <HeaderClock />
            <PageHelp />
            <NotificationBell />
            {canSee(user, 'primke') && (
            <button
              onClick={() =>
                navigate({ to: '/primke', search: { nova: true } })
              }
              className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-walnut-200 bg-linen px-3 py-2 text-sm font-semibold text-walnut-900 shadow-sm hover:bg-white sm:inline-flex"
            >
              <PackagePlus className="size-4 text-copper-600" /> Prijem robe
            </button>
            )}
            <button
              onClick={() =>
                navigate({ to: '/narudzbe', search: { nova: true } })
              }
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-walnut-900 px-3 py-2 text-sm font-semibold text-linen shadow-sm hover:bg-walnut-800"
            >
              <Plus className="size-4" />{' '}
              <span className="hidden sm:inline">Nova prodaja</span>
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </main>
      </div>

      {palette && <CommandPalette onClose={() => setPalette(false)} />}
      {scan && <QrScanner onClose={() => setScan(false)} />}
      <Assistant />
      <Toaster />
    </div>
  )
}
