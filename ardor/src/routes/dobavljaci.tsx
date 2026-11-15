import { createFileRoute, Link } from '@tanstack/react-router'
import { Clock, Factory, Mail, Pencil, Phone, Plus } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../components/Modal'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  PageHeader,
  inputCls,
} from '../components/ui'
import { count, date, money } from '../lib/format'
import { useStore } from '../lib/store'
import type { Supplier } from '../lib/types'

export const Route = createFileRoute('/dobavljaci')({
  component: SuppliersPage,
})

function SupplierDialog({
  supplier,
  onClose,
}: {
  supplier: Supplier | null
  onClose: () => void
}) {
  const { saveSupplier, busy } = useStore()
  const [name, setName] = useState(supplier?.name ?? '')
  const [phone, setPhone] = useState(supplier?.phone ?? '')
  const [email, setEmail] = useState(supplier?.email ?? '')
  const [lead, setLead] = useState(String(supplier?.leadTimeDays ?? 14))
  return (
    <Modal
      title={supplier ? 'Uredi dobavljača' : 'Novi dobavljač'}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Odustani
          </Button>
          <Button type="submit" form="supplier-form" disabled={busy}>
            Spremi
          </Button>
        </div>
      }
    >
      <form
        id="supplier-form"
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault()
          const r = await saveSupplier({
            id: supplier?.id ?? null,
            name,
            phone,
            email,
            leadTimeDays: Number(lead) || 0,
          })
          if (r) onClose()
        }}
      >
        <Field label="Naziv" className="sm:col-span-2">
          <input
            className={inputCls}
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Telefon">
          <input
            className={inputCls}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <Field label="E-mail">
          <input
            className={inputCls}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field
          label="Rok isporuke (dana)"
          hint="Koristi se za planiranje narudžbi kod dobavljača."
        >
          <input
            className={inputCls}
            type="number"
            min={0}
            value={lead}
            onChange={(e) => setLead(e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  )
}

function SuppliersPage() {
  const { suppliers, products, receipts, today } = useStore()
  const [edit, setEdit] = useState<Supplier | 'new' | null>(null)
  const year = today.slice(0, 4)

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Šifrarnik"
        title="Dobavljači"
        description="Kontakti, rokovi isporuke i promet po dobavljaču."
        actions={
          <Button onClick={() => setEdit('new')}>
            <Plus className="size-4" /> Novi dobavljač
          </Button>
        }
      />

      {suppliers.length === 0 ? (
        <Card>
          <EmptyState icon={Factory} title="Još nema dobavljača">
            Dodajte dobavljače da biste ih mogli birati na artiklima i primkama.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((s) => {
            const items = products.filter((p) => p.supplierId === s.id)
            const low = items.filter(
              (p) => p.minStock > 0 && p.stock <= p.minStock,
            )
            const recs = receipts.filter((r) => r.supplierId === s.id)
            const yearValue = recs
              .filter((r) => r.date.startsWith(year))
              .reduce(
                (a, r) =>
                  a + r.lines.reduce((b, l) => b + l.qty * l.unitCost, 0),
                0,
              )
            const stockValue = items.reduce(
              (a, p) => a + Math.max(0, p.stock) * p.avgCost,
              0,
            )
            return (
              <Card key={s.id} className="flex flex-col">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-walnut-900 font-display text-lg font-semibold text-copper-400">
                    {s.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-lg font-semibold">
                      {s.name}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-walnut-500">
                      <Clock className="size-3.5" /> isporuka {s.leadTimeDays}{' '}
                      dana
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEdit(s)}
                    aria-label={`Uredi ${s.name}`}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
                <div className="mt-3 space-y-1 text-sm text-walnut-700">
                  {s.phone && (
                    <a
                      href={`tel:${s.phone}`}
                      className="flex items-center gap-2 hover:text-copper-600"
                    >
                      <Phone className="size-3.5" /> {s.phone}
                    </a>
                  )}
                  {s.email && (
                    <a
                      href={`mailto:${s.email}`}
                      className="flex items-center gap-2 hover:text-copper-600"
                    >
                      <Mail className="size-3.5" /> {s.email}
                    </a>
                  )}
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-walnut-50 p-3 text-xs">
                  <div>
                    <dt className="text-walnut-500">Artikala</dt>
                    <dd className="font-semibold tabular">
                      {count(items.length)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-walnut-500">Nabava {year}.</dt>
                    <dd className="font-semibold tabular">
                      {money(yearValue)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-walnut-500">Na zalihi</dt>
                    <dd className="font-semibold tabular">
                      {money(stockValue)}
                    </dd>
                  </div>
                </dl>
                <div className="mt-auto flex items-center justify-between pt-4 text-xs">
                  <span className="text-walnut-500">
                    {recs[0]
                      ? `Zadnji prijem ${date(recs[0].date)}`
                      : 'Još nema prijema'}
                  </span>
                  {low.length > 0 ? (
                    <Link to="/primke" search={{ nova: true }}>
                      <Badge tone="warn">{low.length} za naručiti</Badge>
                    </Link>
                  ) : (
                    <Badge tone="good">Zalihe u redu</Badge>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {edit && (
        <SupplierDialog
          supplier={edit === 'new' ? null : edit}
          onClose={() => setEdit(null)}
        />
      )}
    </div>
  )
}
