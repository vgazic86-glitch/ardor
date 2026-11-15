import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, BookOpenText, FileSpreadsheet, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../../components/Modal'
import { Badge, Button, Card, EmptyState, Field, inputCls, PageHeader, Stat } from '../../components/ui'
import { date, money2, parseAmount } from '../../lib/format'
import { ledgerRows, ledgerTotals, type LedgerRow } from '../../lib/ledger'
import { useRemote } from '../../lib/remote'
import { useStore } from '../../lib/store'
import { LEDGER_KIND_LABEL, type LedgerEntry, type LedgerKind } from '../../lib/types'
import { deleteLedgerEntryFn, listLedgerFn, saveLedgerEntryFn } from '../../server/api'

export const Route = createFileRoute('/dobavljaci/$id')({ component: SupplierCardPage })

const KIND_TONE: Record<LedgerRow['kind'], string> = {
  primka: 'neutral',
  zaduzenje: 'warn',
  uplata: 'good',
  odobrenje: 'info',
  pocetno: 'violet',
}

function SupplierCardPage() {
  const { id } = Route.useParams()
  const { supplierById, receipts, today } = useStore()
  const supplier = supplierById(id)
  const remote = useRemote(() => listLedgerFn(), [])
  const [from, setFrom] = useState(`${today.slice(0, 4)}-01-01`)
  const [to, setTo] = useState(today)
  const [edit, setEdit] = useState<LedgerEntry | { kind: LedgerKind } | null>(null)

  const all = useMemo(() => ledgerRows(id, receipts, remote.data ?? []), [id, receipts, remote.data])
  const before = all.filter((r) => r.date < from)
  const opening = before.length ? before[before.length - 1].balance : 0
  const rows = all.filter((r) => r.date >= from && r.date <= to)
  const period = ledgerTotals(rows)
  const closing = opening + period.debit - period.credit
  const balanceNow = all.length ? all[all.length - 1].balance : 0

  if (!supplier)
    return (
      <Card>
        <EmptyState icon={BookOpenText} title="Dobavljač ne postoji">
          <Link to="/dobavljaci" className="font-semibold text-copper-600">
            Nazad na dobavljače
          </Link>
        </EmptyState>
      </Card>
    )

  async function exportXlsx() {
    const { exportTables } = await import('../../lib/excel')
    await exportTables(`kartica-${supplier!.name.replace(/[^\p{L}\p{N}]+/gu, '-')}-${from}-${to}.xlsx`, [
      {
        sheet: 'Kartica',
        title: `Kartica dobavljača: ${supplier!.name} (${date(from)} – ${date(to)})`,
        header: ['Datum', 'Vrsta', 'Dokument', 'Opis', 'Duguje (zaduženje)', 'Potražuje (uplata)', 'Saldo'],
        widths: [12, 20, 24, 36, 18, 18, 16],
        rows: [
          [{ date: from }, { bold: 'Početni saldo' }, '', '', null, null, opening],
          ...rows.map((r) => [
            { date: r.date },
            LEDGER_KIND_LABEL[r.kind],
            r.document,
            r.note,
            r.debit || null,
            r.credit || null,
            r.balance,
          ]),
          [null, { bold: 'Ukupno / završni saldo' }, '', '', period.debit, period.credit, closing],
        ],
      },
    ])
  }

  return (
    <div className="rise">
      <Link to="/dobavljaci" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-walnut-600 hover:text-walnut-900">
        <ArrowLeft className="size-4" /> Dobavljači
      </Link>
      <PageHeader
        eyebrow="Kartica dobavljača"
        title={supplier.name}
        description="Primke se automatski knjiže kao zaduženje (s PDV-om 17 %). Račune, uplate, odobrenja i početno stanje unosite ručno."
        actions={
          <>
            <Button variant="outline" onClick={exportXlsx}>
              <FileSpreadsheet className="size-4" /> Excel
            </Button>
            <Button variant="outline" onClick={() => setEdit({ kind: 'zaduzenje' })}>
              <Plus className="size-4" /> Zaduženje
            </Button>
            <Button variant="copper" onClick={() => setEdit({ kind: 'uplata' })}>
              <Plus className="size-4" /> Uplata
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Trenutni saldo" value={money2(balanceNow)} tone={balanceNow > 0.005 ? 'warn' : 'good'} hint={balanceNow > 0.005 ? 'dugujemo dobavljaču' : balanceNow < -0.005 ? 'preplata / avans' : 'izmireno'} />
        <Stat label="Zaduženja u periodu" value={money2(period.debit)} />
        <Stat label="Uplate i odobrenja u periodu" value={money2(period.credit)} />
        <Stat label="Saldo na kraju perioda" value={money2(closing)} tone="accent" hint={`početni saldo ${money2(opening)}`} />
      </div>

      {remote.error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{remote.error}</p>}

      <Card flush>
        <div className="flex flex-wrap items-end gap-3 border-b border-walnut-200/70 px-5 py-3">
          <Field label="Od">
            <input type="date" className={`${inputCls} py-1.5`} value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Do">
            <input type="date" className={`${inputCls} py-1.5`} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Button variant="ghost" size="sm" onClick={() => setFrom('2000-01-01')}>
            Od početka
          </Button>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setEdit({ kind: 'pocetno' })}>
            Početno stanje
          </Button>
        </div>
        {!remote.data ? (
          <div className="px-5 py-10 text-center text-sm text-walnut-500">Učitavam…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-walnut-50 text-left text-[11px] uppercase tracking-wider text-walnut-500">
                <tr>
                  <th className="px-5 py-2.5">Datum</th>
                  <th className="px-3 py-2.5">Vrsta</th>
                  <th className="px-3 py-2.5">Dokument / opis</th>
                  <th className="px-3 py-2.5 text-right">Duguje</th>
                  <th className="px-3 py-2.5 text-right">Potražuje</th>
                  <th className="px-3 py-2.5 text-right">Saldo</th>
                  <th className="w-20 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-walnut-100">
                <tr className="bg-walnut-50/50 text-walnut-600">
                  <td className="px-5 py-2.5 tabular">{date(from)}</td>
                  <td className="px-3 py-2.5" colSpan={4}>
                    Početni saldo perioda
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular">{money2(opening)}</td>
                  <td />
                </tr>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-walnut-500">
                      U ovom periodu nema promjena.
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.key} className="hover:bg-walnut-50/60">
                    <td className="px-5 py-2.5 tabular">{date(r.date)}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={KIND_TONE[r.kind]}>{LEDGER_KIND_LABEL[r.kind]}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{r.document || '—'}</div>
                      {r.note && <div className="text-xs text-walnut-500">{r.note}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular">{r.debit ? money2(r.debit) : ''}</td>
                    <td className="px-3 py-2.5 text-right tabular text-emerald-700">{r.credit ? money2(r.credit) : ''}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular">{money2(r.balance)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {r.entry && (
                        <button className="rounded p-1 text-walnut-400 hover:bg-walnut-100 hover:text-walnut-800" aria-label="Uredi stavku" onClick={() => setEdit(r.entry)}>
                          <Pencil className="size-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-walnut-200 bg-walnut-50 font-semibold">
                <tr>
                  <td className="px-5 py-3" colSpan={3}>
                    Ukupno u periodu / završni saldo
                  </td>
                  <td className="px-3 py-3 text-right tabular">{money2(period.debit)}</td>
                  <td className="px-3 py-3 text-right tabular">{money2(period.credit)}</td>
                  <td className="px-3 py-3 text-right tabular">{money2(closing)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {edit && (
        <LedgerDialog
          supplierId={id}
          entry={'id' in edit ? edit : null}
          kind={edit.kind}
          busy={remote.busy}
          error={remote.error}
          onClose={() => {
            setEdit(null)
            remote.clearError()
          }}
          onSave={async (input) => {
            if (await remote.run(() => saveLedgerEntryFn({ data: input }), 'Stavka kartice je spremljena.')) setEdit(null)
          }}
          onDelete={async (entryId) => {
            if (await remote.run(() => deleteLedgerEntryFn({ data: { id: entryId } }), 'Stavka je obrisana.')) setEdit(null)
          }}
        />
      )}
    </div>
  )
}

function LedgerDialog({
  supplierId,
  entry,
  kind: initialKind,
  onClose,
  onSave,
  onDelete,
  busy,
  error,
}: {
  supplierId: string
  entry: LedgerEntry | null
  kind: LedgerKind
  onClose: () => void
  onSave: (e: { id: string | null; supplierId: string; date: string; kind: LedgerKind; amount: number; document: string; note: string }) => void
  onDelete: (id: string) => void
  busy: boolean
  error: string | null
}) {
  const { today } = useStore()
  const [kind, setKind] = useState<LedgerKind>(entry?.kind ?? initialKind)
  const [day, setDay] = useState(entry?.date ?? today)
  const [amount, setAmount] = useState(entry ? String(entry.amount).replace('.', ',') : '')
  const [doc, setDoc] = useState(entry?.document ?? '')
  const [note, setNote] = useState(entry?.note ?? '')
  const [confirm, setConfirm] = useState(false)
  return (
    <Modal
      title={entry ? 'Uredi stavku kartice' : `Nova stavka: ${LEDGER_KIND_LABEL[kind].toLowerCase()}`}
      onClose={onClose}
      footer={
        <>
          {error && <span className="mr-auto text-sm text-rose-700">{error}</span>}
          {entry &&
            (confirm ? (
              <Button variant="danger" disabled={busy} onClick={() => onDelete(entry.id)}>
                Potvrdi brisanje
              </Button>
            ) : (
              <Button variant="danger" onClick={() => setConfirm(true)}>
                <Trash2 className="size-4" /> Obriši
              </Button>
            ))}
          <Button variant="ghost" onClick={onClose}>
            Odustani
          </Button>
          <Button
            variant="copper"
            disabled={busy || !amount}
            onClick={() => onSave({ id: entry?.id ?? null, supplierId, date: day, kind, amount: parseAmount(amount), document: doc, note })}
          >
            Spremi
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vrsta">
          <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as LedgerKind)}>
            {(['zaduzenje', 'uplata', 'odobrenje', 'pocetno'] as const).map((k) => (
              <option key={k} value={k}>
                {LEDGER_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Datum">
          <input type="date" className={inputCls} value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
        <Field
          label="Iznos s PDV-om (KM)"
          hint={kind === 'pocetno' ? 'Pozitivno = dugujemo dobavljaču; negativno = preplata.' : kind === 'zaduzenje' ? 'Npr. račun za uslugu ili robu koja nije išla kroz primku.' : undefined}
        >
          <input className={`${inputCls} text-right`} inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label={kind === 'uplata' ? 'Broj izvoda / naloga' : 'Broj dokumenta'}>
          <input className={inputCls} value={doc} onChange={(e) => setDoc(e.target.value)} />
        </Field>
        <Field label="Opis" className="sm:col-span-2">
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      {entry && <p className="mt-3 text-xs text-walnut-500">Unio/la: {entry.createdByName || '—'}</p>}
    </Modal>
  )
}
