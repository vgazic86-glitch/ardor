import { useRouterState } from '@tanstack/react-router'
import { Loader2, RotateCcw, Send, Sparkles, X } from 'lucide-react'
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { askAssistantFn } from '../server/api'
import { useStore } from '../lib/store'

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

const BASE_KEY = 'ardor.asistent'

/** Razgovor pripada prijavljenom korisniku (na zajedničkom računaru u salonu ne smije ostati sljedećem). */
export function clearAssistantHistory() {
  try {
    for (const k of Object.keys(sessionStorage)) if (k.startsWith(BASE_KEY)) sessionStorage.removeItem(k)
  } catch {
    /* nije važno */
  }
}
const SUGGEST = [
  'Kako upisati bolovanje?',
  'Šta imamo slobodno od kauča?',
  'Kupac traži trosjed do 1500 KM — šta da ponudim?',
  'Kontakt voditelja salona',
  'Koji artikli su ispod minimuma?',
]

/** **podebljano**, *kurziv*, `kod` — bez HTML-a iz teksta. */
function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*|`[^`]+`)/g).map((p, i) => {
    if (/^\*\*.+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>
    if (/^(\*|_).+(\*|_)$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>
    if (/^`.+`$/.test(p)) return <code key={i} className="rounded bg-walnut-100 px-1 text-[12px]">{p.slice(1, -1)}</code>
    return <Fragment key={i}>{p}</Fragment>
  })
}

function Rich({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: string[] = []
  const flush = () => {
    if (list.length)
      blocks.push(
        <ul key={blocks.length} className="my-1 space-y-0.5 pl-4">
          {list.map((l, i) => (
            <li key={i} className="list-disc marker:text-copper-400">
              {inline(l)}
            </li>
          ))}
        </ul>,
      )
    list = []
  }
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/)
    if (m) list.push(m[1])
    else {
      flush()
      const h = line.match(/^#{1,4}\s+(.*)$/)
      if (h) blocks.push(<p key={blocks.length} className="mt-1 font-semibold">{inline(h[1])}</p>)
      else if (line.trim()) blocks.push(<p key={blocks.length} className="my-1">{inline(line)}</p>)
    }
  }
  flush()
  return <>{blocks}</>
}

/** AI asistent u donjem desnom kutu. */
export function Assistant() {
  const path = useRouterState({ select: (s) => s.location.pathname })
  const { user } = useStore()
  const KEY = `${BASE_KEY}:${user.id}`
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY)
      setMsgs(saved ? JSON.parse(saved) : [])
    } catch {
      /* nije važno */
    }
  }, [KEY])
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30)))
    } catch {
      /* nije važno */
    }
    end.current?.scrollIntoView({ block: 'end' })
  }, [msgs, busy])
  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 50)
  }, [open])

  const send = async (q: string) => {
    const question = q.trim()
    if (!question || busy) return
    const next: Msg[] = [...msgs, { role: 'user', content: question }]
    setMsgs(next)
    setText('')
    setError('')
    setBusy(true)
    try {
      const r = await askAssistantFn({ data: { messages: next, page: path } })
      setMsgs([...next, { role: 'assistant', content: r.text }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Greška u vezi.')
      setMsgs(msgs)
      setText(question)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="print:hidden">
      {open && (
        <div
          role="dialog"
          aria-label="ARDOR asistent"
          className="toast-in fixed bottom-24 right-4 z-40 flex h-[min(600px,calc(100vh-8rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-walnut-200 bg-paper shadow-2xl"
        >
          <div className="flex items-center justify-between bg-walnut-900 px-4 py-3 text-linen">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-copper-500">
                <Sparkles className="size-4" />
              </span>
              <div className="leading-tight">
                <div className="text-sm font-semibold">ARDOR asistent</div>
                <div className="text-[11px] text-walnut-300">Upute · savjeti za kupce · zalihe · kontakti</div>
              </div>
            </div>
            <div className="flex gap-1">
              {!!msgs.length && (
                <button onClick={() => setMsgs([])} title="Novi razgovor" className="rounded-lg p-1.5 text-walnut-300 hover:bg-walnut-800 hover:text-linen">
                  <RotateCcw className="size-4" />
                </button>
              )}
              <button onClick={() => setOpen(false)} aria-label="Zatvori asistenta" className="rounded-lg p-1.5 text-walnut-300 hover:bg-walnut-800 hover:text-linen">
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[13.5px] leading-snug">
            {!msgs.length && (
              <div>
                <p className="text-walnut-700">Zdravo! Pitajte me kako se nešto radi u aplikaciji, šta imamo na stanju, šta ponuditi kupcu ili broj kolege.</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {SUGGEST.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-full border border-walnut-200 bg-linen px-3 py-1 text-left text-xs text-walnut-700 hover:border-copper-400 hover:text-copper-700">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="ml-8 rounded-2xl rounded-br-sm bg-copper-500 px-3 py-2 text-white">
                  {m.content}
                </div>
              ) : (
                <div key={i} className="mr-4 rounded-2xl rounded-bl-sm bg-linen px-3 py-2 text-walnut-900">
                  <Rich text={m.content} />
                </div>
              ),
            )}
            {busy && (
              <div className="mr-4 flex items-center gap-2 rounded-2xl bg-linen px-3 py-2 text-walnut-500">
                <Loader2 className="size-4 animate-spin" /> Razmišljam…
              </div>
            )}
            {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
            <div ref={end} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(text)
            }}
            className="flex items-end gap-2 border-t border-walnut-200 bg-paper px-3 py-3"
          >
            <textarea
              ref={input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(text)
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder="Upišite pitanje…"
              className="max-h-28 min-h-[38px] flex-1 resize-none rounded-xl border border-walnut-200 bg-white px-3 py-2 text-sm outline-none focus:border-copper-400"
            />
            <button type="submit" disabled={busy || !text.trim()} aria-label="Pošalji" className="grid size-[38px] place-items-center rounded-xl bg-copper-500 text-white disabled:opacity-40">
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Zatvori asistenta' : 'Otvori asistenta'}
        className="fixed bottom-5 right-4 z-40 flex items-center gap-2 rounded-full bg-walnut-900 py-3 pl-3 pr-4 text-sm font-semibold text-linen shadow-xl ring-4 ring-copper-500/20 transition hover:bg-walnut-800"
      >
        {open ? <X className="size-5" /> : <Sparkles className="size-5 text-copper-400" />}
        <span className="hidden sm:inline">{open ? 'Zatvori' : 'Asistent'}</span>
      </button>
    </div>
  )
}
