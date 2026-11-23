import { createFileRoute } from '@tanstack/react-router'
import { Calendar, Camera, ExternalLink, Eye, EyeOff, Globe, ImagePlus, Inbox, Loader2, Phone, Ruler, Search, Sparkles, Star, UserPlus } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Modal } from '../components/Modal'
import { Pager, usePaged } from '../components/Pager'
import { WebArticles, WebOverview, WebTexts, type GoTo, type ProductFilter, type WebTab } from '../components/WebCms'
import { Badge, Button, Card, Chip, EmptyState, Field, inputCls, PageHeader, Segmented, Select, Stat } from '../components/ui'
import { date, money } from '../lib/format'
import { prepareImage } from '../lib/image'
import { useRemote } from '../lib/remote'
import { INQUIRY_KINDS, INQUIRY_STATUS, WEB_COLORS, WEB_MATERIALS, WEB_ROOMS, WEB_STYLES } from '../lib/web'
import { WEB_SITE_URL } from '../lib/webContent'
import { getWebFn, saveWebProductFn, setProductImageFn, setWebInquiryStatusFn, webInquiryToCustomerFn } from '../server/api'
import type { WebAdminProduct, WebInquiryRow } from '../server/web'

export const Route = createFileRoute('/web')({ component: WebPage })

const WEB_URL = WEB_SITE_URL
const kindTone: Record<string, string> = { ponuda: 'copper', posjet: 'info', mjerenje: 'violet' }
const statusTone: Record<string, string> = { novo: 'warn', u_obradi: 'info', zatvoreno: 'good' }
const opts = (m: Record<string, string>) => Object.entries(m).map(([value, label]) => ({ value, label }))

function WebPage() {
  const r = useRemote(() => getWebFn(), [])
  const canProducts = !!r.data?.products.length
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
        {canProducts && <Stat label="Artikala na webu" value={String(r.data!.products.filter((p) => p.web.visible && p.hasImage).length)} hint={`od ${r.data!.products.length} aktivnih`} />}
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
        <Products key={nav.n} list={r.data.products} busy={r.busy} run={r.run} initialFilter={nav.filter} />
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

const FILTERS: Record<ProductFilter, string> = { svi: 'Svi artikli', naWebu: 'Na webu', istaknuti: 'Istaknuti na naslovnici', akcija: 'Na akciji' }

function Products({ list, busy, run, initialFilter = 'naWebu' }: { list: WebAdminProduct[]; busy: boolean; run: Run; initialFilter?: ProductFilter }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<ProductFilter>(initialFilter)
  const [editId, setEditId] = useState<string | null>(null)
  const edit = editId ? list.find((p) => p.productId === editId) ?? null : null
  const count = (f: ProductFilter) => list.filter((p) => matches(p, f)).length
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return list.filter((p) => matches(p, filter) && (!s || `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(s)))
  }, [list, q, filter])
  const paged = usePaged(shown, `${q}|${filter}`)
  return (
    <>
      <Card className="mb-4">
        <div className="text-sm font-semibold">Kako staviti artikal na web</div>
        <ol className="mt-1 grid gap-1 text-sm text-walnut-600 sm:grid-cols-4">
          <li><b className="text-copper-700">1.</b> Odaberi „Svi artikli” i upiši naziv.</li>
          <li><b className="text-copper-700">2.</b> Klikni „Stavi na web”.</li>
          <li><b className="text-copper-700">3.</b> Dodaj fotografiju i odaberi prostoriju.</li>
          <li><b className="text-copper-700">4.</b> „Spremi” — na webu je za najviše 30 min.</li>
        </ol>
      </Card>
      <Card flush>
        <div className="flex flex-wrap items-center gap-2 border-b border-walnut-200/70 px-5 py-3">
          {(Object.keys(FILTERS) as ProductFilter[]).map((f) => <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{FILTERS[f]} ({count(f)})</Chip>)}
          <label className="relative ml-auto min-w-56 flex-1 sm:max-w-xs"><Search className="absolute left-2.5 top-2.5 size-4 text-walnut-400" /><input className={`${inputCls} pl-8`} placeholder="Traži artikal po nazivu ili šifri…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        </div>
        {shown.length === 0 ? (
          <EmptyState icon={Globe} title={filter === 'svi' ? 'Nema takvog artikla' : 'Ovdje još nema artikala'}>
            {filter === 'svi' ? 'Provjeri naziv ili šifru.' : <>Odaberi „Svi artikli”, pronađi artikal i klikni „Stavi na web”.</>}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-walnut-100">
            {paged.rows.map((p) => {
              const live = p.web.visible && p.hasImage
              return (
                <li key={p.productId} className="flex items-center gap-3 px-5 py-2.5">
                  {p.thumbId ? <img src={`/api/slike/${p.thumbId}`} alt="" className="size-12 rounded-lg object-cover" loading="lazy" /> : <span className="grid size-12 place-items-center rounded-lg bg-walnut-100 text-center text-[10px] leading-tight text-walnut-500">bez<br />slike</span>}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{p.name} {p.web.featured && <Star className="inline size-3.5 fill-amber-400 text-amber-500" />}</div>
                    <div className="text-xs text-walnut-500">{p.sku} · {p.category}{p.web.configured ? ` · ${WEB_ROOMS[p.web.room as keyof typeof WEB_ROOMS]}` : ''}{p.web.oldPrice ? ` · akcija (bilo ${money(p.web.oldPrice)})` : ''}</div>
                  </div>
                  <div className="hidden text-sm font-semibold sm:block">{money(p.price)}</div>
                  {live ? <Badge tone="good"><Eye className="size-3" /> na webu</Badge> : p.web.visible ? <Badge tone="warn">fali fotografija</Badge> : <Badge><EyeOff className="size-3" /> nije na webu</Badge>}
                  <Button variant={p.web.visible ? 'outline' : 'copper'} size="sm" onClick={() => setEditId(p.productId)}>{p.web.visible ? 'Uredi' : 'Stavi na web'}</Button>
                </li>
              )
            })}
          </ul>
        )}
        <Pager {...paged} className="border-t border-walnut-100 px-5 py-3" />
      </Card>
      {edit && <ProductDialog p={edit} busy={busy} run={run} onClose={() => setEditId(null)} />}
    </>
  )
}

function matches(p: WebAdminProduct, f: ProductFilter) {
  if (f === 'naWebu') return p.web.visible
  if (f === 'istaknuti') return p.web.visible && p.web.featured
  if (f === 'akcija') return p.web.visible && !!p.web.oldPrice && p.web.oldPrice > p.price
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

function ProductDialog({ p, busy, run, onClose }: { p: WebAdminProduct; busy: boolean; run: Run; onClose: () => void }) {
  const [v, setV] = useState({ ...p.web, visible: p.web.configured ? p.web.visible : true, oldPrice: p.web.oldPrice ? String(p.web.oldPrice) : '' })
  const [more, setMore] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [over, setOver] = useState(false)
  const [err, setErr] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }))
  const txt = (k: 'typeLabel' | 'dimensions' | 'materials' | 'personal' | 'swatches' | 'slug', label: string, hint?: string) => (
    <Field label={label} hint={hint}><input className={inputCls} value={v[k]} onChange={(e) => set(k, e.target.value)} /></Field>
  )
  const old = Number(v.oldPrice.replace(',', '.')) || 0
  const where = [
    { on: true, text: `Katalog → ${WEB_ROOMS[v.room as keyof typeof WEB_ROOMS]}`, href: `${WEB_URL}/namjestaj/${v.room}/` },
    { on: true, text: 'Vlastita stranica artikla', href: `${WEB_URL}/namjestaj/${v.room}/${v.slug}/` },
    { on: v.featured, text: 'Naslovnica → Izdvojeno iz salona', href: `${WEB_URL}/` },
    { on: old > p.price, text: `Akcije (precrtano ${money(old)})`, href: `${WEB_URL}/akcije/` },
  ].filter((w) => w.on)

  const upload = async (f?: File) => {
    if (!f) return
    setErr('')
    setUploading(true)
    try {
      const img = await prepareImage(f)
      await run(() => setProductImageFn({ data: { productId: p.productId, image: img } }), 'Fotografija je spremljena (vidi se i u Artiklima).')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Fotografija nije spremljena.')
    } finally {
      setUploading(false)
      if (file.current) file.current.value = ''
    }
  }
  const save = async () => {
    setErr('')
    if (v.visible && !p.hasImage) return setErr('Prvo dodaj fotografiju — bez nje artikal ne može na web.')
    if (old && old <= p.price) return setErr(`Stara cijena mora biti veća od trenutne (${money(p.price)}).`)
    if (await run(() => saveWebProductFn({ data: { productId: p.productId, name: p.name, ...v, oldPrice: old || null } }), v.visible ? 'Spremljeno. Na webu je za najviše 30 minuta.' : 'Spremljeno. Artikal je skriven s weba.')) onClose()
  }

  return (
    <Modal title={p.web.visible ? `Na webu: ${p.name}` : `Stavi na web: ${p.name}`} subtitle={`${p.sku} · ${money(p.price)} (cijena i naziv iz Artikala)`} onClose={onClose} help="web" wide
      footer={<div className="flex flex-wrap items-center justify-end gap-2">
        {err && <span className="mr-auto text-sm text-rose-600">{err}</span>}
        <Button variant="ghost" onClick={onClose}>Odustani</Button>
        <Button variant="copper" disabled={busy || uploading} onClick={save}>Spremi</Button>
      </div>}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 space-y-4">
          <Step n={1} title="Fotografija">
            <div
              className={`flex flex-wrap items-center gap-4 rounded-xl ${over ? 'ring-2 ring-copper-400' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setOver(true) }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files?.[0]) }}
            >
              {p.thumbId ? (
                <img src={`/api/slike/${p.thumbId}`} alt="" className="size-32 rounded-xl object-cover ring-1 ring-walnut-200" />
              ) : (
                <button type="button" onClick={() => file.current?.click()} className="grid size-32 place-items-center rounded-xl border-2 border-dashed border-copper-300 bg-copper-50/50 text-center text-xs font-semibold text-copper-700 hover:bg-copper-50">
                  <span><ImagePlus className="mx-auto mb-1 size-6" />Klikni ili<br />povuci fotografiju</span>
                </button>
              )}
              <div className="min-w-0 flex-1 text-sm text-walnut-600">
                <Button variant={p.hasImage ? 'outline' : 'copper'} size="sm" disabled={uploading} onClick={() => file.current?.click()}>
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} {uploading ? 'Spremam…' : p.hasImage ? 'Zamijeni fotografiju' : 'Dodaj fotografiju'}
                </Button>
                <p className="mt-2 text-xs">Fotografija s mobitela je u redu — sama se smanji. Najbolje: cijeli komad, svijetlo, bez nereda okolo. Ista fotografija se vidi i u Artiklima.</p>
              </div>
              <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            </div>
          </Step>
          <Step n={2} title="Gdje se prikazuje">
            <div className="mb-3 flex flex-wrap gap-2">
              <Chip active={v.visible} onClick={() => set('visible', !v.visible)}>{v.visible ? '✓ Vidljiv na webu' : 'Vidljiv na webu'}</Chip>
              <Chip active={v.featured} onClick={() => set('featured', !v.featured)}>{v.featured ? '★ Istaknut na naslovnici' : '☆ Istaknut na naslovnici'}</Chip>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Prostorija (stranica kataloga)" value={v.room} onChange={(x) => set('room', x)} options={opts(WEB_ROOMS)} />
              <Field label="Stara cijena — samo za akciju" hint={`Veća od ${money(p.price)}; prazno = nije na akciji`}><input className={inputCls} inputMode="decimal" value={v.oldPrice} onChange={(e) => set('oldPrice', e.target.value)} placeholder="npr. 3490" /></Field>
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
                {txt('typeLabel', 'Vrsta (na webu)', `npr. „Ugaona garnitura”; prazno = ${p.category}`)}
                {txt('personal', 'Personalizacija', 'npr. lijevi ili desni ugao, 12 boja tkanine')}
                {txt('swatches', 'Boje (kružići)', 'hex kodovi odvojeni zarezom, npr. #E8E2D8, #B9B2A6')}
                {txt('slug', 'Adresa na webu', `…/namjestaj/${v.room}/${v.slug}/`)}
              </div>
            )}
          </Step>
        </div>
        <aside className="h-fit rounded-xl bg-walnut-50 p-4 lg:sticky lg:top-0">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-walnut-500">Gdje će se vidjeti</div>
          {!v.visible ? (
            <p className="text-sm text-walnut-600">Nigdje — artikal je skriven. Uključi „Vidljiv na webu”.</p>
          ) : !p.hasImage ? (
            <p className="text-sm text-amber-800">Nigdje dok ne dodaš fotografiju (korak 1).</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {where.map((w) => <li key={w.text}><a href={w.href} target="_blank" rel="noopener" className="inline-flex items-start gap-1.5 text-walnut-800 hover:text-copper-700"><ExternalLink className="mt-0.5 size-3.5 shrink-0 text-copper-600" />{w.text}</a></li>)}
            </ul>
          )}
          <p className="mt-3 border-t border-walnut-200 pt-3 text-[11px] text-walnut-500">Cijena, naziv i dostupnost („odmah sa zalihe” / „po narudžbi”) dolaze same iz aplikacije. Linkovi rade nakon osvježavanja weba (do 30 min).</p>
        </aside>
      </div>
    </Modal>
  )
}
