import { createFileRoute } from '@tanstack/react-router'
import { AlarmClock, Camera, CheckCircle2, FileText, Pencil, Plus, Search, Trash2, Truck, Wrench } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Modal } from '../components/Modal'
import { Badge, Button, Card, EmptyState, Field, inputCls, PageHeader, Segmented, Stat } from '../components/ui'
import { openDownload } from '../lib/files'
import { date } from '../lib/format'
import { prepareImage } from '../lib/image'
import { useRemote } from '../lib/remote'
import { useStore } from '../lib/store'
import type { Complaint, ComplaintInput, ComplaintKind, ComplaintStatus } from '../server/complaints'
import {
  addComplaintPhotoFn,
  complaintPdfFn,
  deleteComplaintFn,
  deleteComplaintPhotoFn,
  listComplaintsFn,
  saveComplaintFn,
  setComplaintStatusFn,
} from '../server/api'

export const Route = createFileRoute('/reklamacije')({
  validateSearch: (s: Record<string, unknown>): { nova?: string } => ({ nova: typeof s.nova === 'string' || typeof s.nova === 'number' ? String(s.nova) : undefined }),
  component: ComplaintsPage,
})

const STATUS: Record<ComplaintStatus, { label: string; tone: string }> = {
  prijavljena: { label: 'Prijavljena', tone: 'info' },
  u_obradi: { label: 'U obradi', tone: 'warn' },
  kod_dobavljaca: { label: 'Kod dobavljača', tone: 'violet' },
  rijesena: { label: 'Riješena', tone: 'good' },
  odbijena: { label: 'Odbijena', tone: 'neutral' },
}
const KIND: Record<ComplaintKind, string> = {
  ostecenje: 'Oštećenje',
  greska: 'Greška u izradi',
  nedostaje: 'Nedostaje dio',
  montaza: 'Montaža',
  ostalo: 'Ostalo',
}
const RESOLUTION: Record<string, string> = {
  popravak: 'Popravak',
  zamjena: 'Zamjena robe',
  povrat_novca: 'Povrat novca',
  popust: 'Popust',
  odbijena: 'Odbijena',
  drugo: 'Drugo',
}
const isOpen = (c: Complaint) => c.status !== 'rijesena' && c.status !== 'odbijena'
const plusDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function ComplaintsPage() {
  const { today } = useStore()
  const { nova } = Route.useSearch()
  const navigate = Route.useNavigate()
  const r = useRemote(() => listComplaintsFn(), [])
  const [view, setView] = useState<'otvorene' | 'zatvorene' | 'sve'>('otvorene')
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<Complaint | 'new' | null>(nova ? 'new' : null)
  const [openId, setOpenId] = useState<string | null>(null)
  const all = r.data?.complaints ?? []
  const late = (c: Complaint) => isOpen(c) && !!c.dueDate && c.dueDate < today

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all
      .filter((c) => (view === 'sve' ? true : view === 'otvorene' ? isOpen(c) : !isOpen(c)))
      .filter((c) => !s || [c.number, c.customerName, c.customerPhone, c.productName, c.orderNumber, c.description].join(' ').toLowerCase().includes(s))
      .sort((a, b) => Number(late(b)) - Number(late(a)) || (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, view, q, today])

  const open = all.filter(isOpen)
  const current = openId ? all.find((c) => c.id === openId) : null

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Prodaja"
        title="Reklamacije"
        description="Oštećenja, greške i servis: od prijave kupca do rješenja, s fotografijama, rokom i zapisnikom za potpis."
        actions={
          <Button variant="copper" onClick={() => setEdit('new')}>
            <Plus className="size-4" /> Nova reklamacija
          </Button>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Otvorene" value={String(open.length)} icon={Wrench} tone="accent" />
        <Stat label="Kod dobavljača" value={String(open.filter((c) => c.status === 'kod_dobavljaca').length)} icon={Truck} />
        <Stat label="Prošao rok" value={String(open.filter(late).length)} icon={AlarmClock} tone={open.some(late) ? 'warn' : 'default'} />
        <Stat
          label="Riješene (30 dana)"
          value={String(all.filter((c) => c.status === 'rijesena' && c.closedAt && c.closedAt.slice(0, 10) >= plusDays(today, -30)).length)}
          icon={CheckCircle2}
          tone="good"
        />
      </div>
      <Card flush>
        <div className="flex flex-wrap items-center gap-3 border-b border-walnut-100 px-5 py-3">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'otvorene', label: `Otvorene (${open.length})` },
              { value: 'zatvorene', label: 'Zatvorene' },
              { value: 'sve', label: 'Sve' },
            ]}
          />
          <label className="ml-auto flex items-center gap-2 rounded-lg border border-walnut-200 bg-linen px-3 py-1.5">
            <Search className="size-4 text-walnut-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Broj, kupac, artikal…" className="w-56 bg-transparent text-sm outline-none" />
          </label>
        </div>
        {!list.length ? (
          <EmptyState
            icon={Wrench}
            title={r.data ? (view === 'otvorene' ? 'Nema otvorenih reklamacija' : 'Nema reklamacija') : 'Učitavam…'}
>
            {view === 'otvorene' ? 'Kad kupac prijavi problem, kliknite „Nova reklamacija”.' : ''}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-walnut-500">
                  <th className="px-5 py-2.5">Broj</th>
                  <th className="px-3 py-2.5">Kupac</th>
                  <th className="px-3 py-2.5">Artikal</th>
                  <th className="px-3 py-2.5">Vrsta</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Rok</th>
                  <th className="px-3 py-2.5">Zadužen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-walnut-100">
                {list.map((c) => (
                  <tr key={c.id} onClick={() => setOpenId(c.id)} className="cursor-pointer hover:bg-walnut-50">
                    <td className="px-5 py-2.5">
                      <div className="font-semibold">{c.number}</div>
                      <div className="text-xs text-walnut-500">{date(c.date)}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{c.customerName}</div>
                      <div className="text-xs text-walnut-500">{c.customerPhone}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div>{c.productName || '—'}</div>
                      {c.orderNumber && <div className="text-xs text-walnut-500">{c.orderNumber}</div>}
                    </td>
                    <td className="px-3 py-2.5">{KIND[c.kind]}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
                      {c.photos.length > 0 && <Camera className="ml-1.5 inline size-3.5 text-walnut-400" />}
                    </td>
                    <td className={`px-3 py-2.5 text-xs ${late(c) ? 'font-bold text-rose-700' : 'text-walnut-600'}`}>{c.dueDate ? date(c.dueDate) : '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-walnut-600">{c.assigneeName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {edit && (
        <ComplaintDialog
          complaint={edit === 'new' ? null : edit}
          orderId={edit === 'new' ? nova : undefined}
          users={r.data?.users ?? []}
          busy={r.busy}
          error={r.error}
          onClose={() => {
            setEdit(null)
            if (nova) navigate({ search: {} })
          }}
          onSave={async (d) => {
            const res = await r.run(() => saveComplaintFn({ data: d }), d.id ? 'Reklamacija je spremljena.' : 'Reklamacija je prijavljena.')
            if (res) {
              setEdit(null)
              if (nova) navigate({ search: {} })
              if (typeof res === 'object' && 'id' in res) setOpenId(String(res.id))
            }
          }}
        />
      )}
      {current && !edit && (
        <ComplaintDrawer
          c={current}
          late={late(current)}
          remote={r}
          onEdit={() => setEdit(current)}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  )
}

function ComplaintDialog({
  complaint,
  orderId,
  users,
  busy,
  error,
  onClose,
  onSave,
}: {
  complaint: Complaint | null
  orderId?: string
  users: { id: string; name: string }[]
  busy: boolean
  error: string | null
  onClose: () => void
  onSave: (d: ComplaintInput) => void
}) {
  const { today, customers, orders, products, user } = useStore()
  const preOrder = orderId ? orders.find((o) => o.id === orderId) : undefined
  const [f, setF] = useState<ComplaintInput>(() => ({
    id: complaint?.id,
    date: complaint?.date ?? today,
    customerId: complaint?.customerId ?? preOrder?.customerId ?? null,
    orderId: complaint?.orderId ?? preOrder?.id ?? null,
    productId: complaint?.productId ?? (preOrder?.items.length === 1 ? preOrder.items[0].productId : null),
    supplierId: complaint?.supplierId ?? null,
    kind: complaint?.kind ?? 'ostecenje',
    description: complaint?.description ?? '',
    dueDate: complaint?.dueDate ?? plusDays(today, 15),
    assigneeId: complaint?.assigneeId ?? user.id,
  }))
  const [cq, setCq] = useState('')
  const set = <K extends keyof ComplaintInput>(k: K, v: ComplaintInput[K]) => setF((x) => ({ ...x, [k]: v }))
  const custOrders = orders.filter((o) => f.customerId && o.customerId === f.customerId && o.status !== 'ponuda' && o.status !== 'otkazana')
  const order = f.orderId ? orders.find((o) => o.id === f.orderId) : undefined
  const prodOptions = order ? products.filter((p) => order.items.some((i) => i.productId === p.id)) : products
  const s = cq.trim().toLowerCase()
  const custList = s ? customers.filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(s)).slice(0, 30) : customers.slice(0, 30)
  const selected = customers.find((c) => c.id === f.customerId)

  return (
    <Modal
      title={complaint ? `Uredi ${complaint.number}` : 'Nova reklamacija'}
      subtitle="Kupac, šta je problem i do kada treba riješiti."
      help="reklamacija"
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-rose-700">{error}</span>}
          <Button variant="ghost" className="ml-auto" onClick={onClose}>
            Odustani
          </Button>
          <Button type="submit" form="complaint-form" disabled={busy}>
            {complaint ? 'Spremi' : 'Prijavi reklamaciju'}
          </Button>
        </div>
      }
    >
      <form
        id="complaint-form"
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(f)
        }}
      >
        <Field label="Kupac" className="sm:col-span-2">
          {selected ? (
            <div className="flex items-center justify-between rounded-lg border border-walnut-200 bg-linen px-3 py-2 text-sm">
              <span>
                <strong>{selected.name}</strong> {selected.phone && <span className="text-walnut-500">· {selected.phone}</span>}
              </span>
              <button type="button" className="text-xs font-semibold text-copper-600" onClick={() => setF((x) => ({ ...x, customerId: null, orderId: null, productId: null }))}>
                Promijeni
              </button>
            </div>
          ) : (
            <div>
              <input className={inputCls} value={cq} onChange={(e) => setCq(e.target.value)} placeholder="Ime ili telefon kupca…" autoFocus />
              <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-walnut-100">
                {custList.map((c) => (
                  <button type="button" key={c.id} onClick={() => set('customerId', c.id)} className="block w-full px-3 py-1.5 text-left text-sm font-normal hover:bg-walnut-50">
                    {c.name} <span className="text-walnut-500">{c.phone}</span>
                  </button>
                ))}
                {!custList.length && <p className="px-3 py-2 text-xs font-normal text-walnut-500">Nema takvog kupca — dodajte ga na stranici Kupci.</p>}
              </div>
            </div>
          )}
        </Field>
        <Field label="Narudžba">
          <select className={inputCls} value={f.orderId ?? ''} onChange={(e) => setF((x) => ({ ...x, orderId: e.target.value || null, productId: null }))} disabled={!f.customerId}>
            <option value="">— bez narudžbe —</option>
            {custOrders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.number} · {date(o.date)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Artikal">
          <select className={inputCls} value={f.productId ?? ''} onChange={(e) => set('productId', e.target.value || null)}>
            <option value="">— odaberite —</option>
            {prodOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vrsta problema">
          <select className={inputCls} value={f.kind} onChange={(e) => set('kind', e.target.value as ComplaintKind)}>
            {Object.entries(KIND).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Datum prijave">
          <input type="date" className={inputCls} value={f.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="Opis problema (kako ga opisuje kupac)" className="sm:col-span-2">
          <textarea className={`${inputCls} min-h-24`} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="npr. Ogrebotina na lijevom naslonu, primijećena pri raspakivanju." />
        </Field>
        <Field label="Rok za rješenje" hint="Predloženo: 15 dana od prijave.">
          <input type="date" className={inputCls} value={f.dueDate ?? ''} onChange={(e) => set('dueDate', e.target.value || null)} />
        </Field>
        <Field label="Zadužen/a">
          <select className={inputCls} value={f.assigneeId ?? ''} onChange={(e) => set('assigneeId', e.target.value || null)}>
            <option value="">— niko —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
      </form>
    </Modal>
  )
}

function ComplaintDrawer({
  c,
  late,
  remote: r,
  onEdit,
  onClose,
}: {
  c: Complaint
  late: boolean
  remote: ReturnType<typeof useRemote<Awaited<ReturnType<typeof listComplaintsFn>>>>
  onEdit: () => void
  onClose: () => void
}) {
  const { full, user, notify } = useStore()
  const canClose = full || user.role === 'voditelj'
  const file = useRef<HTMLInputElement>(null)
  const [closing, setClosing] = useState<'rijesena' | 'odbijena' | null>(null)
  const [resolution, setResolution] = useState(c.resolution || 'popravak')
  const [note, setNote] = useState(c.resolutionNote)
  const [zoom, setZoom] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const status = (s: ComplaintStatus) => r.run(() => setComplaintStatusFn({ data: { id: c.id, status: s, resolution, resolutionNote: note } }), 'Status je promijenjen.')
  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const f of Array.from(files)) {
        const image = await prepareImage(f)
        await addComplaintPhotoFn({ data: { id: c.id, image } })
      }
      await r.reload()
      notify('Fotografije su dodane.')
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Fotografija nije dodana.')
    } finally {
      setUploading(false)
      if (file.current) file.current.value = ''
    }
  }
  const pdf = async () => {
    try {
      const f = await complaintPdfFn({ data: { id: c.id } })
      openDownload({ name: f.name, mime: 'application/pdf', dataB64: f.data })
    } catch (e) {
      notify(e instanceof Error ? e.message : 'PDF nije izrađen.')
    }
  }

  return (
    <Modal
      side
      help="reklamacija"
      title={c.number}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
          {late && <Badge tone="bad">Prošao rok</Badge>}
          <span className="text-xs">prijavljeno {date(c.date)} · {c.createdByName}</span>
        </span>
      }
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={pdf}>
            <FileText className="size-4" /> Zapisnik (PDF)
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="size-4" /> Uredi
          </Button>
          {full && (
            <Button
              variant="danger"
              size="sm"
              className="ml-auto"
              onClick={async () => {
                if (window.confirm(`Obrisati reklamaciju ${c.number} s fotografijama? Ovo se ne može vratiti.`) && (await r.run(() => deleteComplaintFn({ data: { id: c.id } }), 'Reklamacija je obrisana.'))) onClose()
              }}
            >
              <Trash2 className="size-4" /> Obriši
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <Info label="Kupac" value={c.customerName} sub={c.customerPhone} />
          <Info label="Artikal" value={c.productName || '—'} sub={c.orderNumber ? `Narudžba ${c.orderNumber}` : ''} />
          <Info label="Vrsta" value={KIND[c.kind]} sub={c.supplierName ? `Dobavljač: ${c.supplierName}` : ''} />
          <Info label="Rok · zadužen/a" value={c.dueDate ? date(c.dueDate) : '—'} sub={c.assigneeName} />
        </div>
        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-wider text-walnut-500">Opis</div>
          <p className="whitespace-pre-wrap rounded-xl bg-linen px-4 py-3">{c.description}</p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-walnut-500">Fotografije ({c.photos.length})</span>
            <Button size="sm" variant="outline" disabled={uploading} onClick={() => file.current?.click()}>
              <Camera className="size-4" /> {uploading ? 'Šaljem…' : 'Dodaj'}
            </Button>
            <input ref={file} type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={(e) => upload(e.target.files)} />
          </div>
          {c.photos.length ? (
            <div className="grid grid-cols-4 gap-2">
              {c.photos.map((p) => (
                <div key={p.imageId} className="group relative">
                  <button onClick={() => setZoom(p.imageId)} className="block aspect-square w-full overflow-hidden rounded-lg border border-walnut-200">
                    <img src={`/api/slike/${p.thumbId}`} alt="" className="size-full object-cover" />
                  </button>
                  <button
                    onClick={() => window.confirm('Obrisati fotografiju?') && r.run(() => deleteComplaintPhotoFn({ data: { imageId: p.imageId } }))}
                    className="absolute right-1 top-1 hidden rounded bg-white/90 p-1 text-rose-700 group-hover:block"
                    aria-label="Obriši fotografiju"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-walnut-500">Fotografišite oštećenje mobitelom — slike se smanje prije slanja.</p>
          )}
        </div>

        {isOpen(c) ? (
          <div className="rounded-xl border border-walnut-200 p-4">
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-walnut-500">Tok reklamacije</div>
            <div className="flex flex-wrap gap-2">
              {(['prijavljena', 'u_obradi', 'kod_dobavljaca'] as ComplaintStatus[]).map((s) => (
                <Button key={s} size="sm" variant={c.status === s ? 'primary' : 'outline'} disabled={r.busy || c.status === s} onClick={() => status(s)}>
                  {STATUS[s].label}
                </Button>
              ))}
              {canClose && (
                <>
                  <Button size="sm" variant="copper" onClick={() => setClosing('rijesena')}>
                    <CheckCircle2 className="size-4" /> Riješi
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setClosing('odbijena')}>
                    Odbij
                  </Button>
                </>
              )}
            </div>
            {!canClose && <p className="mt-2 text-xs text-walnut-500">Reklamaciju zatvara voditelj salona ili uprava.</p>}
            {closing && (
              <div className="mt-4 grid gap-3 border-t border-walnut-100 pt-4">
                <Field label={closing === 'rijesena' ? 'Rješenje' : 'Razlog odbijanja'}>
                  <select className={inputCls} value={resolution} onChange={(e) => setResolution(e.target.value)}>
                    {Object.entries(RESOLUTION)
                      .filter(([k]) => (closing === 'odbijena' ? k === 'odbijena' || k === 'drugo' : k !== 'odbijena'))
                      .map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Napomena (šta je urađeno)">
                  <textarea className={`${inputCls} min-h-16`} value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={r.busy}
                    onClick={async () => {
                      const res = closing === 'odbijena' && resolution !== 'drugo' ? 'odbijena' : resolution
                      if (await r.run(() => setComplaintStatusFn({ data: { id: c.id, status: closing, resolution: res, resolutionNote: note } }), 'Reklamacija je zatvorena.')) setClosing(null)
                    }}
                  >
                    Potvrdi
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setClosing(null)}>
                    Odustani
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="font-semibold">
              {STATUS[c.status].label}: {RESOLUTION[c.resolution] ?? c.resolution}
            </div>
            {c.resolutionNote && <p className="mt-1 text-walnut-700">{c.resolutionNote}</p>}
            {c.closedAt && <p className="mt-1 text-xs text-walnut-500">Zatvoreno {date(c.closedAt.slice(0, 10))}</p>}
            {canClose && (
              <Button size="sm" variant="ghost" className="mt-2" onClick={() => status('u_obradi')}>
                Ponovo otvori
              </Button>
            )}
          </div>
        )}
        {r.error && <p className="text-sm text-rose-700">{r.error}</p>}
      </div>
      {zoom && (
        <Modal title="Fotografija" onClose={() => setZoom(null)} help={false} wide>
          <img src={`/api/slike/${zoom}`} alt="" className="mx-auto max-h-[75vh] rounded-lg" />
        </Modal>
      )}
    </Modal>
  )
}

function Info({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-walnut-100 px-3 py-2">
      <div className="text-[11px] font-bold uppercase tracking-wider text-walnut-500">{label}</div>
      <div className="font-semibold">{value}</div>
      {sub && <div className="text-xs text-walnut-500">{sub}</div>}
    </div>
  )
}
