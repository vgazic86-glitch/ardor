import { createFileRoute } from '@tanstack/react-router'
import { ClipboardCheck, Layers, PackagePlus, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../components/Modal'
import { Badge, Button, Card, Chip, EmptyState, Field, inputCls, PageHeader, Segmented, Select, Stat } from '../components/ui'
import { usePaged, Pager } from '../components/Pager'
import { date, money, money2 } from '../lib/format'
import { fmtQty, MATERIAL_CATEGORIES, MATERIAL_UNITS, MOVE_LABEL, parseQty, valueOf } from '../lib/materijal'
import { useRemote } from '../lib/remote'
import { countMaterialFn, listMaterialsFn, receiveMaterialsFn, saveMaterialFn } from '../server/api'
import type { MaterialRow } from '../server/materijal'

export const Route = createFileRoute('/radionica')({ component: WorkshopPage })

type Data = Awaited<ReturnType<typeof listMaterialsFn>>
type Run = <R>(fn: () => Promise<R>, ok?: string) => Promise<R | null>
const moveTone = { ulaz: 'good', izlaz: 'info', korekcija: 'violet' } as const

function WorkshopPage() {
  const r = useRemote(() => listMaterialsFn(), [])
  const [tab, setTab] = useState<'materijal' | 'kretanja'>('materijal')
  const [edit, setEdit] = useState<MaterialRow | 'new' | null>(null)
  const [receipt, setReceipt] = useState(false)
  const [count, setCount] = useState<MaterialRow | null>(null)
  const d = r.data
  const mats = d?.materials ?? []
  const active = mats.filter((m) => m.active)
  const low = active.filter((m) => m.low)

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Radionica"
        title="Radionički materijal"
        description="Repromaterijal za namještaj po mjeri (ploče, ABS traka, okovi…), s količinama u m, m², kg ili komadima. Prijem povećava zalihu, utrošak na radni nalog je smanjuje i postaje trošak naloga."
        actions={
          <>
            <Button variant="outline" onClick={() => setEdit('new')}>
              <Plus className="size-4" /> Novi materijal
            </Button>
            <Button variant="copper" onClick={() => setReceipt(true)}>
              <PackagePlus className="size-4" /> Prijem materijala
            </Button>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Layers} label="Vrsta materijala" value={String(active.length)} />
        <Stat label="Vrijednost zalihe" value={money(active.reduce((s, m) => s + m.value, 0))} hint="po prosječnoj nabavnoj, bez PDV-a" />
        <Stat tone={low.length ? 'warn' : 'good'} label="Ispod minimuma" value={String(low.length)} hint={low.length ? low.slice(0, 3).map((m) => m.name).join(', ') : 'sve u redu'} />
        <Stat label="Utrošeno ovaj mjesec" value={money((d?.moves ?? []).filter((m) => m.type === 'izlaz' && m.date.slice(0, 7) === (d?.today ?? '').slice(0, 7)).reduce((s, m) => s + m.value, 0))} hint="na radne naloge" />
      </div>
      {r.error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{r.error}</p>}
      <div className="mb-4">
        <Segmented value={tab} onChange={setTab} options={[{ value: 'materijal', label: 'Materijal i stanje' }, { value: 'kretanja', label: 'Kretanja' }]} />
      </div>
      {!d ? (
        <Card>
          <div className="py-10 text-center text-sm text-walnut-500">Učitavam…</div>
        </Card>
      ) : tab === 'materijal' ? (
        <Materials list={mats} onEdit={setEdit} onCount={setCount} />
      ) : (
        <Moves list={d.moves} />
      )}
      {edit && d && <MaterialDialog m={edit === 'new' ? null : edit} data={d} busy={r.busy} run={r.run} onClose={() => setEdit(null)} />}
      {receipt && d && <ReceiptDialog data={d} busy={r.busy} run={r.run} onClose={() => setReceipt(false)} />}
      {count && <CountDialog m={count} busy={r.busy} run={r.run} onClose={() => setCount(null)} />}
    </div>
  )
}

function Materials({ list, onEdit, onCount }: { list: MaterialRow[]; onEdit: (m: MaterialRow) => void; onCount: (m: MaterialRow) => void }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)
  const cats = [...new Set(list.map((m) => m.category).filter(Boolean))].sort()
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return list.filter((m) => (!cat || m.category === cat) && (!onlyLow || m.low) && (!s || `${m.code} ${m.name} ${m.supplier}`.toLowerCase().includes(s)))
  }, [list, q, cat, onlyLow])
  const paged = usePaged(rows, `${q}|${cat}|${onlyLow}`)
  if (!list.length)
    return (
      <Card>
        <EmptyState icon={Layers} title="Još nema materijala">
          Kliknite „Prijem materijala” i u stavci upišite naziv — novi materijal se sam doda u šifarnik. Npr. „Iverica bijela 18 mm” (jedinica m² ili ploča), „ABS traka 22 mm” (m), „Šarka Blum” (kom).
        </EmptyState>
      </Card>
    )
  return (
    <Card flush>
      <div className="flex flex-wrap items-center gap-2 border-b border-walnut-200/70 px-5 py-3">
        <Chip active={!cat} onClick={() => setCat('')}>
          Sve
        </Chip>
        {cats.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
          </Chip>
        ))}
        <Chip active={onlyLow} onClick={() => setOnlyLow((v) => !v)}>
          Ispod minimuma
        </Chip>
        <label className="relative ml-auto min-w-56">
          <Search className="absolute left-2.5 top-2.5 size-4 text-walnut-400" />
          <input className={`${inputCls} pl-8`} placeholder="Šifra, naziv, dobavljač…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[900px]">
          <thead>
            <tr>
              <th>Šifra</th>
              <th>Materijal</th>
              <th className="text-right">Stanje</th>
              <th className="text-right">Min.</th>
              <th className="text-right">Prosj. cijena</th>
              <th className="text-right">Vrijednost</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((m) => (
              <tr key={m.id} className={m.active ? '' : 'opacity-50'}>
                <td className="text-walnut-500">{m.code}</td>
                <td>
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-xs text-walnut-500">{[m.category, m.supplier, !m.active && 'neaktivan'].filter(Boolean).join(' · ')}</div>
                </td>
                <td className={`text-right font-semibold tabular ${m.stock < 0 ? 'text-rose-700' : m.low ? 'text-copper-600' : ''}`}>
                  {fmtQty(m.stock)} {m.unit}
                </td>
                <td className="text-right tabular text-walnut-500">{m.minQty ? `${fmtQty(m.minQty)} ${m.unit}` : '—'}</td>
                <td className="text-right tabular">
                  {money2(m.avgCost)}/{m.unit}
                </td>
                <td className="text-right tabular">{money2(m.value)}</td>
                <td>
                  <div className="flex justify-end gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => onCount(m)} aria-label={`Inventura ${m.name}`}>
                      <ClipboardCheck className="size-3.5" /> Inventura
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(m)} aria-label={`Uredi ${m.name}`}>
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager {...paged} className="border-t border-walnut-200/70 px-5 py-3" />
    </Card>
  )
}

function Moves({ list }: { list: Data['moves'] }) {
  const paged = usePaged(list, String(list.length))
  if (!list.length)
    return (
      <Card>
        <EmptyState icon={Layers} title="Još nema kretanja">Prijem, utrošak na radne naloge i inventura pojavljuju se ovdje.</EmptyState>
      </Card>
    )
  return (
    <Card flush>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[860px]">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Vrsta</th>
              <th>Materijal</th>
              <th className="text-right">Količina</th>
              <th className="text-right">Vrijednost</th>
              <th>Dokument / nalog</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((m) => (
              <tr key={m.id}>
                <td>{date(m.date)}</td>
                <td>
                  <Badge tone={moveTone[m.type]}>{MOVE_LABEL[m.type]}</Badge>
                </td>
                <td>{m.material}</td>
                <td className={`text-right font-semibold tabular ${m.qty < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {m.qty > 0 ? '+' : ''}
                  {fmtQty(m.qty)} {m.unit}
                </td>
                <td className="text-right tabular">{money2(m.value)}</td>
                <td className="text-xs text-walnut-600">
                  {[m.workOrder && `nalog ${m.workOrder}`, m.supplier, m.documentNumber && `račun ${m.documentNumber}`, m.note].filter(Boolean).join(' · ')}
                  <div className="text-[11px] text-walnut-400">{m.createdBy}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager {...paged} className="border-t border-walnut-200/70 px-5 py-3" />
    </Card>
  )
}

function MaterialDialog({ m, data, busy, run, onClose }: { m: MaterialRow | null; data: Data; busy: boolean; run: Run; onClose: () => void }) {
  const [v, setV] = useState({
    name: m?.name ?? '',
    unit: m?.unit ?? 'kom',
    category: m?.category ?? MATERIAL_CATEGORIES[0],
    supplierId: m?.supplierId ?? '',
    price: m ? String(m.price).replace('.', ',') : '',
    minQty: m?.minQty ? fmtQty(m.minQty) : '',
    note: m?.note ?? '',
    active: m?.active ?? true,
  })
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }))
  const cats = [...new Set([...MATERIAL_CATEGORIES, ...data.materials.map((x) => x.category).filter(Boolean)])]
  const save = async () => {
    const ok = await run(
      () => saveMaterialFn({ data: { id: m?.id ?? null, name: v.name, unit: v.unit, category: v.category, supplierId: v.supplierId || null, price: parseQty(v.price), minQty: parseQty(v.minQty), note: v.note, active: v.active } }),
      m ? 'Materijal je spremljen.' : 'Materijal je dodan.',
    )
    if (ok) onClose()
  }
  return (
    <Modal
      title={m ? `${m.code} · ${m.name}` : 'Novi materijal'}
      subtitle={m ? `Stanje ${fmtQty(m.stock)} ${m.unit}` : 'Šifra se dodijeli sama (MAT-0001 …).'}
      help="radionica"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Odustani
          </Button>
          <Button variant="copper" disabled={busy} onClick={save}>
            Spremi
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Naziv" className="sm:col-span-2">
          <input className={inputCls} value={v.name} onChange={(e) => set('name', e.target.value)} placeholder="npr. Iverica Egger bijela 18 mm" />
        </Field>
        <Select label="Jedinica mjere" value={v.unit} onChange={(x) => set('unit', x)} options={MATERIAL_UNITS.map((u) => ({ value: u, label: u }))} />
        <Field label="Kategorija">
          <input className={inputCls} list="mat-kategorije" value={v.category} onChange={(e) => set('category', e.target.value)} />
          <datalist id="mat-kategorije">
            {cats.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Select label="Dobavljač" value={v.supplierId} onChange={(x) => set('supplierId', x)} options={[{ value: '', label: '— bez —' }, ...data.suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
        <Field label={`Nabavna cijena po ${v.unit} (bez PDV-a)`} hint="Prijem je sam ažurira.">
          <input className={inputCls} inputMode="decimal" value={v.price} onChange={(e) => set('price', e.target.value)} />
        </Field>
        <Field label={`Minimalna zaliha (${v.unit})`} hint="Ispod nje materijal se označi za narudžbu.">
          <input className={inputCls} inputMode="decimal" value={v.minQty} onChange={(e) => set('minQty', e.target.value)} />
        </Field>
        <Field label="Napomena">
          <input className={inputCls} value={v.note} onChange={(e) => set('note', e.target.value)} />
        </Field>
      </div>
      {m && (
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-copper-500" checked={v.active} onChange={(e) => set('active', e.target.checked)} />
          Aktivan (neaktivan materijal se ne nudi kod prijema i troška naloga)
        </label>
      )}
    </Modal>
  )
}

interface ReceiptLine {
  key: number
  name: string
  unit: string
  category: string
  qty: string
  unitCost: string
}

/**
 * Prijem materijala: u stavci se upisuje naziv — postojeći materijal se nudi dok tipkate,
 * a novi (naziv kojeg nema) dobije jedinicu i kategoriju i napravi se pri spremanju prijema.
 */
function ReceiptDialog({ data, busy, run, onClose }: { data: Data; busy: boolean; run: Run; onClose: () => void }) {
  const byName = new Map(data.materials.map((m) => [m.name.toLowerCase(), m]))
  const [head, setHead] = useState({ date: data.today, supplierId: '', documentNumber: '', note: '' })
  const blank = (key: number): ReceiptLine => ({ key, name: '', unit: 'kom', category: '', qty: '', unitCost: '' })
  const [lines, setLines] = useState<ReceiptLine[]>([blank(1)])
  const upd = (key: number, patch: Partial<ReceiptLine>) => setLines((l) => l.map((x) => (x.key === key ? { ...x, ...patch } : x)))
  const pick = (key: number, name: string) => {
    const m = byName.get(name.trim().toLowerCase())
    // Postojeći materijal: predloži zadnju nabavnu cijenu.
    upd(key, m ? { name, unit: m.unit, unitCost: lines.find((l) => l.key === key)?.unitCost || String(m.price).replace('.', ',') } : { name })
  }
  const total = lines.reduce((s, l) => s + valueOf(parseQty(l.qty), parseQty(l.unitCost)), 0)
  const fresh = lines.filter((l) => l.name.trim() && !byName.has(l.name.trim().toLowerCase())).length
  const cats = [...new Set([...MATERIAL_CATEGORIES, ...data.materials.map((x) => x.category).filter(Boolean)])]
  const save = async () => {
    const ok = await run(
      () =>
        receiveMaterialsFn({
          data: {
            ...head,
            supplierId: head.supplierId || null,
            lines: lines.map((l) => {
              const m = byName.get(l.name.trim().toLowerCase())
              return { materialId: m ? m.id : null, name: l.name, unit: l.unit, category: l.category, qty: parseQty(l.qty), unitCost: parseQty(l.unitCost) }
            }),
          },
        }),
      fresh ? `Prijem je upisan, novi materijal dodan u šifarnik (${fresh}).` : 'Prijem materijala je upisan.',
    )
    if (ok) onClose()
  }
  return (
    <Modal
      title="Prijem materijala u radionicu"
      subtitle="Upišite naziv materijala: postojeći se nudi dok tipkate, a novi se sam doda u šifarnik. Količine i cijene bez PDV-a s računa dobavljača."
      help="radionica"
      wide
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm">
            Ukupno bez PDV-a: <b>{money2(total)}</b>
            {fresh > 0 && <span className="text-walnut-500"> · novih materijala: {fresh}</span>}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Odustani
            </Button>
            <Button variant="copper" disabled={busy} onClick={save}>
              Upiši prijem
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Datum">
          <input type="date" className={inputCls} value={head.date} onChange={(e) => setHead((h) => ({ ...h, date: e.target.value }))} />
        </Field>
        <Select label="Dobavljač" value={head.supplierId} onChange={(x) => setHead((h) => ({ ...h, supplierId: x }))} options={[{ value: '', label: '— odaberite —' }, ...data.suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
        <Field label="Broj računa / otpremnice">
          <input className={inputCls} value={head.documentNumber} onChange={(e) => setHead((h) => ({ ...h, documentNumber: e.target.value }))} />
        </Field>
        <Field label="Napomena">
          <input className={inputCls} value={head.note} onChange={(e) => setHead((h) => ({ ...h, note: e.target.value }))} />
        </Field>
      </div>
      <datalist id="prijem-materijali">
        {data.materials.map((m) => (
          <option key={m.id} value={m.name}>
            {`${m.code} · stanje ${fmtQty(m.stock)} ${m.unit}`}
          </option>
        ))}
      </datalist>
      <div className="mt-4 space-y-2">
        {lines.map((l) => {
          const m = byName.get(l.name.trim().toLowerCase())
          const isNew = !!l.name.trim() && !m
          return (
            <div key={l.key} className="grid grid-cols-6 items-end gap-2 rounded-lg border border-walnut-200 bg-linen p-2">
              <Field label="Materijal" className="col-span-6 sm:col-span-3">
                <input className={inputCls} list="prijem-materijali" value={l.name} onChange={(e) => pick(l.key, e.target.value)} placeholder="npr. Iverica Egger bijela 18 mm" aria-label="Naziv materijala u prijemu" />
              </Field>
              <Field label={`Količina${m ? ` (${m.unit})` : ''}`} className="col-span-2 sm:col-span-1">
                <input className={inputCls} inputMode="decimal" value={l.qty} onChange={(e) => upd(l.key, { qty: e.target.value })} aria-label="Količina u prijemu" />
              </Field>
              <Field label={`Cijena/${m?.unit ?? l.unit}`} className="col-span-2 sm:col-span-1">
                <input className={inputCls} inputMode="decimal" value={l.unitCost} onChange={(e) => upd(l.key, { unitCost: e.target.value })} aria-label="Cijena u prijemu" />
              </Field>
              <div className="col-span-2 flex items-center justify-end gap-2 pb-2 text-sm font-semibold sm:col-span-1">
                {money2(valueOf(parseQty(l.qty), parseQty(l.unitCost)))}
                {lines.length > 1 && (
                  <button type="button" className="rounded p-1 text-walnut-500 hover:bg-walnut-100" aria-label="Ukloni stavku prijema" onClick={() => setLines((x) => x.filter((y) => y.key !== l.key))}>
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              {m && (
                <p className="col-span-6 text-xs text-walnut-500">
                  {m.code} · na stanju {fmtQty(m.stock)} {m.unit} · zadnja cijena {money2(m.price)}/{m.unit}
                </p>
              )}
              {isNew && (
                <div className="col-span-6 grid grid-cols-6 items-end gap-2 rounded-lg bg-copper-50 px-2 py-2">
                  <span className="col-span-6 text-xs font-semibold text-copper-800 sm:col-span-2">
                    <Badge tone="copper">Novi materijal</Badge> dodaje se u šifarnik pri spremanju
                  </span>
                  <div className="col-span-3 sm:col-span-1">
                    <Select label="Jedinica" value={l.unit} onChange={(x) => upd(l.key, { unit: x })} options={MATERIAL_UNITS.map((u) => ({ value: u, label: u }))} />
                  </div>
                  <Field label="Kategorija" className="col-span-3 sm:col-span-3">
                    <input className={inputCls} list="prijem-kategorije" value={l.category} onChange={(e) => upd(l.key, { category: e.target.value })} placeholder="npr. Okovi, ABS traka, Ploče" />
                  </Field>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <datalist id="prijem-kategorije">
        {cats.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <Button variant="ghost" className="mt-2" onClick={() => setLines((x) => [...x, blank(Math.max(...x.map((y) => y.key)) + 1)])}>
        <Plus className="size-4" /> Dodaj stavku
      </Button>
    </Modal>
  )
}

function CountDialog({ m, busy, run, onClose }: { m: MaterialRow; busy: boolean; run: Run; onClose: () => void }) {
  const [counted, setCounted] = useState(fmtQty(Math.max(0, m.stock)))
  const [note, setNote] = useState('')
  const diff = Math.round((parseQty(counted) - m.stock) * 1000) / 1000
  return (
    <Modal
      title={`Inventura: ${m.name}`}
      subtitle={`Stanje u aplikaciji ${fmtQty(m.stock)} ${m.unit}`}
      help="radionica"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Odustani
          </Button>
          <Button variant="copper" disabled={busy} onClick={async () => (await run(() => countMaterialFn({ data: { materialId: m.id, counted: parseQty(counted), note, name: m.name } }), 'Stanje je ispravljeno.')) && onClose()}>
            Spremi stanje
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`Izbrojano stvarno stanje (${m.unit})`}>
          <input className={inputCls} inputMode="decimal" value={counted} onChange={(e) => setCounted(e.target.value)} />
        </Field>
        <Field label="Napomena">
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="npr. ostaci ploča ispod 0,5 m² otpisani" />
        </Field>
      </div>
      <p className="mt-3 text-sm">
        Razlika: <b className={diff < 0 ? 'text-rose-700' : diff > 0 ? 'text-emerald-700' : ''}>{diff > 0 ? '+' : ''}{fmtQty(diff)} {m.unit}</b>
        {diff !== 0 && <> ({money2(valueOf(Math.abs(diff), m.avgCost))})</>}
      </p>
    </Modal>
  )
}
