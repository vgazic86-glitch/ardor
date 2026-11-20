import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Ban, CheckCircle2, FileText, Pencil, Plus, Receipt, Search, Ship, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../components/Modal'
import { Badge, Button, Card, Chip, EmptyState, Field, inputCls, PageHeader, Segmented, Select, Stat } from '../components/ui'
import { openDownload } from '../lib/files'
import { date, money } from '../lib/format'
import {
  addDays,
  CURRENCIES,
  DEFAULT_VALID_DAYS,
  DEFAULT_VAT_NOTE,
  fmtAmount,
  INCOTERMS,
  INVOICE_STATUS_LABEL,
  isExpired,
  lineTotal,
  OFFER_STATUS_LABEL,
  offerTotal,
  suggestPrice,
  toKm,
  type ExportInvoiceStatus,
  type ExportOfferStatus,
} from '../lib/izvoz'
import { useRemote } from '../lib/remote'
import { useStore } from '../lib/store'
import {
  deleteExportOfferFn,
  exportInvoicePdfFn,
  exportOfferPdfFn,
  getExportFn,
  saveExportOfferFn,
  setExportInvoiceStatusFn,
  setExportOfferStatusFn,
} from '../server/api'
import type { ExportInvoiceRow, ExportOfferInput, ExportOfferRow } from '../server/izvoz'

export const Route = createFileRoute('/izvoz')({ component: IzvozPage })

const offerTone: Record<ExportOfferStatus, string> = { nacrt: 'neutral', poslana: 'info', prihvacena: 'good', odbijena: 'bad' }
const invoiceTone: Record<ExportInvoiceStatus, string> = { izdan: 'warn', placen: 'good', storniran: 'neutral' }

type Run = <R>(fn: () => Promise<R>, ok?: string) => Promise<R | null>

function IzvozPage() {
  const r = useRemote(() => getExportFn(), [])
  const router = useRouter()
  const { notify } = useStore()
  const [tab, setTab] = useState<'ponude' | 'racuni'>('ponude')
  const [edit, setEdit] = useState<ExportOfferRow | 'new' | null>(null)
  const [accept, setAccept] = useState<ExportOfferRow | null>(null)
  const [storno, setStorno] = useState<ExportInvoiceRow | null>(null)
  const offers = r.data?.offers ?? []
  const invoices = r.data?.invoices ?? []
  const today = r.data?.today ?? ''

  // Radnje koje mijenjaju zalihu osvježe i glavni snimak (Zalihe, Artikli).
  const runStock: Run = async (fn, ok) => {
    const res = await r.run(fn, ok)
    if (res) await router.invalidate()
    return res
  }

  const pdf = async (load: () => Promise<{ name: string; data: string }>) => {
    try {
      const f = await load()
      openDownload({ name: f.name, mime: 'application/pdf', dataB64: f.data })
    } catch (e) {
      notify(e instanceof Error ? e.message : 'PDF nije izrađen.')
    }
  }

  const open = offers.filter((o) => o.status === 'nacrt' || o.status === 'poslana')
  const unpaid = invoices.filter((i) => i.status === 'izdan')
  const late = unpaid.filter((i) => i.dueDate < today)
  const year = today.slice(0, 4)
  const yearKm = invoices.filter((i) => i.status !== 'storniran' && i.date.startsWith(year)).reduce((s, i) => s + i.totalKm, 0)

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Prodaja"
        title="Izvoz"
        description="Ponude stranim kupcima u EUR (ili drugoj valuti), bez PDV-a. Kad kupac prihvati ponudu, aplikacija sama izda račun i skine robu sa zalihe."
        actions={
          <Button variant="copper" onClick={() => setEdit('new')}>
            <Plus className="size-4" /> Nova ponuda
          </Button>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={FileText} label="Otvorene ponude" value={String(open.length)} hint="nacrt ili poslana kupcu" />
        <Stat tone={unpaid.length ? 'warn' : 'good'} icon={Receipt} label="Računi čekaju uplatu" value={String(unpaid.length)} hint={money(unpaid.reduce((s, i) => s + i.totalKm, 0))} />
        <Stat tone={late.length ? 'warn' : 'default'} label="Dospjeli neplaćeni" value={String(late.length)} hint={late.length ? 'prošao rok plaćanja' : 'nema kašnjenja'} />
        <Stat label={`Izvoz ${year}.`} value={money(yearKm)} hint="izdani računi, u KM" />
      </div>
      {r.error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{r.error}</p>}
      <div className="mb-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'ponude', label: `Ponude (${offers.length})` },
            { value: 'racuni', label: `Računi (${invoices.length})` },
          ]}
        />
      </div>
      {!r.data ? (
        <Card>
          <div className="py-10 text-center text-sm text-walnut-500">Učitavam…</div>
        </Card>
      ) : tab === 'ponude' ? (
        <Offers
          list={offers}
          today={today}
          busy={r.busy}
          run={r.run}
          onEdit={setEdit}
          onAccept={setAccept}
          onPdf={(o) => pdf(() => exportOfferPdfFn({ data: { id: o.id } }))}
          onInvoicePdf={(id) => pdf(() => exportInvoicePdfFn({ data: { id } }))}
        />
      ) : (
        <Invoices
          list={invoices}
          today={today}
          busy={r.busy}
          run={r.run}
          onStorno={setStorno}
          onPdf={(i) => pdf(() => exportInvoicePdfFn({ data: { id: i.id } }))}
        />
      )}

      {edit && (
        <OfferDialog
          offer={edit === 'new' ? null : edit}
          offers={offers}
          today={today}
          busy={r.busy}
          onClose={() => setEdit(null)}
          onSave={async (v) => {
            const res = await r.run(() => saveExportOfferFn({ data: v }), v.id ? 'Ponuda je spremljena.' : 'Ponuda je napravljena.')
            if (res) setEdit(null)
          }}
        />
      )}

      {accept && (
        <Modal
          title={`Prihvaćena ponuda ${accept.number}`}
          subtitle={accept.buyerName}
          help="izvoz"
          onClose={() => setAccept(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAccept(null)}>
                Odustani
              </Button>
              <Button
                variant="copper"
                disabled={r.busy}
                onClick={async () => {
                  const res = await runStock(() => setExportOfferStatusFn({ data: { id: accept.id, status: 'prihvacena', number: accept.number } }))
                  if (res) {
                    setAccept(null)
                    setTab('racuni')
                    notify(res.invoice ? `Izdan je račun ${res.invoice}.` : 'Ponuda je prihvaćena.')
                  }
                }}
              >
                <CheckCircle2 className="size-4" /> Prihvaćena — izdaj račun
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-sm text-walnut-800">
            <p>
              Kupac je prihvatio ponudu na <b>{fmtAmount(accept.total, accept.currency)}</b>
              {accept.currency !== 'KM' && <> ({money(toKm(accept.total, accept.rate))})</>}. Aplikacija će sada:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>izdati račun s današnjim datumom i sljedećim brojem po redu (IZR-…),</li>
              <li>
                postaviti rok plaćanja: {accept.paymentDays ? `${accept.paymentDays} dana (do ${date(addDays(today, accept.paymentDays))})` : 'danas (avans)'},
              </li>
              <li>
                skinuti artikle iz kataloga sa zalihe ({accept.location === 'salon' ? 'salon' : 'skladište'}):{' '}
                {accept.items.filter((i) => i.productId).length} stavki; slobodne stavke ne mijenjaju zalihu.
              </li>
            </ul>
            <p className="text-xs text-walnut-500">Nakon toga se ponuda više ne mijenja. Ako je nešto pogrešno, račun se stornira i ponuda se vraća na „Poslana”.</p>
          </div>
        </Modal>
      )}

      {storno && (
        <Modal
          title={`Storno računa ${storno.number}`}
          subtitle={storno.buyerName}
          help="izvoz"
          onClose={() => setStorno(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setStorno(null)}>
                Odustani
              </Button>
              <Button
                variant="primary"
                className="!bg-rose-700"
                disabled={r.busy}
                onClick={async () => {
                  if (await runStock(() => setExportInvoiceStatusFn({ data: { id: storno.id, status: 'storniran', number: storno.number } }), `Račun ${storno.number} je storniran.`)) setStorno(null)
                }}
              >
                <Ban className="size-4" /> Da, storniraj
              </Button>
            </div>
          }
        >
          <div className="space-y-2 text-sm text-walnut-800">
            <p>Storno se ne može poništiti. Račun ostaje zapisan pod svojim brojem s oznakom „Storniran”.</p>
            <p>Roba se vraća na zalihu, a ponuda {storno.offerNumber} na status „Poslana kupcu”, pa je možete ispraviti i ponovo prihvatiti (dobit će novi broj računa).</p>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Offers({
  list,
  today,
  busy,
  run,
  onEdit,
  onAccept,
  onPdf,
  onInvoicePdf,
}: {
  list: ExportOfferRow[]
  today: string
  busy: boolean
  run: Run
  onEdit: (o: ExportOfferRow) => void
  onAccept: (o: ExportOfferRow) => void
  onPdf: (o: ExportOfferRow) => void
  onInvoicePdf: (invoiceId: string) => void
}) {
  const [filter, setFilter] = useState<'otvorene' | 'sve'>('otvorene')
  const [q, setQ] = useState('')
  const shown = list.filter(
    (o) =>
      (filter === 'sve' || o.status === 'nacrt' || o.status === 'poslana') &&
      (!q.trim() || `${o.number} ${o.buyerName} ${o.buyerCountry}`.toLowerCase().includes(q.trim().toLowerCase())),
  )
  const setStatus = (o: ExportOfferRow, status: ExportOfferStatus) =>
    run(() => setExportOfferStatusFn({ data: { id: o.id, status, number: o.number } }), `Ponuda ${o.number}: ${OFFER_STATUS_LABEL[status].toLowerCase()}.`)
  return (
    <Card flush>
      <div className="flex flex-wrap items-center gap-2 border-b border-walnut-200/70 px-5 py-3">
        <Chip active={filter === 'otvorene'} onClick={() => setFilter('otvorene')}>
          Otvorene
        </Chip>
        <Chip active={filter === 'sve'} onClick={() => setFilter('sve')}>
          Sve
        </Chip>
        <label className="relative ml-auto min-w-56">
          <Search className="absolute left-2.5 top-2.5 size-4 text-walnut-400" />
          <input className={`${inputCls} pl-8`} placeholder="Broj, kupac, zemlja…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      {shown.length === 0 ? (
        <EmptyState icon={Ship} title={list.length ? 'Nema ponuda za ovaj prikaz' : 'Još nema ponuda za izvoz'}>
          Klikni „Nova ponuda”, upiši stranog kupca i stavke. PDF ponude je dvojezičan (bosanski / engleski).
        </EmptyState>
      ) : (
        <ul className="divide-y divide-walnut-100">
          {shown.map((o) => {
            const expired = isExpired(o, today)
            const locked = o.status === 'prihvacena'
            return (
              <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{o.number}</span>
                    <Badge tone={offerTone[o.status]}>{OFFER_STATUS_LABEL[o.status]}</Badge>
                    {expired && <Badge tone="warn">Istekla {date(o.validUntil)}</Badge>}
                    {o.invoice && (
                      <button type="button" className="text-xs font-semibold text-copper-700 hover:underline" onClick={() => onInvoicePdf(o.invoice!.id)}>
                        Račun {o.invoice.number}
                      </button>
                    )}
                  </div>
                  <div className="truncate text-sm">
                    <b>{o.buyerName}</b>
                    {o.buyerCountry && <span className="text-walnut-500"> · {o.buyerCountry}</span>}
                  </div>
                  <div className="text-xs text-walnut-500">
                    {date(o.date)} · vrijedi do {date(o.validUntil)} · {o.items.length} stavki{o.incoterms ? ` · ${o.incoterms}` : ''}
                    {o.createdBy ? ` · ${o.createdBy}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{fmtAmount(o.total, o.currency)}</div>
                  {o.currency !== 'KM' && <div className="text-xs text-walnut-500">{money(toKm(o.total, o.rate))}</div>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => onPdf(o)}>
                    <FileText className="size-3.5" /> PDF
                  </Button>
                  {!locked && (
                    <Button variant="outline" size="sm" onClick={() => onEdit(o)}>
                      <Pencil className="size-3.5" /> Uredi
                    </Button>
                  )}
                  {o.status === 'nacrt' && (
                    <Button variant="outline" size="sm" disabled={busy} onClick={() => setStatus(o, 'poslana')}>
                      Poslana kupcu
                    </Button>
                  )}
                  {(o.status === 'nacrt' || o.status === 'poslana') && (
                    <>
                      <Button variant="copper" size="sm" disabled={busy} onClick={() => onAccept(o)}>
                        <CheckCircle2 className="size-3.5" /> Prihvaćena
                      </Button>
                      <Button variant="ghost" size="sm" disabled={busy} onClick={() => setStatus(o, 'odbijena')}>
                        <X className="size-3.5" /> Odbijena
                      </Button>
                    </>
                  )}
                  {o.status === 'odbijena' && (
                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => setStatus(o, 'poslana')}>
                      Vrati u otvorene
                    </Button>
                  )}
                  {!locked && !o.invoice && (
                    <Button
                      variant="danger"
                      size="sm"
                      aria-label={`Obriši ponudu ${o.number}`}
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Obrisati ponudu ${o.number} (${o.buyerName})?`))
                          run(() => deleteExportOfferFn({ data: { id: o.id, number: o.number } }), `Ponuda ${o.number} je obrisana.`)
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function Invoices({
  list,
  today,
  busy,
  run,
  onStorno,
  onPdf,
}: {
  list: ExportInvoiceRow[]
  today: string
  busy: boolean
  run: Run
  onStorno: (i: ExportInvoiceRow) => void
  onPdf: (i: ExportInvoiceRow) => void
}) {
  if (!list.length)
    return (
      <Card>
        <EmptyState icon={Receipt} title="Još nema računa za izvoz">
          Račun nastaje sam kad ponudu označite kao „Prihvaćena”.
        </EmptyState>
      </Card>
    )
  return (
    <Card flush>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[860px]">
          <thead>
            <tr>
              <th>Broj</th>
              <th>Kupac</th>
              <th>Datum</th>
              <th>Dospijeće</th>
              <th className="text-right">Iznos</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((i) => {
              const late = i.status === 'izdan' && i.dueDate < today
              return (
                <tr key={i.id} className={i.status === 'storniran' ? 'opacity-60' : ''}>
                  <td>
                    <div className="font-semibold">{i.number}</div>
                    <div className="text-xs text-walnut-500">po ponudi {i.offerNumber}</div>
                  </td>
                  <td>
                    <div className="font-medium">{i.buyerName}</div>
                    {i.buyerCountry && <div className="text-xs text-walnut-500">{i.buyerCountry}</div>}
                  </td>
                  <td>{date(i.date)}</td>
                  <td className={late ? 'font-semibold text-rose-700' : ''}>
                    {date(i.dueDate)}
                    {late && <div className="text-xs">kasni</div>}
                  </td>
                  <td className="text-right">
                    <div className="font-semibold">{fmtAmount(i.total, i.currency)}</div>
                    {i.currency !== 'KM' && <div className="text-xs text-walnut-500">{money(i.totalKm)}</div>}
                  </td>
                  <td>
                    <Badge tone={invoiceTone[i.status]}>{INVOICE_STATUS_LABEL[i.status]}</Badge>
                    {i.paidAt && <div className="mt-0.5 text-xs text-walnut-500">{date(i.paidAt)}</div>}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => onPdf(i)}>
                        <FileText className="size-3.5" /> PDF
                      </Button>
                      {i.status === 'izdan' && (
                        <Button variant="outline" size="sm" disabled={busy} onClick={() => run(() => setExportInvoiceStatusFn({ data: { id: i.id, status: 'placen', number: i.number } }), `Račun ${i.number} je plaćen.`)}>
                          <CheckCircle2 className="size-3.5" /> Plaćen
                        </Button>
                      )}
                      {i.status === 'placen' && (
                        <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(() => setExportInvoiceStatusFn({ data: { id: i.id, status: 'izdan', number: i.number } }), `Račun ${i.number} je vraćen na neplaćen.`)}>
                          Nije plaćen
                        </Button>
                      )}
                      {i.status !== 'storniran' && (
                        <Button variant="danger" size="sm" disabled={busy} onClick={() => onStorno(i)}>
                          <Ban className="size-3.5" /> Storno
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/* ───────────────────────── prozor ponude ───────────────────────── */

interface ItemDraft {
  key: number
  productId: string | null
  code: string
  name: string
  qty: string
  unit: string
  unitPrice: string
  discountPct: string
}

const parse = (v: string) => {
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
const show = (n: number) => (n ? String(n).replace('.', ',') : '')
let keySeq = 1

function OfferDialog({
  offer,
  offers,
  today,
  busy,
  onClose,
  onSave,
}: {
  offer: ExportOfferRow | null
  offers: ExportOfferRow[]
  today: string
  busy: boolean
  onClose: () => void
  onSave: (v: ExportOfferInput) => void
}) {
  const { products } = useStore()
  const [v, setV] = useState(() => ({
    date: offer?.date ?? today,
    validUntil: offer?.validUntil ?? addDays(today, DEFAULT_VALID_DAYS),
    buyerName: offer?.buyerName ?? '',
    buyerAddress: offer?.buyerAddress ?? '',
    buyerCity: offer?.buyerCity ?? '',
    buyerCountry: offer?.buyerCountry ?? '',
    buyerVatId: offer?.buyerVatId ?? '',
    buyerContact: offer?.buyerContact ?? '',
    buyerEmail: offer?.buyerEmail ?? '',
    buyerPhone: offer?.buyerPhone ?? '',
    currency: offer?.currency ?? 'EUR',
    rate: show(offer?.rate ?? 1.95583),
    incoterms: offer?.incoterms ?? 'EXW Banja Luka',
    paymentDays: String(offer?.paymentDays ?? 0),
    paymentTerms: offer?.paymentTerms ?? '',
    deliveryTerms: offer?.deliveryTerms ?? '',
    location: (offer?.location ?? 'skladiste') as 'skladiste' | 'salon',
    vatNote: offer?.vatNote ?? DEFAULT_VAT_NOTE,
    note: offer?.note ?? '',
  }))
  const [items, setItems] = useState<ItemDraft[]>(() =>
    (offer?.items ?? []).map((i) => ({
      key: keySeq++,
      productId: i.productId,
      code: i.code,
      name: i.name,
      qty: String(i.qty),
      unit: i.unit,
      unitPrice: show(i.unitPrice),
      discountPct: show(i.discountPct),
    })),
  )
  const [pick, setPick] = useState('')
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }))
  const rate = v.currency === 'KM' ? 1 : parse(v.rate)

  // Raniji kupci (za brzo popunjavanje).
  const buyers = useMemo(() => {
    const seen = new Map<string, ExportOfferRow>()
    for (const o of offers) if (!seen.has(o.buyerName.toLowerCase())) seen.set(o.buyerName.toLowerCase(), o)
    return [...seen.values()]
  }, [offers])
  const fillBuyer = (name: string) => {
    set('buyerName', name)
    const b = buyers.find((o) => o.buyerName.toLowerCase() === name.trim().toLowerCase())
    if (b && !offer)
      setV((s) => ({
        ...s,
        buyerName: b.buyerName,
        buyerAddress: b.buyerAddress,
        buyerCity: b.buyerCity,
        buyerCountry: b.buyerCountry,
        buyerVatId: b.buyerVatId,
        buyerContact: b.buyerContact,
        buyerEmail: b.buyerEmail,
        buyerPhone: b.buyerPhone,
        currency: b.currency,
        rate: show(b.rate),
        incoterms: b.incoterms,
        paymentDays: String(b.paymentDays),
        paymentTerms: b.paymentTerms,
        deliveryTerms: b.deliveryTerms,
      }))
  }

  const matches = useMemo(() => {
    const s = pick.trim().toLowerCase()
    if (s.length < 2) return []
    return products.filter((p) => `${p.sku} ${p.fiscalSku ?? ''} ${p.name}`.toLowerCase().includes(s)).slice(0, 8)
  }, [pick, products])

  const addProduct = (id: string) => {
    const p = products.find((x) => x.id === id)
    if (!p) return
    setItems((s) => [
      ...s,
      { key: keySeq++, productId: p.id, code: p.sku, name: p.name, qty: '1', unit: 'kom', unitPrice: show(suggestPrice(p.price, rate || 1)), discountPct: '' },
    ])
    setPick('')
  }
  const addFree = () => setItems((s) => [...s, { key: keySeq++, productId: null, code: '', name: '', qty: '1', unit: 'kom', unitPrice: '', discountPct: '' }])
  const upd = (key: number, k: keyof ItemDraft, val: string) => setItems((s) => s.map((i) => (i.key === key ? { ...i, [k]: val } : i)))
  const lines = items.map((i) => ({ qty: Math.round(parse(i.qty)), unitPrice: parse(i.unitPrice), discountPct: parse(i.discountPct) }))
  const total = offerTotal(lines)
  const stockOf = (id: string | null) => {
    const p = id ? products.find((x) => x.id === id) : null
    if (!p) return null
    return v.location === 'salon' ? p.stock : (p.stockWarehouse ?? 0)
  }

  const save = () =>
    onSave({
      id: offer?.id ?? null,
      ...v,
      rate,
      paymentDays: Math.round(parse(v.paymentDays)),
      items: items.map((i, n) => ({
        productId: i.productId,
        code: i.code,
        name: i.name,
        qty: lines[n].qty,
        unit: i.unit,
        unitPrice: lines[n].unitPrice,
        discountPct: lines[n].discountPct,
      })),
    })

  const txt = (k: 'buyerAddress' | 'buyerCity' | 'buyerCountry' | 'buyerVatId' | 'buyerContact' | 'buyerEmail' | 'buyerPhone', label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <input className={inputCls} value={v[k]} onChange={(e) => set(k, e.target.value)} />
    </Field>
  )

  return (
    <Modal
      title={offer ? `Ponuda ${offer.number}` : 'Nova ponuda za izvoz'}
      subtitle={offer ? OFFER_STATUS_LABEL[offer.status] : 'Broj ponude se dodijeli sam (IZP-godina-redni broj).'}
      help="izvoz"
      wide
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm">
            Ukupno: <b className="text-base">{fmtAmount(total, v.currency)}</b>
            {v.currency !== 'KM' && rate > 0 && <span className="text-walnut-500"> · {money(toKm(total, rate))}</span>}
            <span className="text-walnut-500"> · bez PDV-a (izvoz)</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Odustani
            </Button>
            <Button variant="copper" disabled={busy} onClick={save}>
              Spremi ponudu
            </Button>
          </div>
        </div>
      }
    >
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-walnut-500">Kupac</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Naziv kupca (firma)" hint={buyers.length && !offer ? 'Počni tipkati — raniji kupci se nude i popune ostala polja.' : undefined}>
          <input className={inputCls} list="izvoz-kupci" value={v.buyerName} onChange={(e) => fillBuyer(e.target.value)} placeholder="npr. Möbel Haus GmbH" />
          <datalist id="izvoz-kupci">
            {buyers.map((b) => (
              <option key={b.id} value={b.buyerName} />
            ))}
          </datalist>
        </Field>
        {txt('buyerCountry', 'Zemlja', 'npr. Hrvatska, Njemačka, Austrija')}
        {txt('buyerAddress', 'Adresa')}
        {txt('buyerCity', 'Poštanski broj i grad')}
        {txt('buyerVatId', 'PDV / VAT broj kupca', 'npr. HR12345678901, DE123456789')}
        {txt('buyerContact', 'Kontakt osoba')}
        {txt('buyerEmail', 'E-pošta')}
        {txt('buyerPhone', 'Telefon')}
      </div>

      <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-walnut-500">Uslovi</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Datum ponude">
          <input type="date" className={inputCls} value={v.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="Vrijedi do">
          <input type="date" className={inputCls} value={v.validUntil} onChange={(e) => set('validUntil', e.target.value)} />
        </Field>
        <Select
          label="Valuta"
          value={v.currency}
          onChange={(c) => {
            const known = CURRENCIES.find((x) => x.code === c)
            setV((s) => ({ ...s, currency: c, rate: known?.rate ? show(known.rate) : '' }))
          }}
          options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
        />
        {v.currency !== 'KM' && (
          <Field label={`Kurs: 1 ${v.currency} = ? KM`} hint={v.currency === 'EUR' ? 'Fiksni kurs CBBiH' : 'Upiši srednji kurs CBBiH na dan ponude'}>
            <input className={inputCls} inputMode="decimal" value={v.rate} onChange={(e) => set('rate', e.target.value)} />
          </Field>
        )}
        <Field label="Paritet (Incoterms)" hint={`npr. ${INCOTERMS.slice(0, 5).join(', ')} + mjesto`}>
          <input className={inputCls} list="izvoz-incoterms" value={v.incoterms} onChange={(e) => set('incoterms', e.target.value)} />
          <datalist id="izvoz-incoterms">
            {INCOTERMS.map((c) => (
              <option key={c} value={`${c} Banja Luka`} />
            ))}
          </datalist>
        </Field>
        <Field label="Rok plaćanja (dana od računa)" hint="0 = avansno plaćanje">
          <input className={inputCls} inputMode="numeric" value={v.paymentDays} onChange={(e) => set('paymentDays', e.target.value)} />
        </Field>
        <Field label="Uslovi plaćanja (tekst, po želji)" className="sm:col-span-2">
          <input className={inputCls} value={v.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)} placeholder="npr. 30 % avans, ostatak prije utovara" />
        </Field>
        <Select
          label="Roba izlazi iz"
          value={v.location}
          onChange={(x) => set('location', x as 'skladiste' | 'salon')}
          options={[
            { value: 'skladiste', label: 'Skladišta' },
            { value: 'salon', label: 'Salona' },
          ]}
        />
        <Field label="Rok i način isporuke" className="sm:col-span-3">
          <input className={inputCls} value={v.deliveryTerms} onChange={(e) => set('deliveryTerms', e.target.value)} placeholder="npr. 4–6 sedmica od uplate avansa, kamionom kupca" />
        </Field>
      </div>

      <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-walnut-500">Stavke (cijene u {v.currency}, bez PDV-a)</h3>
      <div className="relative mb-3 flex flex-wrap gap-2">
        <label className="relative min-w-64 flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-walnut-400" />
          <input className={`${inputCls} pl-8`} placeholder="Dodaj artikal iz kataloga: šifra, fiskalna šifra ili naziv…" value={pick} onChange={(e) => setPick(e.target.value)} />
          {matches.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-walnut-200 bg-white shadow-lg">
              {matches.map((p) => (
                <li key={p.id}>
                  <button type="button" className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-copper-50" onClick={() => addProduct(p.id)}>
                    <span className="min-w-0 truncate">
                      <span className="text-walnut-500">{p.sku}</span> {p.name}
                    </span>
                    <span className="shrink-0 text-xs text-walnut-500">
                      {money(p.price)} · sklad. {p.stockWarehouse ?? 0} / salon {p.stock}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </label>
        <Button variant="outline" onClick={addFree}>
          <Plus className="size-4" /> Slobodna stavka
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg bg-walnut-50 px-3 py-3 text-sm text-walnut-600">
          Dodaj artikle iz kataloga (predložena cijena = maloprodajna bez PDV-a preračunata u {v.currency}; promijeni je po dogovoru) ili slobodnu stavku (npr. pakovanje, prijevoz).
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs text-walnut-500">
                <th className="pb-1 pr-2 font-semibold">Šifra</th>
                <th className="pb-1 pr-2 font-semibold">Naziv (može na engleskom)</th>
                <th className="w-16 pb-1 pr-2 font-semibold">Kol.</th>
                <th className="w-16 pb-1 pr-2 font-semibold">J.mj.</th>
                <th className="w-24 pb-1 pr-2 font-semibold">Cijena</th>
                <th className="w-16 pb-1 pr-2 font-semibold">Rabat %</th>
                <th className="w-24 pb-1 pr-2 text-right font-semibold">Iznos</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((i, n) => {
                const st = stockOf(i.productId)
                const short = st != null && lines[n].qty > st
                return (
                  <tr key={i.key} className="align-top">
                    <td className="py-1 pr-2">
                      <input className={`${inputCls} w-24`} value={i.code} onChange={(e) => upd(i.key, 'code', e.target.value)} />
                    </td>
                    <td className="py-1 pr-2">
                      <input className={inputCls} value={i.name} onChange={(e) => upd(i.key, 'name', e.target.value)} />
                      {st != null && (
                        <div className={`mt-0.5 text-xs ${short ? 'font-semibold text-rose-700' : 'text-walnut-500'}`}>
                          Na zalihi ({v.location === 'salon' ? 'salon' : 'skladište'}): {st}
                          {short ? ' — nedovoljno' : ''}
                        </div>
                      )}
                    </td>
                    <td className="py-1 pr-2">
                      <input className={inputCls} inputMode="numeric" value={i.qty} onChange={(e) => upd(i.key, 'qty', e.target.value)} />
                    </td>
                    <td className="py-1 pr-2">
                      <input className={inputCls} value={i.unit} onChange={(e) => upd(i.key, 'unit', e.target.value)} />
                    </td>
                    <td className="py-1 pr-2">
                      <input className={inputCls} inputMode="decimal" value={i.unitPrice} onChange={(e) => upd(i.key, 'unitPrice', e.target.value)} />
                    </td>
                    <td className="py-1 pr-2">
                      <input className={inputCls} inputMode="decimal" value={i.discountPct} onChange={(e) => upd(i.key, 'discountPct', e.target.value)} />
                    </td>
                    <td className="py-1 pr-2 pt-3 text-right font-semibold">{fmtAmount(lineTotal(lines[n]), v.currency)}</td>
                    <td className="py-1">
                      <Button variant="danger" size="sm" aria-label={`Ukloni stavku ${i.name}`} onClick={() => setItems((s) => s.filter((x) => x.key !== i.key))}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field label="Napomena o PDV-u (ispisuje se)" hint="Izvoz je oslobođen PDV-a; tekst provjeri s knjigovođom.">
          <textarea className={inputCls} rows={3} value={v.vatNote} onChange={(e) => set('vatNote', e.target.value)} />
        </Field>
        <Field label="Napomena za kupca (ispisuje se)">
          <textarea className={inputCls} rows={3} value={v.note} onChange={(e) => set('note', e.target.value)} placeholder="npr. Montaža nije uključena. / Assembly not included." />
        </Field>
      </div>
    </Modal>
  )
}
