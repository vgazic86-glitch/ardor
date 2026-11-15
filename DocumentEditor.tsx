import { Eye, Paperclip, PenLine } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { isAuthError, useAdmin } from '../lib/admin'
import { ACCEPT, fileSize, toUpload } from '../lib/files'
import { useStore } from '../lib/store'
import { DOCUMENT_CATEGORIES, type CompanyDocument } from '../lib/types'
import { saveDocumentFn } from '../server/api'
import { Markdown } from './Markdown'
import { Modal } from './Modal'
import { Button, Field, Segmented, inputCls } from './ui'

function Editor({
  doc,
  onClose,
  onSaved,
}: {
  doc: CompanyDocument | null
  onClose: () => void
  onSaved: (slug: string) => void
}) {
  const { token, expire } = useAdmin()
  const { me, notify } = useStore()
  const router = useRouter()
  const [title, setTitle] = useState(doc?.title ?? '')
  const [category, setCategory] = useState(
    doc?.category ?? DOCUMENT_CATEGORIES[0],
  )
  const [summary, setSummary] = useState(doc?.summary ?? '')
  const [version, setVersion] = useState(doc?.version ?? '1.0')
  const [body, setBody] = useState(
    doc?.body ?? '## 1. Uvod\n\nTekst dokumenta…\n',
  )
  const [file, setFile] = useState<File | null>(null)
  const [tab, setTab] = useState<'pisanje' | 'pregled'>('pisanje')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const upload = file ? await toUpload(file) : null
      const r = await saveDocumentFn({
        data: {
          token: token ?? 'sesija',
          actorId: me?.id ?? null,
          id: doc?.id ?? null,
          title,
          category,
          summary,
          body,
          version,
          file: upload,
        },
      })
      await router.invalidate()
      notify('Dokument je spremljen.')
      onSaved(r.slug)
    } catch (e) {
      if (isAuthError(e)) expire()
      setErr(e instanceof Error ? e.message : 'Greška pri spremanju.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form id="doc-form" onSubmit={save} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_200px_90px]">
        <Field label="Naslov">
          <input
            className={inputCls}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Kategorija">
          <select
            className={inputCls}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {[...new Set([...DOCUMENT_CATEGORIES, category])].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Verzija">
          <input
            className={inputCls}
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Kratak opis (prikazuje se na popisu)">
        <input
          className={inputCls}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </Field>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-walnut-700">Sadržaj</span>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              {
                value: 'pisanje',
                label: (
                  <span className="inline-flex items-center gap-1">
                    <PenLine className="size-3" /> Pisanje
                  </span>
                ),
              },
              {
                value: 'pregled',
                label: (
                  <span className="inline-flex items-center gap-1">
                    <Eye className="size-3" /> Pregled
                  </span>
                ),
              },
            ]}
          />
        </div>
        {tab === 'pisanje' ? (
          <>
            <textarea
              className={`${inputCls} min-h-[340px] font-mono text-[13px] leading-relaxed`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-walnut-500">
              Oblikovanje: <code>## Naslov</code>, <code>- stavka</code>,{' '}
              <code>1. korak</code>, <code>**podebljano**</code>,{' '}
              <code>&gt; napomena</code>, tablica s <code>| a | b |</code>,
              kontrolna lista <code>- [ ] stavka</code>.
            </p>
          </>
        ) : (
          <div className="max-h-[420px] overflow-y-auto rounded-xl border border-walnut-200 bg-white px-6 py-2">
            <Markdown source={body} />
          </div>
        )}
      </div>
      <Field
        label="Prilog (npr. potpisani PDF, Word verzija) — nije obavezno"
        hint={
          doc?.file
            ? `Trenutni prilog: ${doc.file.name}. Novi prilog ga zamjenjuje.`
            : 'Najviše 4 MB.'
        }
      >
        <span className="flex items-center gap-2">
          <Paperclip className="size-4 text-walnut-400" />
          <input
            type="file"
            accept={ACCEPT}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-walnut-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-walnut-800"
          />
          {file && (
            <span className="text-xs text-walnut-500">
              {fileSize(file.size)}
            </span>
          )}
        </span>
      </Field>
      {err && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {err}
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-walnut-200 pt-4">
        <Button variant="ghost" onClick={onClose}>
          Odustani
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Spremam…' : 'Spremi dokument'}
        </Button>
      </div>
    </form>
  )
}

export function DocumentEditor({
  doc,
  onClose,
  onSaved,
}: {
  doc: CompanyDocument | null
  onClose: () => void
  onSaved: (slug: string) => void
}) {
  return (
    <Modal
      wide
      title={doc ? `Uredi: ${doc.title}` : 'Novi dokument'}
      onClose={onClose}
    >
      <Editor doc={doc} onClose={onClose} onSaved={onSaved} />
    </Modal>
  )
}
