import { createFileRoute } from '@tanstack/react-router'
import { Calendar, Camera, Eye, EyeOff, Globe, Inbox, Phone, Ruler, Search, Sparkles, Star, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../components/Modal'
import { WebArticles, WebTexts } from '../components/WebCms'
import { Badge, Button, Card, Chip, EmptyState, Field, inputCls, PageHeader, Segmented, Select, Stat } from '../components/ui'
import { date, money } from '../lib/format'
import { useRemote } from '../lib/remote'
import { INQUIRY_KINDS, INQUIRY_STATUS, WEB_COLORS, WEB_MATERIALS, WEB_ROOMS, WEB_STYLES } from '../lib/web'
import { getWebFn, saveWebProductFn, setWebInquiryStatusFn, webInquiryToCustomerFn } from '../server/api'
import type { WebAdminProduct, WebInquiryRow } from '../server/web'

export const Route = createFileRoute('/web')({ component: WebPage })

const WEB_URL = 'https://www.ardornamjestaj.com'
const kindTone: Record<string, string> = { ponuda: 'copper', posjet: 'info', mjerenje: 'violet' }
const statusTone: Record<string, string> = { novo: 'warn', u_obradi: 'info', zatvoreno: 'good' }
const opts = (m: Record<string, string>) => Object.entries(m).map(([value, label]) => ({ value, label }))

function WebPage() {
  const r = useRemote(() => getWebFn(), [])
  const canProducts = !!r.data?.products.length
  const [tab, setTab] = useState<'upiti' | 'tekstovi' | 'clanci' | 'artikli'>('upiti')
  const inq = r.data?.inquiries ?? []
  const fresh = inq.filter((i) => i.status === 'novo')

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Prodaja"
        title="Web stranica"
        description="Upiti kupaca s ardornamjestaj.com, tekstovi i članci na webu, artikli koji se prikazuju."
        actions={<a href={WEB_URL} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-lg border border-walnut-200 bg-linen px-3.5 py-2 text-sm font-semibold text-walnut-900 shadow-sm hover:bg-white"><Globe className="size-4" /> Otvori web</a>}
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat tone={fresh.length ? 'warn' : 'good'} icon={Inbox} label="Novi upiti" value={String(fresh.length)} hint="čekaju poziv" />
        <Stat label="U obradi" value={String(inq.filter((i) => i.status === 'u_obradi').length)} hint="neko je preuzeo" />
        <Stat label="Zakazani posjeti i mjerenja" value={String(inq.filter((i) => i.kind !== 'ponuda' && i.status !== 'zatvoreno').length)} hint="otvoreni termini" />
        {canProducts && <Stat label="Artikala na webu" value={String(r.data!.products.filter((p) => p.web.visible).length)} hint={`od ${r.data!.products.length} aktivnih`} />}
      </div>
      {r.error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{r.error}</p>}
      <div className="mb-4 overflow-x-auto">
        <Segmented value={tab} onChange={setTab} options={[
          { value: 'upiti', label: `Upiti (${inq.length})` },
          { value: 'tekstovi', label: 'Tekstovi na webu' },
          { value: 'clanci', label: 'Članci' },
          ...(canProducts ? [{ value: 'artikli' as const, label: 'Artikli na webu' }] : []),
        ]} />
      </div>
      {tab === 'tekstovi' ? (
        <WebTexts />
      ) : tab === 'clanci' ? (
        <WebArticles />
      ) : !r.data ? (
        <Card><div className="py-10 text-center text-sm text-walnut-500">Učitavam…</div></Card>
      ) : tab === 'upiti' || !canProducts ? (
        <Inquiries list={inq} busy={r.busy} run={r.run} />
      ) : (
        <Products list={r.data.products} busy={r.busy} run={r.run} />
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

function Products({ list, busy, run }: { list: WebAdminProduct[]; busy: boolean; run: Run }) {
  const [q, setQ] = useState('')
  const [only, setOnly] = useState(false)
  const [edit, setEdit] = useState<WebAdminProduct | null>(null)
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return list.filter((p) => (!only || p.web.visible) && (!s || `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(s)))
  }, [list, q, only])
  return (
    <>
      <Card flush>
        <div className="flex flex-wrap items-center gap-3 border-b border-walnut-200/70 px-5 py-3">
          <label className="relative min-w-56 flex-1"><Search className="absolute left-2.5 top-2.5 size-4 text-walnut-400" /><input className={`${inputCls} pl-8`} placeholder="Traži artikal…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          <Chip active={only} onClick={() => setOnly((v) => !v)}>Samo vidljivi na webu</Chip>
        </div>
        <ul className="divide-y divide-walnut-100">
          {shown.map((p) => (
            <li key={p.productId} className="flex items-center gap-3 px-5 py-2.5">
              {p.thumbId ? <img src={`/api/slike/${p.thumbId}`} alt="" className="size-12 rounded-lg object-cover" loading="lazy" /> : <span className="grid size-12 place-items-center rounded-lg bg-walnut-100 text-[10px] text-walnut-500">bez slike</span>}
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{p.name} {p.web.featured && <Star className="inline size-3.5 text-amber-500" />}</div>
                <div className="text-xs text-walnut-500">{p.sku} · {p.category} · {WEB_ROOMS[p.web.room as keyof typeof WEB_ROOMS]}{p.web.oldPrice ? ` · akcija (bilo ${money(p.web.oldPrice)})` : ''}</div>
              </div>
              <div className="hidden text-sm font-semibold sm:block">{money(p.price)}</div>
              {p.web.visible ? <Badge tone="good"><Eye className="size-3" /> na webu</Badge> : <Badge><EyeOff className="size-3" /> skriven</Badge>}
              <Button variant="outline" size="sm" onClick={() => setEdit(p)}>Uredi</Button>
            </li>
          ))}
        </ul>
      </Card>
      {edit && <ProductDialog p={edit} busy={busy} onClose={() => setEdit(null)} onSave={async (v) => { if (await run(() => saveWebProductFn({ data: v }), 'Spremljeno. Na webu se vidi nakon ponovne izgradnje stranice.')) setEdit(null) }} />}
    </>
  )
}

function ProductDialog({ p, busy, onClose, onSave }: { p: WebAdminProduct; busy: boolean; onClose: () => void; onSave: (v: Parameters<typeof saveWebProductFn>[0]['data']) => void }) {
  const [v, setV] = useState({ ...p.web, oldPrice: p.web.oldPrice ? String(p.web.oldPrice) : '' })
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }))
  const txt = (k: 'typeLabel' | 'dimensions' | 'materials' | 'personal' | 'swatches' | 'slug', label: string, hint?: string) => (
    <Field label={label} hint={hint}><input className={inputCls} value={v[k]} onChange={(e) => set(k, e.target.value)} /></Field>
  )
  return (
    <Modal title={`Web: ${p.name}`} subtitle={`${p.sku} · ${money(p.price)}`} onClose={onClose} help="web" wide
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Odustani</Button><Button variant="copper" disabled={busy} onClick={() => onSave({ productId: p.productId, name: p.name, ...v, oldPrice: v.oldPrice ? Number(v.oldPrice.replace(',', '.')) : null })}>Spremi</Button></div>}>
      {!p.hasImage && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Artikal nema fotografiju — dodaj je u Artiklima prije stavljanja na web.</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        <Chip active={v.visible} onClick={() => set('visible', !v.visible)}>{v.visible ? '✓ Vidljiv na webu' : 'Vidljiv na webu'}</Chip>
        <Chip active={v.featured} onClick={() => set('featured', !v.featured)}>{v.featured ? '★ Istaknut na početnoj' : 'Istaknut na početnoj'}</Chip>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Prostorija" value={v.room} onChange={(x) => set('room', x)} options={opts(WEB_ROOMS)} />
        <Select label="Stil" value={v.style} onChange={(x) => set('style', x)} options={opts(WEB_STYLES)} />
        <Select label="Boja" value={v.color} onChange={(x) => set('color', x)} options={opts(WEB_COLORS)} />
        <Select label="Materijal" value={v.material} onChange={(x) => set('material', x)} options={opts(WEB_MATERIALS)} />
        {txt('typeLabel', 'Vrsta (na webu)', `npr. „Ugaona garnitura”; prazno = kategorija (${p.category})`)}
        {txt('dimensions', 'Mjere', 'npr. 290 × 205 cm')}
        {txt('materials', 'Materijali', 'npr. tkanina, sanduk za posteljinu')}
        {txt('personal', 'Personalizacija', 'npr. lijevi ili desni ugao, 12 boja tkanine')}
        {txt('swatches', 'Boje (kružići)', 'hex kodovi odvojeni zarezom, npr. #E8E2D8, #B9B2A6')}
        <Field label="Stara cijena (akcija)" hint={`Veća od ${money(p.price)}; prazno = nema akcije`}><input className={inputCls} inputMode="decimal" value={v.oldPrice} onChange={(e) => set('oldPrice', e.target.value)} /></Field>
        {txt('slug', 'Adresa na webu', `${WEB_URL}/namjestaj/${v.room}/${v.slug}/`)}
      </div>
      <Field label="Opis za web" className="mt-3"><textarea className={inputCls} rows={4} value={v.description} onChange={(e) => set('description', e.target.value)} placeholder="Dvije-tri rečenice: za koga je, što ga čini dobrim izborom." /></Field>
    </Modal>
  )
}
