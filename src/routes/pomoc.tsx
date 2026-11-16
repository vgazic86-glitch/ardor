import { createFileRoute, Link } from '@tanstack/react-router'
import { BookOpen, ChevronRight, Keyboard, MessageCircle, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { HelpDetail } from '../components/Help'
import { Card, PageHeader } from '../components/ui'
import { areaOf, canSee } from '../lib/access'
import { HELP, type HelpTopic } from '../lib/help'
import { useStore } from '../lib/store'

export const Route = createFileRoute('/pomoc')({ component: HelpPage })

function HelpPage() {
  const { user } = useStore()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<HelpTopic | null>(null)
  const topics = useMemo(() => {
    const mine = HELP.filter((t) => {
      const a = t.route ? areaOf(t.route) : null
      return !a || canSee(user, a)
    })
    const s = q.trim().toLowerCase()
    if (!s) return mine
    return mine.filter((t) =>
      [t.title, t.purpose, ...t.fields, ...t.details.flatMap((d) => [d.h, ...d.items])].join(' ').toLowerCase().includes(s),
    )
  }, [q, user])

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Pomoć"
        title="Upute za korištenje"
        description="Kratko po cjelinama. Klik na karticu otvara detaljne upute. U svakom prozoru za unos desno piše šta se unosi i čemu služi."
      />
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <Tip icon={MessageCircle} title="AI asistent" text="Dolje desno — pitajte kako se nešto radi, stanje zaliha, kontakt kolege ili savjet za kupca." />
        <Tip icon={Keyboard} title="Brza pretraga" text="Ctrl+K (⌘K) — skok na bilo koju stranicu, narudžbu ili artikal." />
        <Tip icon={BookOpen} title="Pomoć u prozoru" text="Okvir desno možete sakriti; ikona ? u zaglavlju prozora ga vraća." />
      </div>
      <label className="mb-5 flex max-w-md items-center gap-2 rounded-xl border border-walnut-200 bg-paper px-3 py-2.5">
        <Search className="size-4 text-walnut-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Traži u uputama… (npr. avans, PDV, bolovanje)" className="w-full bg-transparent text-sm outline-none" />
      </label>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {topics.map((t) => (
          <Card key={t.id} className="flex flex-col">
            <button onClick={() => setOpen(t)} className="text-left">
              <h3 className="font-display text-xl font-semibold">{t.title}</h3>
              <p className="mt-1 text-sm text-walnut-700">{t.purpose}</p>
              <ul className="mt-3 space-y-1 text-[13px] text-walnut-600">
                {t.fields.slice(0, 3).map((f) => (
                  <li key={f} className="flex gap-1.5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-copper-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
            <div className="mt-auto flex items-center justify-between pt-4 text-xs font-semibold">
              <button onClick={() => setOpen(t)} className="text-copper-600 hover:underline">
                Detaljnije upute
              </button>
              {t.route && (
                <Link to={t.route as '/'} className="flex items-center text-walnut-500 hover:text-walnut-800">
                  Otvori <ChevronRight className="size-3.5" />
                </Link>
              )}
            </div>
          </Card>
        ))}
        {!topics.length && <p className="text-sm text-walnut-600">Ništa nije pronađeno. Pitajte asistenta dolje desno.</p>}
      </div>
      {open && <HelpDetail topic={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function Tip({ icon: Icon, title, text }: { icon: typeof BookOpen; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-walnut-200 bg-linen/70 p-4">
      <Icon className="mt-0.5 size-5 shrink-0 text-copper-500" />
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[13px] leading-snug text-walnut-600">{text}</div>
      </div>
    </div>
  )
}
