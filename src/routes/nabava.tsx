import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Lightbulb,
  CheckCircle2,
  FileDown,
  Mail,
  PackageCheck,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../components/Modal'
import { ReceiptDialog } from '../components/ReceiptDialog'
import { PurchaseSuggestions } from '../components/PurchaseSuggestions'
import { Badge, Button, Card, Chip, EmptyState, Field, inputCls, PageHeader } from '../components/ui'
import { openDownload } from '../lib/files'
import { count, date, money2, parseAmount } from '../lib/format'
import { useRemote } from '../lib/remote'
import { useStore } from '../lib/store'
import { PURCHASE_STATUS_LABEL, type PurchaseLine, type PurchaseOrder, type PurchaseStatus } from '../lib/types'
import {
  deletePurchaseOrderFn,
  getCompanyFn,
  linkPurchaseReceiptFn,
  listPurchaseOrdersFn,
  purchaseOrderPdfFn,
  savePurchaseOrderFn,
  setPurchaseStatusFn,
} from '../server/api'

export const Route = createFileRoute('/nabava')({
  validateSearch: (s: Record<string, unknown>): { nova?: boolean; dobavljac?: string } => ({
    nova: s.nova === true || s.nova === 'true' ? true : undefined,
    dobavljac: typeof s.dobavljac === 'string' ? s.dobavljac : undefined,
  }),
  component: PurchasePage,
})

const STATUS_TONE: Record<PurchaseStatus, string> = {
  nacrt: 'neutral',
  zakljucena: 'copper',
  zaprimljena: 'good',
  otkazana: 'bad',
}

function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{PURCHASE_STATUS_LABEL[status]}</Badge>
}

function PurchasePage() {
  const { supplierById, user } = useStore()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const remote = useRemote(() => listPurchaseOrdersFn(), [])
  const company = useRemote(() => getCompanyFn(), [])
  const [status, setStatus] = useState<'sve' | PurchaseStatus>('sve')
  const [sup, setSup] = useState(search.dobavljac ?? 'svi')
  const [editing, setEditing] = useState<PurchaseOrder | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [suggest, setSuggest] = useState(false)
  const orders = remote.data ?? []
  const list = orders.filter((o) => (status === 'sve' || o.status === status) && (sup === 'svi' || o.supplierId === sup))
  const open = orders.find((o) => o.id === openId) ?? null
  const usedSuppliers = [...new Set(orders.map((o) => o.supplierId))]
  const missingCompany = company.data && (!company.data.phone || !company.data.jib)

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Nabava"
        title="Narudžbe dobavljačima"
        description="Sastavite narudžbu, zaključite je i pošaljite dobavljaču kao PDF na službenom memorandumu. Kad roba stigne, primka se popuni iz narudžbe."
        actions={
          <>
            <Button variant="outline" onClick={() => setSuggest(true)}>
              <Lightbulb className="size-4" /> Prijedlog narudžbe
            </Button>
            <Button variant="copper" onClick={() => navigate({ search: { nova: true } })}>
              <Plus className="size-4" /> Nova narudžba
            </Button>
          </>
        }
      />

      {missingCompany && (
        <div className="mb-5 rounded-xl border border-copper-200 bg-copper-50 px-4 py-3 text-sm text-walnut-800">
          Na memorandumu još nedostaju telefon, JIB ili žiro račun firme.{' '}
          {user.role === 'admin' ? (
            <Link to="/korisnici" search={{ tab: 'firma' }} className="font-semibold text-copper-700 underline">
              Dopunite podatke o firmi
            </Link>
          ) : (
            'Administrator ih može dopuniti pod „Korisnici i pristup”.'
          )}
        </div>
      )}

      {remote.error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{remote.error}</p>}

      <Card flush>
        <div className="flex flex-wrap items-center gap-2 border-b border-walnut-200/70 px-5 py-3">
          {(['sve', 'nacrt', 'zakljucena', 'zaprimljena', 'otkazana'] as const).map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
              {s === 'sve' ? 'Sve' : PURCHASE_STATUS_LABEL[s]}
              <span className="ml-1.5 opacity-60">{s === 'sve' ? orders.length : orders.filter((o) => o.status === s).length}</span>
            </Chip>
          ))}
          <select className={`${inputCls} ml-auto w-auto py-1.5`} value={sup} onChange={(e) => setSup(e.target.value)} aria-label="Dobavljač">
            <option value="svi">Svi dobavljači</option>
            {usedSuppliers.map((id) => (
              <option key={id} value={id}>
                {supplierById(id)?.name ?? '—'}
              </option>
            ))}
          </select>
        </div>
        {!remote.data ? (
          <div className="px-5 py-10 text-center text-sm text-walnut-500">Učitavam…</div>
        ) : list.length === 0 ? (
          <EmptyState icon={Send} title="Nema narudžbi">
            Kliknite „Nova narudžba”, odaberite dobavljača i dodajte artikle.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-walnut-50 text-left text-[11px] uppercase tracking-wider text-walnut-500">
                <tr>
                  <th className="px-5 py-2.5">Broj</th>
                  <th className="px-3 py-2.5">Datum</th>
                  <th className="px-3 py-2.5">Dobavljač</th>
                  <th className="px-3 py-2.5 text-right">Stavki</th>
                  <th className="px-3 py-2.5 text-right">Količina</th>
                  <th className="px-3 py-2.5">Izradio/la</th>
                  <th className="px-5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-walnut-100">
                {list.map((o) => (
                  <tr key={o.id} className="cursor-pointer hover:bg-walnut-50/70" onClick={() => setOpenId(o.id)}>
                    <td className="px-5 py-3 font-semibold text-walnut-900">{o.number}</td>
                    <td className="px-3 py-3 tabular">{date(o.date)}</td>
                    <td className="px-3 py-3">{supplierById(o.supplierId)?.name ?? '—'}</td>
                    <td className="px-3 py-3 text-right tabular">{o.lines.length}</td>
                    <td className="px-3 py-3 text-right tabular">{count(o.lines.reduce((s, l) => s + l.qty, 0))}</td>
                    <td className="px-3 py-3 text-walnut-600">{o.createdByName}</td>
                    <td className="px-5 py-3">
                      <PurchaseStatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {(search.nova || editing) && (
        <PurchaseDialog
          order={editing}
          defaultSupplier={search.dobavljac}
          busy={remote.busy}
          onClose={() => {
            setEditing(null)
            navigate({ search: {} })
          }}
          onSave={async (input) => {
            const r = await remote.run(() => savePurchaseOrderFn({ data: input }), input.id ? 'Narudžba je spremljena.' : 'Narudžba je kreirana kao nacrt.')
            if (r) {
              setEditing(null)
              navigate({ search: {} })
              setOpenId(r.id)
            }
            return !!r
          }}
          error={remote.error}
        />
      )}

      {open && !editing && (
        <PurchaseDrawer
          order={open}
          busy={remote.busy}
          error={remote.error}
          onClose={() => {
            setOpenId(null)
            remote.clearError()
          }}
          onEdit={() => setEditing(open)}
          onStatus={(s, ok) => remote.run(() => setPurchaseStatusFn({ data: { id: open.id, status: s } }), ok)}
          onDelete={async () => {
            if (await remote.run(() => deletePurchaseOrderFn({ data: { id: open.id } }), 'Nacrt je obrisan.')) setOpenId(null)
          }}
          onReceived={(receiptId) => remote.run(() => linkPurchaseReceiptFn({ data: { id: open.id, receiptId } }), 'Narudžba je označena kao zaprimljena.')}
        />
      )}
      {suggest && <PurchaseSuggestions onClose={() => setSuggest(false)} onCreated={() => remote.reload()} />}
    </div>
  )
}

type DraftLine = { productId: string | null; code: string; name: string; qty: string; unit: string; price: string; note: string }

function PurchaseDialog({
  order,
  defaultSupplier,
  onClose,
  onSave,
  busy,
  error,
}: {
  order: PurchaseOrder | null
  defaultSupplier?: string
  onClose: () => void
  onSave: (o: {
    id: string | null
    supplierId: string
    date: string
    deliveryBy: string | null
    note: string
    lines: PurchaseLine[]
  }) => Promise<boolean>
  busy: boolean
  error: string | null
}) {
  const { suppliers, products, today, productById } = useStore()
  const [supplierId, setSupplierId] = useState(order?.supplierId ?? defaultSupplier ?? suppliers[0]?.id ?? '')
  const [day, setDay] = useState(order?.date ?? today)
  const [deliveryBy, setDeliveryBy] = useState(order?.deliveryBy ?? '')
  const [note, setNote] = useState(order?.note ?? '')
  const [lines, setLines] = useState<DraftLine[]>(
    () =>
      order?.lines.map((l) => ({
        ...l,
        qty: String(l.qty),
        price: l.price != null ? String(l.price).replace('.', ',') : '',
      })) ?? [],
  )
  const [pick, setPick] = useState('')
  const supplierProducts = useMemo(
    () => products.filter((p) => p.supplierId === supplierId).sort((a, b) => a.name.localeCompare(b.name, 'bs')),
    [products, supplierId],
  )
  const update = (i: number, patch: Partial<DraftLine>) => setLines((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const fromProduct = (id: string, qty?: number): DraftLine => {
    const p = productById(id)
    return {
      productId: id,
      code: p.sku,
      name: p.name,
      qty: String(qty ?? 1),
      unit: 'kom',
      price: p.purchasePrice ? String(p.purchasePrice).replace('.', ',') : '',
      note: '',
    }
  }
  function addProduct(id: string) {
    if (!id) return
    const i = lines.findIndex((l) => l.productId === id)
    if (i >= 0) update(i, { qty: String((Number(lines[i].qty) || 0) + 1) })
    else setLines((l) => [...l, fromProduct(id)])
    setPick('')
  }
  function fillLow() {
    const low = supplierProducts.filter((p) => p.minStock > 0 && p.stock <= p.minStock && !lines.some((l) => l.productId === p.id))
    setLines((l) => [...l, ...low.map((p) => fromProduct(p.id, Math.max(1, p.minStock * 2 - p.stock)))])
  }
  const lowCount = supplierProducts.filter((p) => p.minStock > 0 && p.stock <= p.minStock).length
  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * parseAmount(l.price || '0'), 0)

  return (
    <Modal
      wide
      title={order ? `Uredi narudžbu ${order.number}` : 'Nova narudžba dobavljaču'}
      subtitle="Spremljena narudžba je nacrt dok je ne zaključite."
      onClose={onClose}
      footer={
        <>
          {error && <span className="mr-auto text-sm text-rose-700">{error}</span>}
          <Button variant="ghost" onClick={onClose}>
            Odustani
          </Button>
          <Button
            variant="copper"
            disabled={busy || !supplierId || lines.length === 0}
            onClick={() =>
              onSave({
                id: order?.id ?? null,
                supplierId,
                date: day,
                deliveryBy: deliveryBy || null,
                note,
                lines: lines.map((l) => ({
                  productId: l.productId,
                  code: l.code,
                  name: l.name,
                  qty: Number(l.qty) || 0,
                  unit: l.unit,
                  price: l.price.trim() ? parseAmount(l.price) : null,
                  note: l.note,
                })),
              })
            }
          >
            Spremi nacrt
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Dobavljač">
          <select className={inputCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Datum narudžbe">
          <input type="date" className={inputCls} value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
        <Field label="Željeni rok isporuke" hint="Neobavezno">
          <input type="date" className={inputCls} value={deliveryBy} onChange={(e) => setDeliveryBy(e.target.value)} />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-2">
        <Field label="Dodaj artikal ovog dobavljača" className="min-w-64 flex-1">
          <select className={inputCls} value={pick} onChange={(e) => addProduct(e.target.value)}>
            <option value="">— odaberite artikal —</option>
            {supplierProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} · {p.name} (stanje {p.stock})
              </option>
            ))}
          </select>
        </Field>
        <Button
          variant="outline"
          onClick={() => setLines((l) => [...l, { productId: null, code: '', name: '', qty: '1', unit: 'kom', price: '', note: '' }])}
        >
          <Plus className="size-4" /> Stavka izvan kataloga
        </Button>
        {lowCount > 0 && (
          <Button variant="outline" onClick={fillLow}>
            Dodaj ispod minimuma ({lowCount})
          </Button>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {lines.length === 0 && (
          <p className="rounded-xl border border-dashed border-walnut-200 px-4 py-6 text-center text-sm text-walnut-500">
            Još nema stavki. Odaberite artikal iznad ili dodajte stavku koje nema u katalogu.
          </p>
        )}
        {lines.map((l, i) => (
          <div key={i} className="rounded-xl border border-walnut-200/80 bg-white p-3">
            <div className="grid gap-2 sm:grid-cols-[90px_1fr_80px_70px_100px_auto]">
              <input className={inputCls} placeholder="Šifra" value={l.code} onChange={(e) => update(i, { code: e.target.value })} aria-label="Šifra" />
              <input
                className={`${inputCls} font-medium`}
                placeholder="Naziv artikla (npr. ugaona garnitura, dimenzije, boja)"
                value={l.name}
                onChange={(e) => update(i, { name: e.target.value })}
                aria-label="Naziv"
              />
              <input className={`${inputCls} text-right`} inputMode="numeric" value={l.qty} onChange={(e) => update(i, { qty: e.target.value.replace(/\D/g, '') })} aria-label="Količina" />
              <input className={inputCls} value={l.unit} onChange={(e) => update(i, { unit: e.target.value })} aria-label="Jedinica mjere" />
              <input
                className={`${inputCls} text-right`}
                inputMode="decimal"
                placeholder="Cijena"
                value={l.price}
                onChange={(e) => update(i, { price: e.target.value })}
                aria-label="Nabavna cijena bez PDV-a"
              />
              <button className="rounded-lg p-2 text-walnut-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Ukloni stavku" onClick={() => setLines((x) => x.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" />
              </button>
            </div>
            <input
              className={`${inputCls} mt-2 border-dashed text-xs`}
              placeholder="Napomena uz stavku (npr. boja nogu, strana ugla, provjeriti rok)"
              value={l.note}
              onChange={(e) => update(i, { note: e.target.value })}
              aria-label="Napomena uz stavku"
            />
          </div>
        ))}
      </div>

      {lines.length > 0 && (
        <div className="mt-3 flex justify-end gap-6 text-sm text-walnut-600">
          <span>
            Količina: <b className="text-walnut-900">{count(lines.reduce((s, l) => s + (Number(l.qty) || 0), 0))}</b>
          </span>
          {total > 0 && (
            <span>
              Orijentaciono bez PDV-a: <b className="text-walnut-900">{money2(total)}</b>
            </span>
          )}
        </div>
      )}

      <Field label="Napomena za dobavljača (nedoumice, uslovi isporuke…)" className="mt-5">
        <textarea className={`${inputCls} min-h-20`} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </Modal>
  )
}

function PurchaseDrawer({
  order,
  onClose,
  onEdit,
  onStatus,
  onDelete,
  onReceived,
  busy,
  error,
}: {
  order: PurchaseOrder
  onClose: () => void
  onEdit: () => void
  onStatus: (s: PurchaseStatus, ok: string) => Promise<unknown>
  onDelete: () => void
  onReceived: (receiptId: string) => Promise<unknown>
  busy: boolean
  error: string | null
}) {
  const { supplierById, receipts } = useStore()
  const supplier = supplierById(order.supplierId)
  const [receiving, setReceiving] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const receipt = order.receiptId ? receipts.find((r) => r.id === order.receiptId) : null
  const total = order.lines.reduce((s, l) => s + (l.price ?? 0) * l.qty, 0)

  async function pdf() {
    setPdfBusy(true)
    setPdfError(null)
    try {
      const f = await purchaseOrderPdfFn({ data: { id: order.id } })
      openDownload({ name: f.name, mime: 'application/pdf', dataB64: f.data })
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'PDF nije izrađen.')
    } finally {
      setPdfBusy(false)
    }
  }
  async function downloadPdf() {
    setPdfBusy(true)
    try {
      const f = await purchaseOrderPdfFn({ data: { id: order.id } })
      const bin = atob(f.data)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
      a.download = f.name
      a.click()
      return true
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'PDF nije izrađen.')
      return false
    } finally {
      setPdfBusy(false)
    }
  }
  async function email() {
    if (!(await downloadPdf())) return
    const subject = `Narudžba ${order.number} – ARDOR namještaj`
    const body = `Poštovani,\n\nu prilogu Vam šaljemo narudžbu ${order.number}. Molimo potvrdu narudžbe i rok isporuke.\n\nLijep pozdrav,\n${order.createdByName}\nARDOR namještaj`
    window.location.href = `mailto:${encodeURIComponent(supplier?.email ?? '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const catalogued = order.lines.filter((l) => l.productId)

  return (
    <Modal
      side
      title={`Narudžba ${order.number}`}
      subtitle={
        <span className="inline-flex items-center gap-2">
          <PurchaseStatusBadge status={order.status} /> {supplier?.name}
        </span>
      }
      onClose={onClose}
    >
      <div className="space-y-5">
        {(error || pdfError) && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error || pdfError}</p>}

        <div className="flex flex-wrap gap-2">
          {order.status === 'nacrt' && (
            <>
              <Button variant="copper" disabled={busy} onClick={() => onStatus('zakljucena', 'Narudžba je zaključena. Sada je možete izvesti u PDF.')}>
                <CheckCircle2 className="size-4" /> Zaključi narudžbu
              </Button>
              <Button variant="outline" onClick={onEdit}>
                <Pencil className="size-4" /> Uredi
              </Button>
              <Button variant="danger" disabled={busy} onClick={onDelete}>
                <Trash2 className="size-4" /> Obriši nacrt
              </Button>
            </>
          )}
          {order.status !== 'nacrt' && order.status !== 'otkazana' && (
            <>
              <Button variant="copper" disabled={pdfBusy} onClick={pdf}>
                <FileDown className="size-4" /> {pdfBusy ? 'Izrađujem PDF…' : 'Otvori PDF'}
              </Button>
              <Button variant="outline" disabled={pdfBusy} onClick={email}>
                <Mail className="size-4" /> Pošalji e-mailom
              </Button>
            </>
          )}
          {order.status === 'zakljucena' && (
            <>
              <Button variant="outline" onClick={() => setReceiving(true)} disabled={!catalogued.length}>
                <PackageCheck className="size-4" /> Zaprimi robu
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => onStatus('nacrt', 'Narudžba je vraćena u nacrt.')}>
                <RotateCcw className="size-4" /> Vrati u nacrt
              </Button>
              <Button variant="danger" disabled={busy} onClick={() => onStatus('otkazana', 'Narudžba je otkazana.')}>
                <XCircle className="size-4" /> Otkaži
              </Button>
            </>
          )}
          {order.status === 'otkazana' && (
            <Button variant="outline" disabled={busy} onClick={() => onStatus('nacrt', 'Narudžba je vraćena u nacrt.')}>
              <RotateCcw className="size-4" /> Vrati u nacrt
            </Button>
          )}
        </div>
        {order.status === 'zakljucena' && (
          <p className="text-xs text-walnut-500">
            „Pošalji e-mailom” preuzme PDF i otvori poruku za {supplier?.email || 'dobavljača'} — PDF samo priložite.
          </p>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-walnut-50 p-4 text-sm">
          <div>
            <dt className="text-xs text-walnut-500">Datum</dt>
            <dd className="font-semibold">{date(order.date)}</dd>
          </div>
          <div>
            <dt className="text-xs text-walnut-500">Željeni rok</dt>
            <dd className="font-semibold">{order.deliveryBy ? date(order.deliveryBy) : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-walnut-500">Izradio/la</dt>
            <dd className="font-semibold">{order.createdByName || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-walnut-500">Zaključena</dt>
            <dd className="font-semibold">{order.closedAt ? date(order.closedAt.slice(0, 10)) : '—'}</dd>
          </div>
          {receipt && (
            <div className="col-span-2">
              <dt className="text-xs text-walnut-500">Primka</dt>
              <dd className="font-semibold">
                {receipt.number} · {date(receipt.date)}
              </dd>
            </div>
          )}
        </dl>

        <div>
          <h3 className="mb-2 font-display text-base font-semibold">Stavke</h3>
          <ul className="divide-y divide-walnut-100 rounded-xl border border-walnut-200/70">
            {order.lines.map((l, i) => (
              <li key={i} className="flex gap-3 px-4 py-2.5 text-sm">
                <span className="w-6 text-walnut-400">{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-walnut-500">
                    {l.code || 'izvan kataloga'}
                    {l.price ? ` · ${money2(l.price)}` : ''}
                  </div>
                  {l.note && <div className="mt-0.5 text-xs text-copper-700">{l.note}</div>}
                </div>
                <span className="font-semibold tabular">
                  {l.qty} {l.unit}
                </span>
              </li>
            ))}
          </ul>
          {total > 0 && <p className="mt-2 text-right text-sm text-walnut-600">Orijentaciono bez PDV-a: <b className="text-walnut-900">{money2(total)}</b></p>}
        </div>

        {order.note && (
          <div className="rounded-xl border border-copper-200 bg-copper-50 p-4 text-sm">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-copper-700">Napomena</div>
            <p className="whitespace-pre-line">{order.note}</p>
          </div>
        )}
      </div>

      {receiving && (
        <ReceiptDialog
          initial={{
            supplierId: order.supplierId,
            note: `Po narudžbi ${order.number}`,
            lines: catalogued.map((l) => ({ productId: l.productId!, qty: l.qty, unitCost: l.price ?? 0 })),
          }}
          onClose={() => setReceiving(false)}
          onSaved={async (_n, id) => {
            setReceiving(false)
            await onReceived(id)
          }}
        />
      )}
    </Modal>
  )
}
