import { ArrowRightLeft, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { money2 } from '../lib/format'
import { useStore } from '../lib/store'
import { LOCATION_LABEL, type StockLocation } from '../lib/types'
import { Modal } from './Modal'
import { Button, Field, inputCls } from './ui'

type Line = { productId: string; qty: string }

/** Interna primka: premještaj robe između skladišta i salona. Sustav bilježi tok robe i stanje na oba mjesta. */
export function TransferDialog({ onClose }: { onClose: () => void }) {
  const { products, transfers, today, productById, createTransfer, busy } = useStore()
  const [from, setFrom] = useState<StockLocation>('skladiste')
  const to: StockLocation = from === 'salon' ? 'skladiste' : 'salon'
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<Line[]>([])

  const avail = (pid: string) => {
    const p = products.find((x) => x.id === pid)
    if (!p) return 0
    return from === 'salon' ? p.stock : (p.stockWarehouse ?? 0)
  }
  const add = () => setLines((l) => [...l, { productId: '', qty: '1' }])
  const update = (i: number, patch: Partial<Line>) => setLines((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const remove = (i: number) => setLines((l) => l.filter((_, j) => j !== i))
  const valid = lines.length > 0 && lines.every((l) => l.productId && Number(l.qty) > 0 && Number(l.qty) <= avail(l.productId))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const res = await createTransfer({
      date,
      from,
      to,
      note,
      lines: lines.map((l) => ({ productId: l.productId, qty: Number(l.qty) || 0 })),
    })
    if (res) onClose()
  }

  const recent = transfers.slice(0, 5)

  return (
    <Modal
      wide
      title="Interna primka (premještaj robe)"
      subtitle="Roba koja se premješta između skladišta i salona. Sustav skida s jednog mjesta i dodaje na drugo, pa je stanje uvijek točno. Prodaja se uvijek skida iz salona."
      onClose={onClose}
      help={false}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Odustani
          </Button>
          <Button type="submit" form="transfer-form" disabled={busy || !valid}>
            <ArrowRightLeft className="size-4" /> {busy ? 'Spremam…' : `Premjesti u ${LOCATION_LABEL[to].toLowerCase()}`}
          </Button>
        </div>
      }
    >
      <form id="transfer-form" onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Premještam iz">
            <select className={inputCls} value={from} onChange={(e) => setFrom(e.target.value as StockLocation)}>
              <option value="skladiste">Skladišta</option>
              <option value="salon">Salona</option>
            </select>
          </Field>
          <Field label="Na">
            <input className={inputCls} value={LOCATION_LABEL[to]} disabled />
          </Field>
          <Field label="Datum">
            <input className={inputCls} type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-display text-lg font-semibold">Stavke</span>
            <Button size="sm" variant="outline" onClick={add}>
              <Plus className="size-3.5" /> Dodaj stavku
            </Button>
          </div>
          {lines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-walnut-300 bg-walnut-50 px-4 py-6 text-center text-sm text-walnut-600">
              Dodajte artikle koje premještate.
            </div>
          ) : (
            <div className="space-y-2">
              {lines.map((l, i) => {
                const p = l.productId ? productById(l.productId) : null
                const a = l.productId ? avail(l.productId) : 0
                const over = l.productId && Number(l.qty) > a
                return (
                  <div key={i} className="grid grid-cols-[1fr_90px_36px] items-center gap-2 sm:grid-cols-[1fr_120px_36px]">
                    <div className="min-w-0">
                      <select className={inputCls} value={l.productId} onChange={(e) => update(i, { productId: e.target.value, qty: '1' })}>
                        <option value="">— odaberite artikal —</option>
                        {[...products]
                          .sort((x, y) => x.name.localeCompare(y.name))
                          .map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name} ({x.sku}) — {from === 'salon' ? x.stock : (x.stockWarehouse ?? 0)} kom
                            </option>
                          ))}
                      </select>
                      {p && (
                        <div className={`mt-1 text-xs ${over ? 'text-rose-700' : 'text-walnut-500'}`}>
                          Na mjestu „{LOCATION_LABEL[from]}” ima {a} kom
                          {p.purchasePrice ? ` · nabavna ${money2(p.purchasePrice)}` : ''}
                          {over ? ' · upisano je više nego što ima' : ''}
                        </div>
                      )}
                    </div>
                    <input
                      className={inputCls}
                      inputMode="numeric"
                      value={l.qty}
                      onChange={(e) => update(i, { qty: e.target.value.replace(/\D/g, '') })}
                      aria-label="Količina"
                    />
                    <button type="button" className="justify-self-center rounded-lg p-2 text-walnut-500 hover:bg-rose-50 hover:text-rose-700" onClick={() => remove(i)} aria-label="Ukloni stavku">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <Field label="Napomena">
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="npr. za izlog, po dogovoru s voditeljem" />
        </Field>

        {recent.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-walnut-500">Posljednje interne primke</div>
            <ul className="divide-y divide-walnut-100 rounded-xl border border-walnut-200 bg-white text-sm">
              {recent.map((tr) => (
                <li key={tr.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <span className="font-semibold">{tr.number}</span>
                  <span className="text-walnut-500">{tr.date}</span>
                  <span>
                    {LOCATION_LABEL[tr.from]} → {LOCATION_LABEL[tr.to]}
                  </span>
                  <span className="ml-auto text-walnut-600">
                    {tr.lines.length} stavki · {tr.lines.reduce((s, l) => s + l.qty, 0)} kom
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </Modal>
  )
}
