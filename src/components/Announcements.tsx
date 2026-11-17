import { Check, Megaphone, Plus } from 'lucide-react'
import { useState } from 'react'
import { date } from '../lib/format'
import type { InboxData } from '../lib/inbox'
import { useRemote } from '../lib/remote'
import { useStore } from '../lib/store'
import { confirmAnnouncementFn, getInboxFn, postAnnouncementFn } from '../server/api'
import { Modal } from './Modal'
import { Badge, Button, Card, Field, inputCls } from './ui'

/** Oglasna ploča na Pregledu: objave uprave i voditelja salona, uz potvrdu „pročitao/la sam”. */
export function AnnouncementsCard() {
  const remote = useRemote<InboxData>(() => getInboxFn(), [])
  const [writing, setWriting] = useState(false)
  const data = remote.data
  if (!data) return null
  return (
    <>
      <Card
        className="mb-6"
        title={
          <span className="flex items-center gap-2">
            <Megaphone className="size-5 text-copper-600" /> Oglasna ploča
          </span>
        }
        subtitle="Objave uprave i voditelja salona. Potvrdite da ste ih pročitali."
        action={
          data.canPost ? (
            <Button size="sm" variant="copper" onClick={() => setWriting(true)}>
              <Plus className="size-3.5" /> Nova objava
            </Button>
          ) : undefined
        }
        flush
      >
        {data.announcements.length === 0 ? (
          <p className="px-5 py-4 text-sm text-walnut-500">Još nema objava.</p>
        ) : (
          <ul className="divide-y divide-walnut-100">
            {data.announcements.slice(0, 5).map((a) => (
              <li key={a.id} className="px-5 py-3">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{a.title}</div>
                    {a.body && <p className="mt-0.5 whitespace-pre-line text-sm text-walnut-700">{a.body}</p>}
                    <div className="mt-1 text-xs text-walnut-500">
                      {a.authorName} · {date(a.createdAt)} · pročitalo {a.confirmedCount} od {a.total}
                    </div>
                  </div>
                  {a.confirmed ? (
                    <Badge tone="good">
                      <Check className="size-3.5" /> Pročitano
                    </Badge>
                  ) : (
                    <Button size="sm" variant="outline" disabled={remote.busy} onClick={() => remote.run(() => confirmAnnouncementFn({ data: { id: a.id } }), 'Potvrđeno: pročitali ste objavu.')}>
                      Pročitao/la sam
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {writing && (
        <NewAnnouncement
          onClose={() => setWriting(false)}
          onSaved={async () => {
            setWriting(false)
            await remote.reload()
          }}
        />
      )}
    </>
  )
}

function NewAnnouncement({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const { notify } = useStore()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setBusy(true)
    setError('')
    try {
      await postAnnouncementFn({ data: { title, body } })
      notify('Objava je poslana svim zaposlenicima.')
      await onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Objava nije spremljena.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Nova objava"
      subtitle="Objava se odmah šalje svim zaposlenicima u obavijestima i pojavljuje se na oglasnoj ploči."
      onClose={onClose}
      help={false}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Odustani
          </Button>
          <Button variant="copper" disabled={busy || !title.trim()} onClick={save}>
            {busy ? 'Šaljem…' : 'Objavi'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Naslov">
          <input className={inputCls} value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} placeholder="Npr. Akcija na sofe od ponedjeljka" />
        </Field>
        <Field label="Tekst" hint="Što treba znati, od kada vrijedi i što treba učiniti.">
          <textarea className={inputCls} rows={6} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-rose-700">{error}</p>}
      </div>
    </Modal>
  )
}
