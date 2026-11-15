import { createFileRoute, Link } from '@tanstack/react-router'
import { BookOpenText, Clock, Factory, Mail, Pencil, Phone, Plus, Send } from 'lucide-react'
import { ledgerRows, ledgerTotals } from '../../lib/ledger'
import { useRemote } from '../../lib/remote'
import { listLedgerFn } from '../../server/api'
import { useState } from 'react'
import { Modal } from '../../components/Modal'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  PageHeader,
  inputCls,
} from '../../components/ui'
import { count, date, money, money2 } from '../../lib/format'
import { useStore } from '../../lib/store'
import type { Supplier } from '../../lib/types'

export const Route = createFileRoute('/dobavljaci/')({
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
  const ledger = useRemote(() => listLedgerFn(), [])
  const balanceOf = (id: string) => ledgerTotals(ledgerRows(id, receipts, ledger.data ?? [])).balance
  const totalDebt = ledger.data ? suppliers.reduce((s, x) => s + Math.max(0, balanceOf(x.id)), 0) : null

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Šifrarnik"
        title="Dobavljači"
        description="Kontakti, rokovi isporuke, promet i kartica (zaduženja i uplate) po dobavljaču."
        actions={
          <>
            {totalDebt != null && (
              <div className="mr-2 text-right">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-walnut-500">Ukupno dugujemo</div>
                <div className="font-display text-2xl font-semibold tabular">{money2(totalDebt)}</div>
              </div>
            )}
            <Button onClick={() => setEdit('new')}>
              <Plus className="size-4" /> Novi dobavljač
            </Button>
          </>
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
                {ledger.data && (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-walnut-200/70 px-3 py-2 text-sm">
                    <span className="text-walnut-600">Saldo kartice</span>
                    <span className={`font-semibold tabular ${balanceOf(s.id) > 0.005 ? 'text-copper-700' : 'text-emerald-700'}`}>
                      {balanceOf(s.id) > 0.005 ? `dugujemo ${money2(balanceOf(s.id))}` : balanceOf(s.id) < -0.005 ? `preplata ${money2(-balanceOf(s.id))}` : 'izmireno'}
                    </span>
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <Link to="/dobavljaci/$id" params={{ id: s.id }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-walnut-200 bg-linen px-2.5 py-1.5 text-xs font-semibold text-walnut-900 shadow-sm hover:border-walnut-300 hover:bg-white">
                    <BookOpenText className="size-3.5 text-copper-600" /> Kartica
                  </Link>
                  <Link to="/nabava" search={{ nova: true, dobavljac: s.id }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-walnut-200 bg-linen px-2.5 py-1.5 text-xs font-semibold text-walnut-900 shadow-sm hover:border-walnut-300 hover:bg-white">
                    <Send className="size-3.5 text-copper-600" /> Naruči
                  </Link>
                </div>
                <div className="mt-auto flex items-center justify-between pt-4 text-xs">
                  <span className="text-walnut-500">
                    {recs[0]
                      ? `Zadnji prijem ${date(recs[0].date)}`
                      : 'Još nema prijema'}
                  </span>
                  {low.length > 0 ? (
                    <Link to="/nabava" search={{ nova: true, dobavljac: s.id }}>
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
