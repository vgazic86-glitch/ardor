import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Printer, QrCode, Tag } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useMemo, useState } from 'react'
import { BrandMark } from '../components/Logo'
import { Pager, usePaged } from '../components/Pager'
import { Button, Card, Chip, PageHeader } from '../components/ui'
import { money } from '../lib/format'
import { useStore } from '../lib/store'

export const Route = createFileRoute('/naljepnice')({ component: LabelsPage })

type Mode = 'cijena' | 'stanje'

/**
 * Naljepnice za artikle.
 * - Cjenovna (za izlog i police): velika cijena s PDV-om, naziv, evidencijski broj (šifra), QR za karticu artikla.
 * - QR za stanje: skeniranjem se otvara kartica artikla (stanje, rezervacije, rok isporuke).
 */
function LabelsPage() {
  const { products } = useStore()
  const categories = [...new Set(products.map((p) => p.category))]
  const [mode, setMode] = useState<Mode>('cijena')
  const [cat, setCat] = useState<string>('sve')
  // Na početku ništa nije označeno (artikala je mnogo); označite ono što treba ispisati.
  const [picked, setPicked] = useState<Set<string>>(() => new Set())
  const [q, setQ] = useState('')
  const [copies, setCopies] = useState(1)
  const [qr, setQr] = useState<Record<string, string>>({})
  const visible = products.filter(
    (p) =>
      (cat === 'sve' || p.category === cat) &&
      (!q || `${p.sku} ${p.fiscalSku ?? ''} ${p.name}`.toLowerCase().includes(q.toLowerCase())),
  )
  const paged = usePaged(visible, `${q}|${cat}`)
  const chosen = useMemo(() => products.filter((p) => picked.has(p.id)), [products, picked])

  useEffect(() => {
    let alive = true
    const origin = window.location.origin
    Promise.all(
      chosen.map(async (p) => [p.id, await QRCode.toString(`${origin}/zalihe?artikal=${p.id}`, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#2B2522', light: '#0000' } })] as const),
    ).then((list) => alive && setQr(Object.fromEntries(list)))
    return () => {
      alive = false
    }
  }, [chosen])

  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const labels = chosen.flatMap((p) => Array.from({ length: copies }, (_, i) => ({ p, k: `${p.id}-${i}` })))
  const isPrice = mode === 'cijena'

  return (
    <div className="rise">
      <div className="no-print">
        <Link to="/artikli" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-walnut-600 hover:text-walnut-900">
          <ArrowLeft className="size-4" /> Artikli
        </Link>
        <PageHeader
          eyebrow="Roba"
          title="Naljepnice"
          description={
            isPrice
              ? 'Cjenovne naljepnice za izlog i police. Cijena je velika i jasna, uz evidencijski broj i QR kod za karticu artikla. Ispisuju se na A4 (3 × 5 po listu).'
              : 'QR naljepnice za artikle u salonu. Trgovac skenira QR mobitelom i odmah vidi stanje, rezervacije, cijenu i rok isporuke.'
          }
          actions={
            <Button variant="copper" disabled={!labels.length} onClick={() => window.print()}>
              <Printer className="size-4" /> Štampaj {labels.length} {labels.length === 1 ? 'naljepnicu' : 'naljepnica'}
            </Button>
          }
        />
        <Card className="mb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Chip active={mode === 'cijena'} onClick={() => setMode('cijena')}>
              <Tag className="mr-1 inline size-3.5" /> Cjenovne naljepnice
            </Chip>
            <Chip active={mode === 'stanje'} onClick={() => setMode('stanje')}>
              <QrCode className="mr-1 inline size-3.5" /> QR za stanje
            </Chip>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip active={cat === 'sve'} onClick={() => setCat('sve')}>
              Sve kategorije
            </Chip>
            {categories.map((c) => (
              <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
                {c || 'Bez kategorije'}
              </Chip>
            ))}
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Šifra ili naziv…"
              className="rounded-lg border border-walnut-200 bg-white px-3 py-1.5 text-sm"
              aria-label="Traži artikal"
            />
            <span className="ml-auto flex items-center gap-2 text-sm">
              Kopija po artiklu
              <select className="rounded-lg border border-walnut-200 bg-white px-2 py-1" value={copies} onChange={(e) => setCopies(Number(e.target.value))}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </span>
          </div>
          <div className="mt-3 flex gap-3 text-xs font-semibold">
            <button className="text-copper-700 hover:underline" onClick={() => setPicked((s) => new Set([...s, ...visible.map((p) => p.id)]))}>
              Označi prikazane
            </button>
            <button className="text-walnut-600 hover:underline" onClick={() => setPicked((s) => new Set([...s].filter((id) => !visible.some((p) => p.id === id))))}>
              Odznači prikazane
            </button>
          </div>
          <div className="mt-3 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
            {paged.rows.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-walnut-50">
                <input type="checkbox" className="size-4 accent-copper-500" checked={picked.has(p.id)} onChange={() => toggle(p.id)} />
                <span className="truncate">
                  <b className="font-semibold">{p.sku}</b> · {p.name}
                </span>
              </label>
            ))}
          </div>
          <Pager {...paged} className="-mx-5 -mb-5 mt-3" />
        </Card>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          <QrCode className="size-5 text-copper-600" /> Pregled za štampu {isPrice ? '(A4, 3 × 5)' : '(A4, 3 × 7)'}
        </h2>
      </div>

      {isPrice ? (
        <div className="price-sheet">
          {labels.map(({ p, k }) => (
            <div key={k} className="price-label">
              <div className="price-top">
                <BrandMark className="size-3.5" />
                <span>ARDOR namještaj</span>
              </div>
              <div className="price-name">{p.name}</div>
              <div className="price-value">{money(p.price)}</div>
              <div className="price-vat">KM, cijena s PDV-om 17 %</div>
              <div className="price-foot">
                <div className="price-ev">
                  <span>Ev. br.</span>
                  <b>{p.sku}</b>
                </div>
                <div className="qr" dangerouslySetInnerHTML={{ __html: qr[p.id] ?? '' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="label-sheet grid grid-cols-3 gap-0 bg-white print:gap-0">
          {labels.map(({ p, k }) => (
            <div key={k} className="label flex items-center gap-3 border border-dashed border-walnut-200 p-3 print:border-walnut-100" style={{ height: '38mm' }}>
              <div className="qr size-[26mm] shrink-0" dangerouslySetInnerHTML={{ __html: qr[p.id] ?? '' }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <BrandMark className="size-4" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-walnut-500">ARDOR</span>
                </div>
                <div className="mt-1 line-clamp-2 text-[12px] font-bold leading-tight text-walnut-900">{p.name}</div>
                <div className="mt-0.5 text-[10px] text-walnut-500">{p.sku}</div>
                <div className="mt-1 font-display text-[15px] font-bold text-[#F15A29]">{money(p.price)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
