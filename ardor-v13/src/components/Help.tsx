import { Link } from '@tanstack/react-router'
import { BookOpen, ChevronRight, CircleHelp, EyeOff, Lightbulb } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { HelpTopic } from '../lib/help'
import { Modal } from './Modal'

const KEY = 'ardor.pomoc.skriveno'

/** Da li je korisnik sakrio okvir s pomoći (pamti se na uređaju). */
export function useHelpHidden(): [boolean, (v: boolean) => void] {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY) === '1')
    } catch {
      /* nije važno */
    }
  }, [])
  const set = (v: boolean) => {
    setHidden(v)
    try {
      v ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY)
    } catch {
      /* nije važno */
    }
  }
  return [hidden, set]
}

/** Detaljne upute u zasebnom prozoru. */
export function HelpDetail({ topic, onClose }: { topic: HelpTopic; onClose: () => void }) {
  const [hidden, setHidden] = useHelpHidden()
  return (
    <Modal title={`Pomoć: ${topic.title}`} subtitle={topic.purpose} onClose={onClose} help={false}>
      <div className="space-y-5 text-sm">
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-copper-600">Šta se unosi</h3>
          <ul className="space-y-1.5">
            {topic.fields.map((f) => (
              <li key={f} className="flex gap-2">
                <ChevronRight className="mt-0.5 size-4 shrink-0 text-copper-500" />
                {f}
              </li>
            ))}
          </ul>
        </section>
        {topic.details.map((s) => (
          <section key={s.h}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-copper-600">{s.h}</h3>
            <ul className="space-y-1.5">
              {s.items.map((i) => (
                <li key={i} className="flex gap-2">
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-copper-500" />
                  {i}
                </li>
              ))}
            </ul>
          </section>
        ))}
        <div className="flex items-center justify-between rounded-xl bg-linen px-4 py-3 text-xs text-walnut-600">
          <span>
            Imate pitanje? Pitajte asistenta (dolje desno).
            {hidden && (
              <button onClick={() => setHidden(false)} className="ml-2 font-semibold text-copper-600 hover:underline">
                Vrati okvir pomoći u prozorima
              </button>
            )}
          </span>
          <Link to="/pomoc" onClick={onClose} className="font-semibold text-copper-600 hover:underline">
            Sve upute →
          </Link>
        </div>
      </div>
    </Modal>
  )
}

/** Uski okvir desno u prozoru: čemu služi i šta se unosi. */
export function HelpAside({ topic, onHide }: { topic: HelpTopic; onHide: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <aside className="hidden w-64 shrink-0 overflow-y-auto border-l border-walnut-200 bg-linen/60 px-4 py-5 lg:block">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-copper-600">
          <Lightbulb className="size-3.5" /> Pomoć
        </span>
        <button onClick={onHide} title="Sakrij pomoć" className="rounded p-1 text-walnut-400 hover:bg-walnut-100 hover:text-walnut-700">
          <EyeOff className="size-3.5" />
        </button>
      </div>
      <p className="text-[13px] leading-snug text-walnut-800">{topic.purpose}</p>
      <ul className="mt-3 space-y-2 text-[12.5px] leading-snug text-walnut-700">
        {topic.fields.map((f) => (
          <li key={f} className="flex gap-1.5">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-copper-400" />
            {f}
          </li>
        ))}
      </ul>
      <button onClick={() => setOpen(true)} className="mt-4 flex items-center gap-1 text-xs font-semibold text-copper-600 hover:underline">
        <BookOpen className="size-3.5" /> Detaljnije upute
      </button>
      {open && <HelpDetail topic={topic} onClose={() => setOpen(false)} />}
    </aside>
  )
}

/** Mali gumb "?" (za bočne prozore, uske ekrane ili kad je okvir sakriven). */
export function HelpButton({ topic }: { topic: HelpTopic }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg p-1.5 text-walnut-500 hover:bg-walnut-100 hover:text-copper-600"
        aria-label="Pomoć"
        title="Pomoć"
      >
        <CircleHelp className="size-5" />
      </button>
      {open && <HelpDetail topic={topic} onClose={() => setOpen(false)} />}
    </>
  )
}
