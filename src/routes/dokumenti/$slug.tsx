import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import {
  Archive,
  ArrowLeft,
  Download,
  Paperclip,
  Pencil,
  Printer,
} from 'lucide-react'
import { useState } from 'react'
import { DocumentEditor } from '../../components/DocumentEditor'
import { Markdown, outline } from '../../components/Markdown'
import { Button, Card, EmptyState } from '../../components/ui'
import { isAuthError, useAdmin } from '../../lib/admin'
import { fileSize, openDownload } from '../../lib/files'
import { date } from '../../lib/format'
import { useStore } from '../../lib/store'
import { archiveDocumentFn, downloadDocumentFileFn } from '../../server/api'
import { FileText } from 'lucide-react'

export const Route = createFileRoute('/dokumenti/$slug')({
  component: DocumentPage,
})

function DocumentPage() {
  const { slug } = Route.useParams()
  const { documents, employeeById, notify } = useStore()
  const { token, expire } = useAdmin()
  const router = useRouter()
  const navigate = useNavigate()
  const [edit, setEdit] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const doc = documents.find((d) => d.slug === slug)

  if (!doc)
    return (
      <Card>
        <EmptyState icon={FileText} title="Dokument nije pronađen">
          <Link
            to="/dokumenti"
            className="font-semibold text-copper-600 hover:underline"
          >
            Nazad na dokumente
          </Link>
        </EmptyState>
      </Card>
    )

  const toc = outline(doc.body)

  async function download() {
    try {
      openDownload(await downloadDocumentFileFn({ data: { id: doc!.id } }))
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Preuzimanje nije uspjelo.')
    }
  }

  async function archive() {
    if (!token) return setEdit(true)
    try {
      await archiveDocumentFn({ data: { token, id: doc!.id } })
      await router.invalidate()
      notify('Dokument je arhiviran.')
      navigate({ to: '/dokumenti' })
    } catch (e) {
      if (isAuthError(e)) expire()
      notify(e instanceof Error ? e.message : 'Greška.')
    }
  }

  return (
    <div className="rise">
      <div className="no-print mb-5 flex flex-wrap items-center gap-2">
        <Link
          to="/dokumenti"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-walnut-600 hover:bg-walnut-100"
        >
          <ArrowLeft className="size-4" /> Svi dokumenti
        </Link>
        <div className="ml-auto flex flex-wrap gap-2">
          {doc.file && (
            <Button variant="outline" onClick={download}>
              <Download className="size-4" /> {doc.file.name}{' '}
              <span className="text-xs font-normal text-walnut-500">
                {fileSize(doc.file.size)}
              </span>
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> Ispis / PDF
          </Button>
          <Button variant="outline" onClick={() => setEdit(true)}>
            <Pencil className="size-4" /> Uredi
          </Button>
          {confirm ? (
            <Button variant="danger" onClick={archive}>
              Potvrdi arhiviranje
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={() => setConfirm(true)}
              title="Arhiviraj dokument"
            >
              <Archive className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_260px]">
        <article className="rounded-2xl border border-walnut-200/70 bg-white px-6 py-8 shadow-card sm:px-12 sm:py-12">
          <header className="border-b border-walnut-200 pb-6">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-copper-600">
              {doc.category}
            </div>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
              {doc.title}
            </h1>
            {doc.summary && (
              <p className="mt-3 text-[15px] leading-relaxed text-walnut-600">
                {doc.summary}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-walnut-500">
              <span>Ardor — salon namještaja</span>
              <span>Verzija {doc.version}</span>
              <span>Ažurirano {date(doc.updatedAt)}</span>
              {doc.updatedBy && (
                <span>Uredio/la: {employeeById(doc.updatedBy).name}</span>
              )}
            </div>
          </header>
          {doc.body ? (
            <Markdown source={doc.body} />
          ) : (
            <div className="py-10 text-center text-sm text-walnut-500">
              <Paperclip className="mx-auto mb-2 size-6" />
              Ovaj dokument je priložen kao datoteka.{' '}
              {doc.file && (
                <button
                  onClick={download}
                  className="font-semibold text-copper-600 hover:underline"
                >
                  Otvori {doc.file.name}
                </button>
              )}
            </div>
          )}
        </article>

        {toc.length > 0 && (
          <aside className="no-print hidden xl:block">
            <div className="sticky top-24 rounded-2xl border border-walnut-200/70 bg-linen p-5 shadow-card">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-walnut-500">
                Sadržaj
              </div>
              <nav className="space-y-1">
                {toc.map((h) => (
                  <a
                    key={h.id}
                    href={`#${h.id}`}
                    className="block rounded-lg px-2 py-1 text-sm text-walnut-700 hover:bg-walnut-100 hover:text-walnut-900"
                  >
                    {h.text}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        )}
      </div>

      {edit && (
        <DocumentEditor
          doc={doc}
          onClose={() => setEdit(false)}
          onSaved={(s) => {
            setEdit(false)
            if (s !== slug)
              navigate({ to: '/dokumenti/$slug', params: { slug: s } })
          }}
        />
      )}
    </div>
  )
}
