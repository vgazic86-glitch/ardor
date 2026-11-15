import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpen,
  FileText,
  Paperclip,
  Plus,
  Search,
} from 'lucide-react'
import { useState } from 'react'
import { DocumentEditor } from '../../components/DocumentEditor'
import { Button, Card, Chip, EmptyState, PageHeader } from '../../components/ui'
import { date } from '../../lib/format'
import { useStore } from '../../lib/store'

export const Route = createFileRoute('/dokumenti/')({
  component: DocumentsPage,
})

const readMinutes = (md: string) =>
  Math.max(1, Math.round(md.split(/\s+/).length / 200))

function DocumentsPage() {
  const { documents } = useStore()
  const navigate = useNavigate()
  const [cat, setCat] = useState('sve')
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const categories = [...new Set(documents.map((d) => d.category))]
  const list = documents.filter(
    (d) =>
      (cat === 'sve' || d.category === cat) &&
      (!q ||
        `${d.title} ${d.summary} ${d.body}`
          .toLowerCase()
          .includes(q.toLowerCase())),
  )

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Ljudi i dokumenti"
        title="Opći dokumenti"
        description="Pravila, standardi i priručnici salona na jednom mjestu. Svaki zaposlenik ih može čitati i odštampati; uređivanje je zaštićeno upravljačkom lozinkom."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Novi dokument
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-wrap gap-1.5">
          {['sve', ...categories].map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
              {c === 'sve' ? 'Svi dokumenti' : c}
            </Chip>
          ))}
        </div>
        <label className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-walnut-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pretraži u dokumentima…"
            className="w-full rounded-lg border border-walnut-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-copper-400 focus:outline-none"
          />
        </label>
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState icon={BookOpen} title="Nema dokumenata">
            Promijenite pretragu ili dodajte novi dokument.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((d) => (
            <Link
              key={d.id}
              to="/dokumenti/$slug"
              params={{ slug: d.slug }}
              className="group flex flex-col rounded-2xl border border-walnut-200/70 bg-linen p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-walnut-300 hover:shadow-lift"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-walnut-900 text-copper-400">
                  <FileText className="size-5" />
                </span>
                <span className="rounded-full bg-walnut-100 px-2.5 py-0.5 text-[11px] font-semibold text-walnut-600">
                  {d.category}
                </span>
              </div>
              <h2 className="mt-4 font-display text-xl font-semibold leading-snug group-hover:text-copper-700">
                {d.title}
              </h2>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-walnut-600">
                {d.summary}
              </p>
              <div className="mt-4 flex items-center gap-3 border-t border-walnut-200/70 pt-3 text-[11px] text-walnut-500">
                <span>v{d.version}</span>
                <span>·</span>
                <span>
                  {d.body ? `${readMinutes(d.body)} min čitanja` : 'datoteka'}
                </span>
                {d.file && (
                  <span className="inline-flex items-center gap-1">
                    <Paperclip className="size-3" /> prilog
                  </span>
                )}
                <span className="ml-auto">ažurirano {date(d.updatedAt)}</span>
                <ArrowRight className="size-3.5 text-copper-500 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating && (
        <DocumentEditor
          doc={null}
          onClose={() => setCreating(false)}
          onSaved={(slug) => {
            setCreating(false)
            navigate({ to: '/dokumenti/$slug', params: { slug } })
          }}
        />
      )}
    </div>
  )
}
