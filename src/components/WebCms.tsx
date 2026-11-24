/**
 * Uređivanje web stranice (CMS) za zaposlenike bez tehničkog znanja:
 * tekstovi po dijelovima stranice (s pregledom uživo) i članci „Inspiracija i savjeti”.
 */
import { Bold, Check, CheckCircle2, Circle, ExternalLink, Eye, FileText, Heading2, ImagePlus, Link2, List, Lock, Megaphone, Pencil, Phone, Plus, RotateCcw, Send, Sparkles, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Modal } from './Modal'
import { Badge, Button, Card, Chip, EmptyState, Field, inputCls, Select } from './ui'
import { date } from '../lib/format'
import { prepareImage } from '../lib/image'
import { useRemote } from '../lib/remote'
import { useStore } from '../lib/store'
import { WEB_ROOMS } from '../lib/web'
import {
  ARTICLE_STATUS, ARTICLE_THEMES, articleHtml, canEditArticle, canEditGroup, canPublish, cleanArticle, readingMinutes, WEB_FIELDS, WEB_GROUPS, words,
  WEB_SITE_URL, type ArticleStatus, type WebField, type WebGroup,
} from '../lib/webContent'
import { deleteWebArticleFn, draftWebArticleFn, getWebCmsFn, saveWebArticleFn, saveWebTextsFn, setWebTextImageFn } from '../server/api'
import type { CmsArticle } from '../server/webCms'

const LIVE_NOTE = 'Spremljeno. Na web stranici se vidi za nekoliko minuta.'
const media = (id: string) => `/api/web/mediji/${id}`
const when = (iso: string | null) => (iso ? `${date(iso.slice(0, 10))} u ${iso.slice(11, 16)}` : '')

/* ───────────────────────── tekstovi ───────────────────────── */

const GROUP_ICON: Record<WebGroup, typeof FileText> = { naslovna: FileText, traka: Megaphone, onama: FileText, kontakt: Phone }

export function WebTexts({ initialGroup = 'naslovna' }: { initialGroup?: WebGroup }) {
  const { user } = useStore()
  const r = useRemote(() => getWebCmsFn(), [])
  const [group, setGroup] = useState<WebGroup>(initialGroup)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const fields = WEB_FIELDS.filter((f) => f.group === group)
  const allowed = canEditGroup(user.role, group)
  const texts = r.data?.texts ?? {}
  const value = (f: WebField) => draft[f.key] ?? texts[f.key] ?? f.def
  const dirty = fields.filter((f) => f.kind !== 'image' && draft[f.key] !== undefined && draft[f.key] !== (texts[f.key] ?? f.def))

  const switchGroup = (g: WebGroup) => {
    if (dirty.length && !confirm('Imaš nespremljene izmjene. Odbaciti ih?')) return
    setDraft({})
    setGroup(g)
  }
  const save = async () => {
    const values = Object.fromEntries(dirty.map((f) => [f.key, draft[f.key]]))
    if (await r.run(() => saveWebTextsFn({ data: { group, values } }), LIVE_NOTE)) setDraft({})
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="flex gap-2 overflow-x-auto lg:flex-col">
        {(Object.keys(WEB_GROUPS) as WebGroup[]).map((g) => {
          const Icon = GROUP_ICON[g]
          const on = g === group
          return (
            <button key={g} type="button" onClick={() => switchGroup(g)}
              className={`flex min-w-44 items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${on ? 'border-copper-400 bg-copper-50 shadow-sm' : 'border-walnut-200 bg-linen hover:bg-white'}`}>
              <Icon className={`mt-0.5 size-4 shrink-0 ${on ? 'text-copper-600' : 'text-walnut-400'}`} />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold">{WEB_GROUPS[g].title}{!canEditGroup(user.role, g) && <Lock className="size-3 text-walnut-400" />}</span>
                <span className="hidden text-xs text-walnut-500 lg:block">{WEB_GROUPS[g].text}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="min-w-0 space-y-4">
        {r.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{r.error}</p>}
        {!r.data ? (
          <Card><div className="py-10 text-center text-sm text-walnut-500">Učitavam…</div></Card>
        ) : (
          <>
            {group === 'naslovna' && <HeroPreview v={(k) => value(WEB_FIELDS.find((f) => f.key === k)!)} img={texts['naslovna.slika']} />}
            {group === 'traka' && <BarPreview text={value(WEB_FIELDS.find((f) => f.key === 'traka.tekst')!)} />}
            <Card>
              <div className="mb-1 font-display text-lg font-semibold">{WEB_GROUPS[group].title}</div>
              <p className="mb-4 text-sm text-walnut-500">{WEB_GROUPS[group].text}</p>
              {!allowed && <p className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"><Lock className="size-4" /> Ovaj dio mijenja voditelj salona, uprava ili admin. Ti ga možeš samo pogledati.</p>}
              <div className="space-y-5">
                {fields.map((f) => f.kind === 'image'
                  ? <ImageField key={f.key} f={f} id={texts[f.key]} disabled={!allowed || r.busy} meta={r.data!.meta[f.key]} onPick={(image) => r.run(() => setWebTextImageFn({ data: { key: f.key, image } }), LIVE_NOTE)} />
                  : <TextField key={f.key} f={f} value={value(f)} disabled={!allowed} meta={r.data!.meta[f.key]} changed={draft[f.key] !== undefined && draft[f.key] !== (texts[f.key] ?? f.def)} onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))} />)}
              </div>
            </Card>
            {allowed && (
              <div className="sticky bottom-20 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-walnut-200 bg-linen/95 px-4 py-3 shadow-lg backdrop-blur">
                <span className="text-sm text-walnut-600">{dirty.length ? `Promijenjeno polja: ${dirty.length} — još nije na webu.` : 'Nema nespremljenih izmjena.'}</span>
                <div className="flex gap-2">
                  {dirty.length > 0 && <Button variant="ghost" onClick={() => setDraft({})}>Odbaci</Button>}
                  <Button variant="copper" disabled={!dirty.length || r.busy} onClick={save}><Check className="size-4" /> Spremi i objavi</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Meta({ meta }: { meta?: { by: string; at: string | null } }) {
  return meta?.by ? <span className="text-[11px] text-walnut-400">Zadnja izmjena: {meta.by}, {when(meta.at)}</span> : null
}

function TextField({ f, value, disabled, meta, changed, onChange }: { f: WebField; value: string; disabled: boolean; meta?: { by: string; at: string | null }; changed: boolean; onChange: (v: string) => void }) {
  const over = value.length > f.max
  const counter = <span className={`text-[11px] ${over ? 'font-semibold text-rose-600' : 'text-walnut-400'}`}>{value.length} / {f.max}</span>
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-walnut-900">{f.label}{changed && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">promijenjeno</span>}</span>
        {f.kind !== 'date' && counter}
      </div>
      {f.kind === 'textarea' ? (
        <textarea className={`${inputCls} ${over ? 'ring-2 ring-rose-300' : ''}`} rows={f.rows ?? 3} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={`${inputCls} ${over ? 'ring-2 ring-rose-300' : ''}`} type={f.kind === 'date' ? 'date' : 'text'} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      )}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-walnut-500">{f.where}</span>
        <span className="flex items-center gap-3">
          <Meta meta={meta} />
          {!disabled && value !== f.def && f.def && (
            <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-copper-700 hover:underline" onClick={() => onChange(f.def)}><RotateCcw className="size-3" /> Vrati izvorni tekst</button>
          )}
          {!disabled && f.group === 'traka' && value && (
            <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-copper-700 hover:underline" onClick={() => onChange('')}><X className="size-3" /> Obriši</button>
          )}
        </span>
      </div>
    </div>
  )
}

function ImageField({ f, id, disabled, meta, onPick }: { f: WebField; id?: string; disabled: boolean; meta?: { by: string; at: string | null }; onPick: (img: Awaited<ReturnType<typeof prepareImage>>['image'] | null) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [err, setErr] = useState('')
  const pick = async (file?: File) => {
    if (!file) return
    setErr('')
    try {
      const p = await prepareImage(file, true)
      onPick(p.image)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Slika se ne može obraditi.')
    }
  }
  return (
    <div>
      <div className="mb-1 text-sm font-semibold text-walnut-900">{f.label}</div>
      <div className="flex flex-wrap items-center gap-4">
        {id ? <img src={media(id)} alt="" className="h-24 w-40 rounded-lg object-cover ring-1 ring-walnut-200" /> : <div className="grid h-24 w-40 place-items-center rounded-lg bg-walnut-100 px-2 text-center text-xs text-walnut-500">Zadana fotografija weba</div>}
        {!disabled && (
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={() => input.current?.click()}><ImagePlus className="size-4" /> {id ? 'Zamijeni fotografiju' : 'Odaberi fotografiju'}</Button>
            {id && <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-copper-700 hover:underline" onClick={() => confirm('Vratiti zadanu fotografiju weba?') && onPick(null)}><RotateCcw className="size-3" /> Vrati zadanu</button>}
          </div>
        )}
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      {err && <p className="mt-1 text-xs text-rose-600">{err}</p>}
      <div className="mt-1 flex flex-wrap justify-between gap-2"><span className="text-xs text-walnut-500">{f.where} Spremi se odmah po odabiru.</span><Meta meta={meta} /></div>
    </div>
  )
}

/** Umanjeni prikaz vrha naslovnice — da se odmah vidi kako će izgledati. */
function HeroPreview({ v, img }: { v: (k: string) => string; img?: string }) {
  const lines = v('naslovna.naslov').split('\n').filter(Boolean).slice(0, 3)
  const last = lines.length ? lines[lines.length - 1].split(' ') : []
  const lastWord = last.pop() ?? ''
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-walnut-500"><Eye className="size-3.5" /> Ovako izgleda vrh naslovnice</div>
      <div className="relative overflow-hidden rounded-xl bg-[#221C17] text-white shadow-md" style={{ minHeight: 230 }}>
        <img src={img ? media(img) : `${WEB_SITE_URL}/img/grande.jpg`} alt="" className="absolute inset-0 size-full object-cover opacity-55" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(20,15,12,.85) 0%, rgba(20,15,12,.35) 70%, transparent)' }} />
        <div className="relative max-w-xl p-6">
          <div className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#F79328]">{v('naslovna.oznaka')}</div>
          <div className="mt-2 font-display text-2xl font-medium leading-tight sm:text-3xl">
            {lines.map((l, i) => (
              <div key={i}>{i === lines.length - 1 ? <>{last.join(' ')} <span className="text-[#F79328]">{lastWord}</span></> : l}</div>
            ))}
          </div>
          <p className="mt-3 max-w-md text-xs leading-relaxed text-white/80">{v('naslovna.podnaslov')}</p>
          <div className="mt-4 inline-block rounded-full bg-[#F15A29] px-4 py-1.5 text-xs font-semibold">Zatraži besplatnu ponudu</div>
        </div>
      </div>
    </div>
  )
}

function BarPreview({ text }: { text: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-walnut-500"><Eye className="size-3.5" /> Ovako izgleda traka na vrhu weba</div>
      <div className="overflow-hidden rounded-xl border border-walnut-200 shadow-sm">
        {text ? <div className="bg-[#F15A29] px-3 py-1.5 text-center text-xs font-semibold text-white">{text}</div> : <div className="bg-walnut-100 px-3 py-1.5 text-center text-xs text-walnut-500">(traka je isključena — upiši tekst da se pojavi)</div>}
        <div className="flex items-center justify-between bg-linen px-4 py-3 text-xs text-walnut-500"><span className="font-semibold tracking-[.2em] text-walnut-800">ARDOR</span><span>Po mjeri · Katalog · Akcije · Kontakt</span></div>
      </div>
    </div>
  )
}

/* ───────────────────────── članci ───────────────────────── */

const statusTone: Record<ArticleStatus, string> = { nacrt: 'neutral', ceka: 'warn', objavljen: 'good' }

export function WebArticles() {
  const { user } = useStore()
  const r = useRemote(() => getWebCmsFn(), [])
  const [filter, setFilter] = useState<'sve' | ArticleStatus>('sve')
  const [edit, setEdit] = useState<CmsArticle | 'novi' | null>(null)
  const list = r.data?.articles ?? []
  const shown = filter === 'sve' ? list : list.filter((a) => a.status === filter)
  const waiting = list.filter((a) => a.status === 'ceka').length
  return (
    <>
      {canPublish(user.role) && waiting > 0 && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Članaka koji čekaju tvoje odobrenje: <b>{waiting}</b>. Otvori ga, pročitaj i klikni „Objavi”.</p>
      )}
      <Card flush>
        <div className="flex flex-wrap items-center gap-2 border-b border-walnut-200/70 px-5 py-3">
          <Chip active={filter === 'sve'} onClick={() => setFilter('sve')}>Svi ({list.length})</Chip>
          {(Object.keys(ARTICLE_STATUS) as ArticleStatus[]).map((s) => <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>{ARTICLE_STATUS[s]} ({list.filter((a) => a.status === s).length})</Chip>)}
          <span className="flex-1" />
          <Button variant="copper" size="sm" onClick={() => setEdit('novi')}><Plus className="size-4" /> Novi članak</Button>
        </div>
        {r.error && !edit && <p className="mx-5 mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{r.error}</p>}
        {!r.data ? <div className="py-10 text-center text-sm text-walnut-500">Učitavam…</div> : shown.length === 0 ? (
          <EmptyState icon={FileText} title="Još nema članaka">Članci savjeta (npr. „Kako odabrati madrac”) dovode kupce s Googlea. Klikni „Novi članak” — AI ti može napisati prvi prijedlog.</EmptyState>
        ) : (
          <ul className="divide-y divide-walnut-100">
            {shown.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                {a.imageId ? <img src={media(a.imageId)} alt="" className="h-12 w-16 rounded-lg object-cover" loading="lazy" /> : <span className="grid h-12 w-16 place-items-center rounded-lg bg-walnut-100 text-[10px] text-walnut-500">bez slike</span>}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{a.title}</div>
                  <div className="text-xs text-walnut-500">{[a.theme, `${readingMinutes(a.body)} min čitanja`, a.author && `piše ${a.author}`, a.approvedBy && `objavio ${a.approvedBy}`].filter(Boolean).join(' · ')}</div>
                </div>
                <Badge tone={statusTone[a.status]}>{ARTICLE_STATUS[a.status]}</Badge>
                <Button variant="outline" size="sm" onClick={() => setEdit(a)}>{canEditArticle(user.role, a.status) ? <><Pencil className="size-3.5" /> Uredi</> : <><Eye className="size-3.5" /> Pogledaj</>}</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {edit && <ArticleDialog a={edit === 'novi' ? null : edit} busy={r.busy} error={r.error} clearError={r.clearError} run={r.run} onClose={() => { r.clearError(); setEdit(null) }} />}
    </>
  )
}

type Run = <R>(fn: () => Promise<R>, ok?: string) => Promise<R | null>

function ArticleDialog({ a, busy, error, clearError, run, onClose }: { a: CmsArticle | null; busy: boolean; error: string | null; clearError: () => void; run: Run; onClose: () => void }) {
  const { user } = useStore()
  const readOnly = !!a && !canEditArticle(user.role, a.status)
  const boss = canPublish(user.role)
  const [v, setV] = useState({ title: a?.title ?? '', summary: a?.summary ?? '', theme: a?.theme ?? '', room: a?.room ?? '', body: a?.body ?? '' })
  const [image, setImage] = useState<{ mime: string; dataB64: string } | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [view, setView] = useState<'pisanje' | 'pregled'>('pisanje')
  const [ai, setAi] = useState<'' | 'radi'>('')
  const [localErr, setLocalErr] = useState('')
  const body = useRef<HTMLTextAreaElement>(null)
  const fileIn = useRef<HTMLInputElement>(null)
  const set = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }))
  useEffect(() => () => clearError(), [clearError])

  const imgSrc = image ? `data:${image.mime};base64,${image.dataB64}` : a?.imageId && !removeImage ? media(a.imageId) : null
  const n = words(v.body)
  const checks = [
    { ok: v.title.trim().length >= 5 && v.title.length <= 90, text: 'Naslov (do 90 znakova)' },
    { ok: v.summary.trim().length >= 40 && v.summary.length <= 160, text: `Kratki opis za Google, 40–160 znakova (sada ${v.summary.trim().length})` },
    { ok: !!v.theme, text: 'Tema' },
    { ok: !!imgSrc, text: 'Naslovna fotografija' },
    { ok: n >= 120, text: `Barem 120 riječi teksta (sada ${n})` },
  ]
  const ready = checks.every((c) => c.ok)

  /** Ubaci oznaku na mjesto kursora (gumbi iznad teksta). */
  const wrap = (kind: 'h' | 'li' | 'b' | 'a') => {
    const el = body.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e, value } = el
    const sel = value.slice(s, e)
    const lineStart = value.lastIndexOf('\n', s - 1) + 1
    let next = value
    let caret = e
    if (kind === 'h' || kind === 'li') {
      const mark = kind === 'h' ? '## ' : '- '
      next = value.slice(0, lineStart) + mark + value.slice(lineStart)
      caret = e + mark.length
    } else if (kind === 'b') {
      const t = sel || 'podebljani tekst'
      next = `${value.slice(0, s)}**${t}**${value.slice(e)}`
      caret = s + t.length + 4
    } else {
      const url = prompt('Adresa stranice (npr. /kontakt/ ili /namjestaj/kuhinja/):', '/kontakt/')
      if (!url) return
      const t = sel || 'tekst linka'
      next = `${value.slice(0, s)}[${t}](${url.trim()})${value.slice(e)}`
      caret = s + t.length + url.trim().length + 4
    }
    set('body', next)
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(caret, caret) })
  }

  const pick = async (file?: File) => {
    if (!file) return
    try {
      const p = await prepareImage(file, true)
      setImage(p.image)
      setRemoveImage(false)
      setLocalErr('')
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Slika se ne može obraditi.')
    }
  }

  const askAi = async () => {
    if (v.body.trim() && !confirm('AI će zamijeniti postojeći tekst članka. Nastaviti?')) return
    setAi('radi')
    setLocalErr('')
    try {
      const d = await draftWebArticleFn({ data: { title: v.title, theme: v.theme } })
      setV((s) => ({ ...s, body: d.body, summary: s.summary.trim() ? s.summary : d.summary }))
      setView('pregled')
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'AI nije uspio.')
    } finally {
      setAi('')
    }
  }

  const save = async (status: ArticleStatus) => {
    setLocalErr('')
    if (status !== 'nacrt' && !ready) return setLocalErr('Prije slanja ispuni sve stavke s popisa „Prije objave”.')
    const c = cleanArticle(v, status !== 'nacrt')
    if ('error' in c) return setLocalErr(c.error)
    const msg = status === 'objavljen' ? LIVE_NOTE : status === 'ceka' ? 'Članak je poslan na odobrenje voditelju.' : 'Nacrt je spremljen (nije na webu).'
    if (await run(() => saveWebArticleFn({ data: { id: a?.id, ...v, status, image, removeImage } }), msg)) onClose()
  }
  const remove = async () => {
    if (!a || !confirm(`Obrisati članak „${a.title}”?${a.status === 'objavljen' ? ' Nestat će i s web stranice.' : ''}`)) return
    if (await run(() => deleteWebArticleFn({ data: { id: a.id, title: a.title } }), 'Članak je obrisan.')) onClose()
  }

  const status = a?.status ?? 'nacrt'
  const footer = readOnly ? (
    <div className="flex justify-end"><Button variant="ghost" onClick={onClose}>Zatvori</Button></div>
  ) : (
    <div className="flex flex-wrap items-center gap-2">
      {a && <Button variant="ghost" disabled={busy} onClick={remove}><Trash2 className="size-4" /> Obriši</Button>}
      <span className="flex-1" />
      {(status !== 'objavljen') && <Button variant="outline" disabled={busy} onClick={() => save('nacrt')}>Spremi nacrt</Button>}
      {boss && status === 'objavljen' && <Button variant="outline" disabled={busy} onClick={() => confirm('Skloniti članak s weba (vraća se u nacrt)?') && save('nacrt')}>Skloni s weba</Button>}
      {boss ? (
        <Button variant="copper" disabled={busy} onClick={() => save('objavljen')}><Check className="size-4" /> {status === 'objavljen' ? 'Spremi izmjene' : 'Objavi na webu'}</Button>
      ) : (
        <Button variant="copper" disabled={busy} onClick={() => save('ceka')}><Send className="size-4" /> Pošalji na odobrenje</Button>
      )}
    </div>
  )

  return (
    <Modal title={a ? (readOnly ? 'Članak' : 'Uredi članak') : 'Novi članak'} subtitle={a ? `${ARTICLE_STATUS[status]}${a.author ? ` · piše ${a.author}` : ''}` : 'Savjet za kupce — objavljuje se u „Inspiracija i savjeti”'} onClose={onClose} help="web-clanci" wide footer={footer}>
      {(localErr || error) && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{localErr || error}</p>}
      {readOnly && <p className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">Članak je objavljen. Izmjene radi voditelj salona, uprava ili admin.</p>}
      {status === 'ceka' && boss && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Članak čeka tvoje odobrenje. Pročitaj ga u „Pregledu”, po potrebi popravi i klikni „Objavi na webu”.</p>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="min-w-0 space-y-3">
          <Field label="Naslov" hint={`${v.title.length} / 90 — kako bi kupac pitao Google, npr. „Kako odabrati madrac za bolna leđa”`}>
            <input className={inputCls} value={v.title} disabled={readOnly} onChange={(e) => set('title', e.target.value)} placeholder="Kako odabrati…" />
          </Field>
          <div>
            <div className="mb-1 text-sm font-semibold text-walnut-900">Tema</div>
            <div className="flex flex-wrap gap-1.5">{ARTICLE_THEMES.map((t) => <Chip key={t} active={v.theme === t} onClick={() => !readOnly && set('theme', t)}>{t}</Chip>)}</div>
          </div>
          <Field label="Kratki opis" hint={`${v.summary.length} / 160 — vidi se ispod naslova u Googleu i na popisu članaka`}>
            <textarea className={inputCls} rows={2} value={v.summary} disabled={readOnly} onChange={(e) => set('summary', e.target.value)} />
          </Field>

          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-walnut-900">Tekst članka</span>
              <span className="flex-1" />
              <Chip active={view === 'pisanje'} onClick={() => setView('pisanje')}><Pencil className="size-3" /> Pisanje</Chip>
              <Chip active={view === 'pregled'} onClick={() => setView('pregled')}><Eye className="size-3" /> Pregled</Chip>
            </div>
            {view === 'pisanje' && !readOnly ? (
              <>
                <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-walnut-200 bg-walnut-50 px-2 py-1.5">
                  <ToolBtn icon={Heading2} label="Podnaslov" onClick={() => wrap('h')} />
                  <ToolBtn icon={List} label="Nabrajanje" onClick={() => wrap('li')} />
                  <ToolBtn icon={Bold} label="Podebljano" onClick={() => wrap('b')} />
                  <ToolBtn icon={Link2} label="Link" onClick={() => wrap('a')} />
                  <span className="flex-1" />
                  <Button variant="outline" size="sm" disabled={!!ai || busy} onClick={askAi}><Sparkles className="size-3.5" /> {ai ? 'AI piše… (do 30 s)' : 'AI napiše prijedlog'}</Button>
                </div>
                <textarea ref={body} className={`${inputCls} rounded-t-none font-mono text-[13px] leading-relaxed`} rows={16} value={v.body} onChange={(e) => set('body', e.target.value)}
                  placeholder={'Piši normalno, odlomak po odlomak (prazan red = novi odlomak).\n\nZa podnaslov klikni „Podnaslov” iznad.\n\nIli upiši naslov i klikni „AI napiše prijedlog”, pa tekst pročitaj i doradi.'} />
                <p className="mt-1 text-xs text-walnut-500">{n} riječi · oko {readingMinutes(v.body)} min čitanja. AI prijedlog uvijek pročitaj: provjeri da ne obećava ništa što ne nudimo.</p>
              </>
            ) : (
              <div className="article-preview max-h-[480px] overflow-y-auto rounded-lg border border-walnut-200 bg-white px-5 py-4 text-sm leading-relaxed text-walnut-800 [&_h2]:mb-1.5 [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_a]:text-copper-700 [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: v.body.trim() ? articleHtml(v.body) : '<p style="color:#999">Još nema teksta.</p>' }} />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-1 text-sm font-semibold text-walnut-900">Naslovna fotografija</div>
            {imgSrc ? <img src={imgSrc} alt="" className="aspect-[4/3] w-full rounded-lg object-cover ring-1 ring-walnut-200" /> : <div className="grid aspect-[4/3] w-full place-items-center rounded-lg bg-walnut-100 text-xs text-walnut-500">Nema fotografije</div>}
            {!readOnly && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => fileIn.current?.click()}><ImagePlus className="size-3.5" /> {imgSrc ? 'Zamijeni' : 'Dodaj fotografiju'}</Button>
                {imgSrc && <Button variant="ghost" size="sm" onClick={() => { setImage(null); setRemoveImage(true) }}>Ukloni</Button>}
              </div>
            )}
            <input ref={fileIn} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          <Select label="Prostorija (nije obavezno)" value={v.room} onChange={(x) => !readOnly && set('room', x)} options={[{ value: '', label: '— bez —' }, ...Object.entries(WEB_ROOMS).map(([value, label]) => ({ value, label }))]} />
          <div className="rounded-xl bg-walnut-50 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-walnut-500">Prije objave</div>
            <ul className="space-y-1.5 text-xs">
              {checks.map((c) => <li key={c.text} className={`flex gap-1.5 ${c.ok ? 'text-emerald-700' : 'text-walnut-600'}`}>{c.ok ? <CheckCircle2 className="size-3.5 shrink-0" /> : <Circle className="size-3.5 shrink-0" />}{c.text}</li>)}
            </ul>
            {!boss && <p className="mt-2 text-[11px] text-walnut-500">Članak objavljuje voditelj salona, uprava ili admin. Ti ga šalješ na odobrenje — dobiju obavijest u zvoncu.</p>}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function ToolBtn({ icon: Icon, label, onClick }: { icon: typeof Bold; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-walnut-700 hover:bg-white" title={label}>
      <Icon className="size-3.5" /> {label}
    </button>
  )
}

/* ───────────────────────── pregled weba (karta stranica) ───────────────────────── */

export type WebTab = 'pregled' | 'upiti' | 'tekstovi' | 'clanci' | 'artikli'
export type ProductFilter = 'svi' | 'naWebu' | 'istaknuti' | 'akcija'
export interface GoTo { tab: WebTab; group?: WebGroup; filter?: ProductFilter }
export type Go = (to: GoTo) => void

interface Row {
  label: string
  value: ReactNode
  edit?: { label?: string; to: GoTo } | 'zakljucano'
}

const cut = (s: string, n = 70) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** Karta web stranice: koja stranica ima koji sadržaj i gdje se uređuje — jednim klikom do pravog mjesta. */
export function WebOverview({ go, canProducts, newInquiries }: { go: Go; canProducts: boolean; newInquiries: number }) {
  const r = useRemote(() => getWebCmsFn(), [])
  if (!r.data) return <Card><div className="py-10 text-center text-sm text-walnut-500">{r.error ?? 'Učitavam…'}</div></Card>
  const x = r.data.texts
  const c = r.data.catalog
  const pub = r.data.articles.filter((a) => a.status === 'objavljen')
  const waiting = r.data.articles.filter((a) => a.status === 'ceka').length
  const prod = (to: GoTo): Row['edit'] => (canProducts ? { to } : 'zakljucano')
  const tx = (group: WebGroup): Row['edit'] => ({ to: { tab: 'tekstovi', group } })
  const pages: { title: string; path: string; note?: string; rows: Row[] }[] = [
    {
      title: 'Na svim stranicama',
      path: '/',
      note: 'Vidi se na vrhu i na dnu svake stranice.',
      rows: [
        { label: 'Obavijest na vrhu (traka)', value: x['traka.tekst'] ? <b className="text-copper-700">{cut(x['traka.tekst'])}{x['traka.do'] ? ` · do ${date(x['traka.do'])}` : ''}</b> : <span className="text-walnut-400">isključena</span>, edit: tx('traka') },
        { label: 'Telefoni i radno vrijeme', value: `${x['kontakt.telefon']} · Viber ${x['kontakt.mobitel']} · radnim danom ${x['kontakt.radni']}`, edit: tx('kontakt') },
      ],
    },
    {
      title: 'Naslovnica',
      path: '/',
      rows: [
        { label: 'Vrh: veliki naslov i fotografija', value: `„${cut(x['naslovna.naslov'].replace(/\n/g, ' '))}”`, edit: tx('naslovna') },
        { label: 'Naša priča', value: `„${cut(x['naslovna.prica.naslov'])}”`, edit: tx('naslovna') },
        { label: 'Namještaj po mjeri', value: `„${cut(x['naslovna.pomjeri.naslov'])}”`, edit: tx('naslovna') },
        { label: 'Izdvojeno iz salona', value: c.featured >= 3 ? `${c.featured} istaknutih artikala (★)` : `istaknutih ${c.featured} — dok ih nije barem 3, prikazuje se prvih 6 artikala s weba`, edit: prod({ tab: 'artikli', filter: 'istaknuti' }) },
        { label: 'Akcija (veliki okvir)', value: c.sale ? `${c.sale} artikala na akciji` : <span className="text-walnut-400">nema artikala na akciji — okvir se ne prikazuje</span>, edit: prod({ tab: 'artikli', filter: 'akcija' }) },
        { label: 'Inspiracija i savjeti', value: pub.length ? `zadnja 3 članka: ${pub.slice(0, 3).map((a) => `„${cut(a.title, 30)}”`).join(', ')}` : 'zadnja 3 članka (zasad početni članci)', edit: { to: { tab: 'clanci' } } },
        { label: 'Obrazac za upit', value: `naslov „${x['naslovna.kontakt.naslov']}” — poslani upiti stižu u Upiti`, edit: tx('naslovna') },
      ],
    },
    {
      title: 'Katalog',
      path: '/namjestaj/',
      note: 'Artikli s fotografijom i kvačicom „Vidljiv na webu”. Upisuju se u kartici „Artikli na webu” — poseban popis, nije povezan s Artiklima u aplikaciji.',
      rows: [
        { label: 'Artikala na webu', value: <>{c.total}{c.noImage ? <span className="text-amber-700"> · {c.noImage} označenih bez fotografije se ne vidi</span> : null}</>, edit: prod({ tab: 'artikli', filter: 'naWebu' }) },
        { label: 'Po prostorijama', value: Object.keys(c.byRoom).length ? Object.entries(c.byRoom).map(([k, n]) => `${WEB_ROOMS[k as keyof typeof WEB_ROOMS] ?? k} ${n}`).join(' · ') : <span className="text-walnut-400">još nijedan artikal — katalog na webu je prazan (piše „uskoro”)</span>, edit: prod({ tab: 'artikli', filter: 'svi' }) },
      ],
    },
    { title: 'Akcije', path: '/akcije/', rows: [{ label: 'Artikli sa starom (precrtanom) cijenom', value: String(c.sale), edit: prod({ tab: 'artikli', filter: 'akcija' }) }] },
    { title: 'Inspiracija i savjeti', path: '/inspiracija/', rows: [{ label: 'Članci', value: <>{pub.length} objavljeno iz aplikacije{waiting ? <b className="text-amber-700"> · {waiting} čeka odobrenje</b> : null} · uz to 3 početna članka</>, edit: { label: 'Napiši ili odobri', to: { tab: 'clanci' } } }] },
    { title: 'O nama', path: '/o-nama/', rows: [{ label: 'Naslov i priča', value: `„${cut(x['onama.naslov'])}”`, edit: tx('onama') }] },
    {
      title: 'Kontakt',
      path: '/kontakt/',
      rows: [
        { label: 'Telefoni i radno vrijeme', value: `${x['kontakt.telefon']} · subota ${x['kontakt.subota']} · nedjelja ${x['kontakt.nedjelja']}`, edit: tx('kontakt') },
        { label: 'Obrasci (ponuda, posjet, mjerenje)', value: newInquiries ? <b className="text-copper-700">{newInquiries} novih upita čeka poziv</b> : 'nema novih upita', edit: { label: 'Otvori upite', to: { tab: 'upiti' } } },
      ],
    },
  ]
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ['1', 'Odaberi što mijenjaš', 'Svaki red ispod je jedan dio web stranice. „Uredi” te vodi tačno na to mjesto.'],
            ['2', 'Promijeni i spremi', 'Tekst: „Spremi i objavi”. Artikal: fotografija + „Vidljiv na webu”. Članak: „Objavi” (voditelj).'],
            ['3', 'Web se osvježi sam', 'Za najviše 30 minuta (7–22 h). „Pogledaj” otvara tu stranicu weba.'],
          ].map(([n, h, p]) => (
            <div key={n} className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-copper-600 text-sm font-bold text-white">{n}</span>
              <div><div className="font-semibold">{h}</div><div className="text-sm text-walnut-500">{p}</div></div>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {pages.map((pg) => (
          <Card key={pg.title} flush>
            <div className="flex items-center gap-2 border-b border-walnut-200/70 px-5 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-display text-lg font-semibold">{pg.title}</div>
                <div className="truncate text-xs text-walnut-500">{pg.note ?? `ardornamjestaj.com${pg.path}`}</div>
              </div>
              <a href={`${WEB_SITE_URL}${pg.path}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-lg border border-walnut-200 px-2.5 py-1.5 text-xs font-semibold text-walnut-700 hover:bg-white"><ExternalLink className="size-3.5" /> Pogledaj</a>
            </div>
            <ul className="divide-y divide-walnut-100">
              {pg.rows.map((row) => (
                <li key={row.label} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-walnut-900">{row.label}</div>
                    <div className="text-xs text-walnut-600">{row.value}</div>
                  </div>
                  {row.edit === 'zakljucano' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-walnut-400" title="Nemate pristup artiklima za web"><Lock className="size-3" /> zaključano</span>
                  ) : row.edit ? (
                    <Button variant="outline" size="sm" onClick={() => go((row.edit as { to: GoTo }).to)}><Pencil className="size-3.5" /> {(row.edit as { label?: string }).label ?? 'Uredi'}</Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  )
}
