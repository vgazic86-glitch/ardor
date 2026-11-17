import { Link, useRouter } from '@tanstack/react-router'
import { BookMarked, CheckCircle2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { ROLE_LABEL } from '../lib/access'
import { date } from '../lib/format'
import { MANUAL_CATEGORY } from '../lib/manuals'
import { useStore } from '../lib/store'
import { uploadManualFn } from '../server/api'
import { Badge, Button, Card } from './ui'

const roleNames = (roles: string[] = []) =>
  roles.length ? roles.map((r) => ROLE_LABEL[r as keyof typeof ROLE_LABEL] ?? r).join(', ') : 'samo administrator i uprava'

function toBase64(f: File) {
  return new Promise<string>((ok, fail) => {
    const r = new FileReader()
    r.onload = () => ok(String(r.result).split(',')[1] ?? '')
    r.onerror = () => fail(new Error('Datoteka se ne može pročitati.'))
    r.readAsDataURL(f)
  })
}

/** Priručnici po ulogama: administrator i uprava učitavaju PDF; svaka uloga vidi samo svoj (provjerava server). */
export function ManualsAdmin() {
  const { documents, full, notify } = useStore()
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const target = useRef<string | null>(null)
  if (!full) return null
  const manuals = documents.filter((d) => d.category === MANUAL_CATEGORY).sort((a, b) => a.sortOrder - b.sortOrder)
  if (!manuals.length) return null
  const done = manuals.filter((m) => m.file).length

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    const id = target.current
    if (!f || !id) return
    setError('')
    setBusy(id)
    try {
      const r = await uploadManualFn({ data: { id, file: { name: f.name, mime: f.type || 'application/pdf', dataB64: await toBase64(f) } } })
      await router.invalidate()
      notify(`Učitano: ${r.title}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Učitavanje nije uspjelo.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card
      className="mb-6"
      title={
        <span className="flex items-center gap-2">
          <BookMarked className="size-5 text-copper-600" /> Priručnici po ulogama
        </span>
      }
      subtitle="Svaki zaposlenik vidi samo priručnik svoje uloge; administrator i uprava vide sve. Ovu karticu vide samo administrator i uprava."
      action={<Badge tone={done === manuals.length ? 'good' : 'warn'}>{done} / {manuals.length} učitano</Badge>}
      flush
    >
      <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onFile} />
      <div className="divide-y divide-walnut-100">
        {manuals.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 font-semibold">
                {m.file ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" /> : <span className="size-4 shrink-0 rounded-full border-2 border-walnut-300" />}
                {m.file ? (
                  <Link to="/dokumenti/$slug" params={{ slug: m.slug }} className="truncate hover:text-copper-700 hover:underline">
                    {m.title}
                  </Link>
                ) : (
                  <span className="truncate">{m.title}</span>
                )}
              </div>
              <div className="ml-6 text-xs text-walnut-500">
                Vidi: {roleNames(m.roles)}
                {m.file ? ` · ${m.file.name} · učitano ${date(m.updatedAt)}` : ' · PDF još nije učitan'}
              </div>
            </div>
            <Button
              size="sm"
              variant={m.file ? 'outline' : 'copper'}
              disabled={!!busy}
              onClick={() => {
                target.current = m.id
                input.current?.click()
              }}
            >
              <Upload className="size-3.5" /> {busy === m.id ? 'Učitavam…' : m.file ? 'Zamijeni PDF' : 'Učitaj PDF'}
            </Button>
          </div>
        ))}
      </div>
      {error && <p className="px-5 pb-4 text-sm text-rose-700">{error}</p>}
    </Card>
  )
}
