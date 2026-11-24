import { createFileRoute } from '@tanstack/react-router'
import { Calendar, Camera, ExternalLink, Eye, EyeOff, Globe, ImagePlus, Inbox, Loader2, Phone, Plus, Ruler, Search, Sparkles, Star, Trash2, UserPlus, X } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Modal } from '../components/Modal'
import { Pager, usePaged } from '../components/Pager'
import { WebArticles, WebOverview, WebTexts, type GoTo, type ProductFilter, type WebTab } from '../components/WebCms'
import { Badge, Button, Card, Chip, EmptyState, Field, inputCls, PageHeader, Segmented, Select, Stat } from '../components/ui'
import { date, money } from '../lib/format'
import { prepareWebPhoto } from '../lib/image'
import { useRemote } from '../lib/remote'
import { INQUIRY_KINDS, INQUIRY_STATUS, WEB_AVAIL, WEB_COLORS, WEB_MATERIALS, WEB_ROOMS, WEB_STYLES } from '../lib/web'
import { WEB_SITE_URL } from '../lib/webContent'
import { deleteWebItemFn, getWebFn, saveWebItemFn, setWebInquiryStatusFn, uploadWebItemImageFn, webInquiryToCustomerFn } from '../server/api'
import type { WebInquiryRow, WebItemRow } from '../server/web'

export const Route = createFileRoute('/web')({ component: WebPage })

const WEB_URL = WEB_SITE_URL
const kindTone: Record<string, string> = { ponuda: 'copper', posjet: 'info', mjerenje: 'violet' }
const statusTone: Record<string, string> = { novo: 'warn', u_obradi: 'info', zatvoreno: 'good' }
const opts = (m: Record<string, string>) => Object.entries(m).map(([value, label]) => ({ value, label }))

function WebPage() {
  const r = useRemote(() => getWebFn(), [])
  const canProducts = !!r.data?.canItems
  const [nav, setNav] = useState<GoTo & { n: number }>({ tab: 'pregled', n: 0 })
  const go = (to: GoTo) => {
    setNav((s) => ({ ...to, n: s.n + 1 }))
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const tab = nav.tab
  const inq = r.data?.inquiries ?? []
  const fresh = inq.filter((i) => i.status === 'novo')

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Prodaja"
        title="Web stranica"
        description="Sve što kupci vide na webu uređuje se ovdje. Počni od „Pregled weba” — tu piše što je na kojoj stranici i gdje se mijenja."
        actions={<a href={WEB_URL} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-lg border border-walnut-200 bg-linen px-3.5 py-2 text-sm font-semibold text-walnut-900 shadow-sm hover:bg-white"><Globe className="size-4" /> Otvori web</a>}
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat tone={fresh.length ? 'warn' : 'good'} icon={Inbox} label="Novi upiti" value={String(fresh.length)} hint="čekaju poziv" />
        <Stat label="U obradi" value={String(inq.filter((i) => i.status === 'u_obradi').length)} hint="neko je preuzeo" />
        <Stat label="Zakazani posjeti i mjerenja" value={String(inq.filter((i) => i.kind !== 'ponuda' && i.status !== 'zatvoreno').length)} hint="otvoreni termini" />
        {canProducts && <Stat label="Artikala na webu" value={String(r.data!.items.filter((p) => p.visible && p.imageIds.length).length)} hint={`od ${r.data!.items.length} upisanih`} />}
      </div>
      {r.error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{r.error}</p>}
      <div className="mb-4 overflow-x-auto">
        <Segmented<WebTab> value={tab} onChange={(t) => go({ tab: t })} options={[
          { value: 'pregled', label: 'Pregled weba' },
          { value: 'upiti', label: `Upiti${fresh.length ? ` (${fresh.length} novih)` : ''}` },
          ...(canProducts ? [{ value: 'artikli' as const, label: 'Artikli na webu' }] : []),
          { value: 'tekstovi', label: 'Tekstovi' },
          { value: 'clanci', label: 'Članci' },
        ]} />
      </div>
      {tab === 'pregled' ? (
        <WebOverview go={go} canProducts={canProducts} newInquiries={fresh.length} />
      ) : tab === 'tekstovi' ? (
        <WebTexts key={nav.n} initialGroup={nav.group} />
      ) : tab === 'clanci' ? (
        <WebArticles />
      ) : !r.data ? (
        <Card><div className="py-10 text-center text-sm text-walnut-500">Učitavam…</div></Card>
      ) : tab === 'upiti' || !canProducts ? (
        <Inquiries list={inq} busy={r.busy} run={r.run} />
      ) : (
        <Items key={nav.n} list={r.data.items} busy={r.busy} run={r.run} initialFilter={nav.filter} />
      )}
    </div>
  )
}

type Run = <R>(fn: () => Promise<R>, ok?: string) => Promise<R | null>

function Inquiries({ list, busy, run }: { list: WebInquiryRow[]; busy: boolean; run: Run }) {
  const [filter, setFilter] = useState<'otvoreni' | 'svi'>('otvoreni')
  const shown = filter === 'svi' ? list : list.filter((i) => i.status !== 'zatvoreno')
  return (
    <Card flush>
      <div className="flex flex-wrap items-center gap-2 border-b border-walnut-200/70 px-5 py-3">
        <Chip active={filter === 'otvoreni'} onClick={() => setFilter('otvoreni')}>Otvoreni</Chip>
        <Chip active={filter === 'svi'} onClick={() => setFilter('svi')}>Svi</Chip>
      </div>
      {shown.length === 0 ? (
        <EmptyState icon={Inbox} title="Nema otvorenih upita">Kad kupac pošalje obrazac s web stranice, upit se pojavi ovdje i u zvoncu.</EmptyState>
      ) : (
        <ul className="divide-y divide-walnut-100">{shown.map((i) => <InquiryRow key={i.id} i={i} busy={busy} run={run} />)}</ul>
      )}
    </Card>
  )
}

function InquiryRow({ i, busy, run }: { i: WebInquiryRow; busy: boolean; run: Run }) {
  const [note, setNote] = useState(i.note)
  const at = new Date(i.at)
  const time = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
  const setStatus = (status: string) => run(() => setWebInquiryStatusFn({ data: { id: i.id, status, note, name: i.name } }), 'Upit je ažuriran.')
  return (
    <li className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={kindTone[i.kind] ?? 'neutral'}>{INQUIRY_KINDS[i.kind as keyof typeof INQUIRY_KINDS] ?? i.kind}</Badge>
          <Badge tone={statusTone[i.status] ?? 'neutral'}>{INQUIRY_STATUS[i.status as keyof typeof INQUIRY_STATUS] ?? i.status}</Badge>
          <span className="text-xs text-walnut-500">{date(i.at.slice(0, 10))} u {time}{i.handledBy ? ` · ${i.handledBy}` : ''}</span>
        </div>
        <div className="mt-1.5 font-display text-lg font-semibold">{i.name}</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <a className="inline-flex items-center gap-1 font-semibold text-copper-700 hover:underline" href={`tel:${i.phone.replace(/[^\d+]/g, '')}`}><Phone className="size-3.5" />{i.phone}</a>
          {i.email && <a className="text-walnut-700 hover:underline" href={`mailto:${i.email}`}>{i.email}</a>}
        </div>
        {i.date && <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-sm font-semibold text-sky-800"><Calendar className="size-4" />{date(i.date)} u {i.slot}{i.address ? ` · ${i.address}` : ' · u salonu'}</div>}
        <div className="mt-2 space-y-1 text-sm text-walnut-700">
          {(i.room || i.dimensions) && <div className="flex items-center gap-1.5"><Ruler className="size-3.5 text-walnut-400" />{[i.room, i.dimensions].filter(Boolean).join(' · ')}</div>}
          {i.product && <div><b>Artikal:</b> {i.product}</div>}
          {i.message && <p className="whitespace-pre-wrap">{i.message}</p>}
          {i.advice && <div className="flex gap-1.5 rounded-lg bg-copper-50 px-2.5 py-1.5 text-xs text-copper-800"><Sparkles className="mt-0.5 size-3.5 shrink-0" />{i.advice}</div>}
          {i.source && <div className="text-xs text-walnut-400">Poslano sa stranice {i.source}</div>}
        </div>
        {i.photos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {i.photos.map((p) => <a key={p} href={`/api/web-upit-foto/${p}`} target="_blank" rel="noopener" title="Otvori fotografiju"><img src={`/api/web-upit-foto/${p}`} alt="" className="size-16 rounded-lg object-cover ring-1 ring-walnut-200" loading="lazy" /></a>)}
            <span className="inline-flex items-center gap-1 text-xs text-walnut-500"><Camera className="size-3.5" />{i.photos.length}</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Select label="Status" value={i.status} onChange={setStatus} options={opts(INQUIRY_STATUS)} />
        <Field label="Bilješka (interno)">
          <textarea className={inputCls} rows={2} value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== i.note && setStatus(i.status)} placeholder="npr. zvala 19. 11., dolazi u subotu" />
        </Field>
        {i.customerId ? (
          <a href={`/kupci`} className="text-xs font-semibold text-emerald-700">✓ Dodan u kupce</a>
        ) : (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => run(() => webInquiryToCustomerFn({ data: { id: i.id, name: i.name } }), 'Kupac je dodan u Kupce.')}><UserPlus className="size-3.5" /> Dodaj u kupce</Button>
        )}
      </div>
    </li>
  )
}

const FILTERS: Record<ProductFilter, string> = { svi: 'Svi', naWebu: 'Vidljivi na webu', istaknuti: 'Istaknuti na naslovnici', akcija: 'Na akciji' }
const MAX_IMAGES = 6

function Items({ list, busy, run, initialFilter = 'svi' }: { list: WebItemRow[]; busy: boolean; run: Run; initialFilter?: ProductFilter }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<ProductFilter>(initialFilter)
  const [edit, setEdit] = useState<WebItemRow | 'novi' | null>(null)
  const count = (f: ProductFilter) => list.filter((p) => matches(p, f)).length
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return list.filter((p) => matches(p, filter) && (!s || `${p.name} ${p.typeLabel}`.toLowerCase().includes(s)))
  }, [list, q, filter])
  const paged = usePaged(shown, `${q}|${filter}`)
  return (
    <>
      <Card className="mb-4">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Artikli koje prikazujemo na web stranici</div>
            <p className="mt-1 text-sm text-walnut-600">Ovo je <b>poseban popis samo za web</b> — nije povezan s Artiklima, zalihama ni cijenama u aplikaciji. Što ovdje upišeš, to kupci vide na webu (za najviše 30 min).</p>
          </div>
          <Button variant="copper" onClick={() => setEdit('novi')}><Plus className="size-4" /> Novi artikal za web</Button>
        </div>
      </Card>
      <Card flush>
        <div className="flex flex-wrap items-center gap-2 border-b border-walnut-200/70 px-5 py-3">
          {(Object.keys(FILTERS) as ProductFilter[]).map((f) => <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{FILTERS[f]} ({count(f)})</Chip>)}
          <label className="relative ml-auto min-w-56 flex-1 sm:max-w-xs"><Search className="absolute left-2.5 top-2.5 size-4 text-walnut-400" /><input className={`${inputCls} pl-8`} placeholder="Traži po nazivu…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        </div>
        {shown.length === 0 ? (
          <EmptyState icon={Globe} title={list.length ? 'Nema takvog artikla' : 'Još nema artikala za web'}>
            {list.length ? 'Provjeri naziv ili odaberi „Svi”.' : <>Klikni „Novi artikal za web”, dodaj fotografije, naziv i cijenu. Dok ovdje nema ničega, katalog na webu je prazan.</>}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-walnut-100">
            {paged.rows.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-2.5">
                {p.imageIds[0] ? <img src={`/api/web/mediji/${p.imageIds[0]}`} alt="" className="size-12 rounded-lg object-cover" loading="lazy" /> : <span className="grid size-12 place-items-center rounded-lg bg-walnut-100 text-center text-[10px] leading-tight text-walnut-500">bez<br />slike</span>}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{p.name} {p.featured && <Star className="inline size-3.5 fill-amber-400 text-amber-500" />}</div>
                  <div className="text-xs text-walnut-500">{[p.typeLabel, WEB_ROOMS[p.room as keyof typeof WEB_ROOMS], WEB_AVAIL[p.avail as keyof typeof WEB_AVAIL], p.imageIds.length > 1 ? `${p.imageIds.length} fotografije` : ''].filter(Boolean).join(' · ')}</div>
                </div>
                <div className="hidden text-right text-sm font-semibold sm:block">{money(p.price)}{p.oldPrice ? <div className="text-xs font-normal text-walnut-400 line-through">{money(p.oldPrice)}</div> : null}</div>
                {p.visible && p.imageIds.length ? <Badge tone="good"><Eye className="size-3" /> na webu</Badge> : <Badge><EyeOff className="size-3" /> skriven</Badge>}
                <Button variant="outline" size="sm" onClick={() => setEdit(p)}>Uredi</Button>
              </li>
            ))}
          </ul>
        )}
        <Pager {...paged} className="border-t border-walnut-100 px-5 py-3" />
      </Card>
      {edit && <ItemDialog p={edit === 'novi' ? null : edit} busy={busy} run={run} onClose={() => setEdit(null)} />}
    </>
  )
}

function matches(p: WebItemRow, f: ProductFilter) {
  if (f === 'naWebu') return p.visible && p.imageIds.length > 0
  if (f === 'istaknuti') return p.visible && p.featured
  if (f === 'akcija') return p.visible && !!p.oldPrice && p.oldPrice > p.price
  return true
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-walnut-200/80 p-4">
      <div className="mb-3 flex items-center gap-2"><span className="grid size-6 place-items-center rounded-full bg-copper-600 text-xs font-bold text-white">{n}</span><span className="font-semibold">{title}</span></div>
      {children}
    </section>
  )
}

const EMPTY = { name: '', typeLabel: '', room: 'dnevni-boravak', style: 'moderni', color: 'svijetla', material: 'tkanina', avail: 'stanje', price: '', oldPrice: '', description: '', dimensions: '', materials: '', personal: '', swatches: '', slug: '', featured: false, visible: true }
const num = (s: string) => Number(s.replace(/\s|KM/gi, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')) || 0

function ItemDialog({ p, busy, run, onClose }: { p: WebItemRow | null; busy: boolean; run: Run; onClose: () => void }) {
  const [v, setV] = useState(() => (p ? { ...EMPTY, ...p, price: String(p.price), oldPrice: p.oldPrice ? String(p.oldPrice) : '' } : EMPTY))
  const [images, setImages] = useState<string[]>(p?.imageIds ?? [])
  const [notes, setNotes] = useState<Record<string, { warnings: string[]; done: string[] }>>({})
  const warned = images.map((id, i) => ({ n: i + 1, w: notes[id]?.warnings ?? [] })).filter((x) => x.w.length)
  const lastDone = [...images].reverse().map((id) => notes[id]?.done).find(Boolean)
  const [more, setMore] = useState(false)
  const [uploading, setUploading] = useState(0)
  const [over, setOver] = useState(false)
  const [err, setErr] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }))
  const txt = (k: 'typeLabel' | 'dimensions' | 'materials' | 'personal' | 'swatches' | 'slug', label: string, hint?: string, ph?: string) => (
    <Field label={label} hint={hint}><input className={inputCls} value={v[k]} placeholder={ph} onChange={(e) => set(k, e.target.value)} /></Field>
  )
  const price = num(v.price)
  const old = num(v.oldPrice)
  const slug = v.slug || p?.slug || '…'
  const where = [
    { on: true, text: `Katalog → ${WEB_ROOMS[v.room as keyof typeof WEB_ROOMS]}`, href: `${WEB_URL}/namjestaj/${v.room}/` },
    { on: !!p, text: 'Vlastita stranica artikla', href: `${WEB_URL}/namjestaj/${v.room}/${slug}/` },
    { on: v.featured, text: 'Naslovnica → Izdvojeno iz salona', href: `${WEB_URL}/` },
    { on: old > price && price > 0, text: `Akcije (precrtano ${money(old)})`, href: `${WEB_URL}/akcije/` },
  ].filter((w) => w.on)

  const upload = async (list?: FileList | null) => {
    const files = Array.from(list ?? []).slice(0, MAX_IMAGES - images.length)
    if (!files.length) return
    setErr('')
    setUploading(files.length)
    try {
      for (const f of files) {
        const img = await prepareWebPhoto(f)
        const r = await run(() => uploadWebItemImageFn({ data: { image: img.image } }))
        if (r) {
          setImages((s) => [...s, r.id])
          setNotes((s) => ({ ...s, [r.id]: { warnings: img.warnings, done: img.done } }))
        }
        setUploading((n) => n - 1)
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Fotografija nije spremljena.')
    } finally {
      setUploading(0)
      if (file.current) file.current.value = ''
    }
  }
  const move = (i: number) => setImages((s) => [s[i], ...s.filter((_, j) => j !== i)])
  const remove = (i: number) => setImages((s) => s.filter((_, j) => j !== i))

  const save = async () => {
    setErr('')
    if (v.name.trim().length < 2) return setErr('Upiši naziv artikla.')
    if (!price) return setErr('Upiši cijenu u KM.')
    if (old && old <= price) return setErr(`Stara cijena mora biti veća od cijene (${money(price)}) — ili ostavi prazno.`)
    if (v.visible && !images.length) return setErr('Dodaj barem jednu fotografiju (korak 1).')
    const ok = await run(() => saveWebItemFn({ data: { ...v, id: p?.id, price, oldPrice: old || null, imageIds: images } }), v.visible ? 'Spremljeno. Na webu je za najviše 30 minuta.' : 'Spremljeno. Artikal je skriven s weba.')
    if (ok) onClose()
  }
  const del = async () => {
    if (!p || !confirm(`Obrisati „${p.name}” s weba? Fotografije se brišu, ovo se ne može vratiti.`)) return
    if (await run(() => deleteWebItemFn({ data: { id: p.id, name: p.name } }), 'Artikal je obrisan s weba.')) onClose()
  }

  return (
    <Modal title={p ? `Artikal za web: ${p.name}` : 'Novi artikal za web'} subtitle="Poseban popis samo za web — ne mijenja Artikle u aplikaciji" onClose={onClose} help="web" wide
      footer={<div className="flex flex-wrap items-center justify-end gap-2">
        {p && <Button variant="ghost" className="mr-auto text-rose-700" disabled={busy} onClick={del}><Trash2 className="size-4" /> Obriši</Button>}
        {err && <span className={`${p ? '' : 'mr-auto '}text-sm text-rose-600`}>{err}</span>}
        <Button variant="ghost" onClick={onClose}>Odustani</Button>
        <Button variant="copper" disabled={busy || uploading > 0} onClick={save}>Spremi</Button>
      </div>}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 space-y-4">
          <Step n={1} title={`Fotografije (do ${MAX_IMAGES})`}>
            <div
              className={`flex flex-wrap items-start gap-3 rounded-xl ${over ? 'ring-2 ring-copper-400' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setOver(true) }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files) }}
            >
              {images.map((id, i) => (
                <div key={id} className="relative">
                  <img src={`/api/web/mediji/${id}`} alt="" className={`size-28 rounded-xl object-cover ring-1 ${i === 0 ? 'ring-2 ring-copper-500' : 'ring-walnut-200'}`} />
                  {i === 0 ? <span className="absolute left-1.5 top-1.5 rounded bg-copper-600 px-1.5 py-0.5 text-[10px] font-bold text-white">glavna</span>
                    : <button type="button" onClick={() => move(i)} className="absolute inset-x-1.5 bottom-1.5 rounded bg-white/90 px-1 py-0.5 text-[10px] font-semibold text-walnut-800 shadow hover:bg-white">učini glavnom</button>}
                  <button type="button" onClick={() => remove(i)} title="Ukloni fotografiju" className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-white/90 text-rose-700 shadow hover:bg-white"><X className="size-3.5" /></button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button type="button" disabled={uploading > 0} onClick={() => file.current?.click()} className="grid size-28 place-items-center rounded-xl border-2 border-dashed border-copper-300 bg-copper-50/50 text-center text-xs font-semibold text-copper-700 hover:bg-copper-50">
                  {uploading ? <span><Loader2 className="mx-auto mb-1 size-6 animate-spin" />Spremam…</span> : <span><ImagePlus className="mx-auto mb-1 size-6" />Klikni ili<br />povuci fotografije</span>}
                </button>
              )}
              <input ref={file} type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
            </div>
            {warned.length > 0 && (
              <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {warned.map((x) => <div key={x.n}><b>Fotografija {x.n}:</b> {x.w.join('; ')}. Bolje je snimiti ponovno ili je ukloni (✕).</div>)}
              </div>
            )}
            {lastDone && <p className="mt-2 text-xs text-emerald-800">✓ Sustav je obradio fotografiju: {lastDone.join(', ')}.</p>}
            <p className="mt-2 text-xs text-walnut-600">Svaku fotografiju sustav sam priredi za web: isti oblik kao na webu (4:3), ujednačena svjetlina i kontrast, izoštravanje. Prva je glavna (vidi se u katalogu). Najbolje: cijeli komad, svijetlo, bez nereda okolo.</p>
          </Step>
          <Step n={2} title="Naziv i cijena">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Naziv na webu"><input className={inputCls} value={v.name} maxLength={90} onChange={(e) => set('name', e.target.value)} placeholder="npr. Grande ugaona garnitura" /></Field>
              {txt('typeLabel', 'Vrsta', 'kratko, ispod naziva', 'npr. Ugaona garnitura')}
              <Field label="Cijena (KM, s PDV-om)"><input className={inputCls} inputMode="decimal" value={v.price} onChange={(e) => set('price', e.target.value)} placeholder="npr. 2490" /></Field>
              <Field label="Stara cijena — samo za akciju" hint="prazno = nije na akciji"><input className={inputCls} inputMode="decimal" value={v.oldPrice} onChange={(e) => set('oldPrice', e.target.value)} placeholder="npr. 2990" /></Field>
              <Select label="Prostorija (stranica kataloga)" value={v.room} onChange={(x) => set('room', x)} options={opts(WEB_ROOMS)} />
              <Select label="Dostupnost" value={v.avail} onChange={(x) => set('avail', x)} options={opts(WEB_AVAIL)} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip active={v.visible} onClick={() => set('visible', !v.visible)}>{v.visible ? '✓ Vidljiv na webu' : 'Vidljiv na webu'}</Chip>
              <Chip active={v.featured} onClick={() => set('featured', !v.featured)}>{v.featured ? '★ Istaknut na naslovnici' : '☆ Istaknut na naslovnici'}</Chip>
            </div>
          </Step>
          <Step n={3} title="Opis za kupce">
            <Field label="Kratki opis"><textarea className={inputCls} rows={3} value={v.description} onChange={(e) => set('description', e.target.value)} placeholder="Dvije-tri rečenice: za koga je, što ga čini dobrim izborom." /></Field>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {txt('dimensions', 'Mjere', 'npr. 290 × 205 cm')}
              {txt('materials', 'Materijali', 'npr. tkanina, sanduk za posteljinu')}
            </div>
            <button type="button" className="mt-3 text-xs font-semibold text-copper-700 hover:underline" onClick={() => setMore((m) => !m)}>{more ? '− Sakrij dodatna polja' : '+ Dodatna polja (filteri, boje, adresa)'}</button>
            {more && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Select label="Stil (filter)" value={v.style} onChange={(x) => set('style', x)} options={opts(WEB_STYLES)} />
                <Select label="Boja (filter)" value={v.color} onChange={(x) => set('color', x)} options={opts(WEB_COLORS)} />
                <Select label="Materijal (filter)" value={v.material} onChange={(x) => set('material', x)} options={opts(WEB_MATERIALS)} />
                {txt('personal', 'Personalizacija', 'npr. lijevi ili desni ugao, 12 boja tkanine')}
                {txt('swatches', 'Boje (kružići)', 'hex kodovi odvojeni zarezom, npr. #E8E2D8, #B9B2A6')}
                {txt('slug', 'Adresa na webu', 'prazno = iz naziva')}
              </div>
            )}
          </Step>
        </div>
        <aside className="h-fit rounded-xl bg-walnut-50 p-4 lg:sticky lg:top-0">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-walnut-500">Gdje će se vidjeti</div>
          {!v.visible ? (
            <p className="text-sm text-walnut-600">Nigdje — artikal je skriven. Uključi „Vidljiv na webu”.</p>
          ) : !images.length ? (
            <p className="text-sm text-amber-800">Nigdje dok ne dodaš fotografiju (korak 1).</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {where.map((w) => <li key={w.text}><a href={w.href} target="_blank" rel="noopener" className="inline-flex items-start gap-1.5 text-walnut-800 hover:text-copper-700"><ExternalLink className="mt-0.5 size-3.5 shrink-0 text-copper-600" />{w.text}</a></li>)}
            </ul>
          )}
          <p className="mt-3 border-t border-walnut-200 pt-3 text-[11px] text-walnut-500">Naziv, cijena i dostupnost upisuju se ovdje i ne mijenjaju se kad se promijeni nešto u Artiklima. Linkovi rade nakon osvježavanja weba (do 30 min).</p>
          {p?.updatedBy && <p className="mt-2 text-[11px] text-walnut-400">Zadnja izmjena: {p.updatedBy}{p.updatedAt ? `, ${date(p.updatedAt.slice(0, 10))}` : ''}</p>}
        </aside>
      </div>
    </Modal>
  )
}
