import { PackagePlus, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { money2, netOf, parseAmount, VAT_RATE } from '../lib/format'
import { useStore } from '../lib/store'
import { Modal } from './Modal'
import { ProductDialog } from './ProductDialog'
import { Button, Field, inputCls } from './ui'

type Line = { productId: string; qty: string; unitCost: string }

/** Prijem robe od dobavljača (primka). Količine odmah ulaze na zalihu. */
export function ReceiptDialog({
  onClose,
  onSaved,
  initial,
}: {
  onClose: () => void
  onSaved?: (number: string, id: string) => void
  /** Npr. prijem po narudžbi dobavljaču. */
  initial?: { supplierId: string; note: string; lines: { productId: string; qty: number; unitCost: number }[] }
}) {
  const { suppliers, products, today, productById, addReceipt, busy } =
    useStore()
  const [supplierId, setSupplierId] = useState(initial?.supplierId ?? suppliers[0]?.id ?? '')
  const [date, setDate] = useState(today)
  const [doc, setDoc] = useState('')
  const [note, setNote] = useState(initial?.note ?? '')
  const [vatAuto, setVatAuto] = useState(true)
  const [vat, setVat] = useState('')
  const [lines, setLines] = useState<Line[]>(
    () =>
      initial?.lines.map((l) => ({
        productId: l.productId,
        qty: String(l.qty),
        unitCost: l.unitCost ? String(l.unitCost) : '',
      })) ?? [],
  )
  const [newProduct, setNewProduct] = useState(false)
  const [onlySupplier, setOnlySupplier] = useState(true)

  const choices = products.filter(
    (p) => !onlySupplier || !supplierId || p.supplierId === supplierId,
  )
  const lineFor = (id: string): Line => {
    const p = productById(id)
    return {
      productId: id,
      qty: String(Math.max(1, p.minStock - p.stock + 1)),
      unitCost: p.purchasePrice ? String(p.purchasePrice) : '',
    }
  }
  const add = (
    id = choices.find((p) => !lines.some((l) => l.productId === p.id))?.id ??
      choices[0]?.id,
  ) => id && setLines((l) => [...l, lineFor(id)])
  const update = (i: number, patch: Partial<Line>) =>
    setLines((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const total = lines.reduce(
    (s, l) => s + (Number(l.qty) || 0) * parseAmount(l.unitCost),
    0,
  )
  const qtyTotal = lines.reduce((s, l) => s + (Number(l.qty) || 0), 0)

  /** Popuni sve artikle tog dobavljača koji su ispod minimuma. */
  function fillLow() {
    const low = products.filter(
      (p) =>
        (!supplierId || p.supplierId === supplierId) &&
        p.minStock > 0 &&
        p.stock <= p.minStock,
    )
    setLines((l) => [
      ...l,
      ...low
        .filter((p) => !l.some((x) => x.productId === p.id))
        .map((p) => lineFor(p.id)),
    ])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const res = await addReceipt({
      date,
      supplierId: supplierId || null,
      documentNumber: doc,
      note,
      vat: vatAuto ? null : parseAmount(vat),
      lines: lines.map((l) => ({
        productId: l.productId,
        qty: Number(l.qty) || 0,
        unitCost: parseAmount(l.unitCost),
      })),
    })
    if (res) {
      onSaved?.(res.number, res.id)
      onClose()
    }
  }

  return (
    <>
      <Modal
        wide
        title="Prijem robe"
        subtitle="Roba koja je stigla od dobavljača. Po spremanju količine odmah ulaze na zalihu, a nabavna cijena artikla se ažurira."
        onClose={onClose}
        footer={
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="text-sm">
              <span className="text-walnut-500">Komada:</span>{' '}
              <span className="font-semibold tabular">{qtyTotal}</span>
            </div>
            <div className="text-sm">
              <span className="text-walnut-500">Nabavna vrijednost:</span>{' '}
              <span className="font-display text-xl font-semibold tabular">
                {money2(total)}
              </span>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-walnut-500">PDV s računa:</span>
              <input
                className={`${inputCls} w-28 py-1 text-right`}
                inputMode="decimal"
                value={vatAuto ? (Math.round(total * VAT_RATE * 100) / 100).toFixed(2).replace('.', ',') : vat}
                disabled={vatAuto}
                onChange={(e) => setVat(e.target.value)}
                aria-label="PDV s računa dobavljača"
              />
              <label className="flex items-center gap-1 text-xs text-walnut-600" title="Isključite i upišite tačan PDV s računa, ili 0 ako dobavljač nije u sistemu PDV-a">
                <input
                  type="checkbox"
                  className="size-3.5 accent-copper-500"
                  checked={vatAuto}
                  onChange={(e) => {
                    setVatAuto(e.target.checked)
                    if (!e.target.checked) setVat((Math.round(total * VAT_RATE * 100) / 100).toFixed(2).replace('.', ','))
                  }}
                />
                17 %
              </label>
            </label>
            <Button variant="ghost" className="ml-auto" onClick={onClose}>
              Odustani
            </Button>
            <Button
              type="submit"
              form="receipt-form"
              disabled={busy || !lines.length}
            >
              <PackagePlus className="size-4" />{' '}
              {busy ? 'Spremam…' : 'Knjiži prijem'}
            </Button>
          </div>
        }
      >
        <form id="receipt-form" onSubmit={submit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Dobavljač" className="sm:col-span-2">
              <select
                className={inputCls}
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">— bez dobavljača —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Datum prijema">
              <input
                className={inputCls}
                type="date"
                max={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Broj dokumenta dobavljača">
              <input
                className={inputCls}
                value={doc}
                onChange={(e) => setDoc(e.target.value)}
                placeholder="otpremnica / račun"
              />
            </Field>
          </div>

          <fieldset>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <legend className="font-display text-lg font-semibold">
                Stavke
              </legend>
              <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-walnut-700">
                <input
                  type="checkbox"
                  className="size-4 accent-copper-500"
                  checked={onlySupplier}
                  onChange={(e) => setOnlySupplier(e.target.checked)}
                />
                Samo artikli ovog dobavljača
              </label>
              <Button size="sm" variant="outline" onClick={fillLow}>
                Dodaj sve ispod minimuma
              </Button>
            </div>

            {lines.length === 0 ? (
              <div className="rounded-xl border border-dashed border-walnut-300 bg-walnut-50 px-4 py-8 text-center text-sm text-walnut-600">
                Dodajte artikle koji su stigli — ili kliknite „Dodaj sve ispod
                minimuma”.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-walnut-200 bg-white">
                <div className="hidden grid-cols-[1fr_90px_130px_120px_40px] gap-3 border-b border-walnut-200 bg-walnut-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-walnut-500 sm:grid">
                  <span>Artikal</span>
                  <span>Količina</span>
                  <span>Nabavna / kom</span>
                  <span className="text-right">Iznos</span>
                  <span />
                </div>
                {lines.map((l, i) => {
                  const p = productById(l.productId)
                  const cost = parseAmount(l.unitCost)
                  const margin = netOf(p.price) ? 1 - cost / netOf(p.price) : 0
                  return (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_80px_40px] items-center gap-3 border-b border-walnut-100 px-3 py-2.5 last:border-0 sm:grid-cols-[1fr_90px_130px_120px_40px]"
                    >
                      <div className="min-w-0">
                        <select
                          className={inputCls}
                          value={l.productId}
                          onChange={(e) => update(i, lineFor(e.target.value))}
                        >
                          {(choices.some((c) => c.id === l.productId)
                            ? choices
                            : [p, ...choices]
                          ).map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.sku} · {x.name}
                            </option>
                          ))}
                        </select>
                        <div className="mt-1 text-[11px] text-walnut-500">
                          Stanje {p.stock} · min. {p.minStock} · MPC{' '}
                          {money2(p.price)}
                          {cost > 0 && (
                            <span
                              className={
                                margin < 0.2
                                  ? ' text-rose-700'
                                  : ' text-moss-600'
                              }
                            >
                              {' '}
                              · marža {Math.round(margin * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <input
                        className={inputCls}
                        type="number"
                        min={1}
                        aria-label="Količina"
                        value={l.qty}
                        onChange={(e) => update(i, { qty: e.target.value })}
                      />
                      <input
                        className={`${inputCls} hidden sm:block`}
                        inputMode="decimal"
                        aria-label="Nabavna cijena"
                        value={l.unitCost}
                        onChange={(e) =>
                          update(i, { unitCost: e.target.value })
                        }
                        placeholder="0,00"
                      />
                      <div className="hidden text-right text-sm font-semibold tabular sm:block">
                        {money2((Number(l.qty) || 0) * cost)}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setLines((x) => x.filter((_, j) => j !== i))
                        }
                        className="rounded-lg p-2 text-walnut-400 hover:bg-rose-50 hover:text-rose-700"
                        aria-label="Ukloni stavku"
                      >
                        <Trash2 className="size-4" />
                      </button>
                      <input
                        className={`${inputCls} col-span-2 sm:hidden`}
                        inputMode="decimal"
                        aria-label="Nabavna cijena"
                        value={l.unitCost}
                        onChange={(e) =>
                          update(i, { unitCost: e.target.value })
                        }
                        placeholder="Nabavna cijena / kom"
                      />
                    </div>
                  )
                })}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() => add()}
                disabled={!choices.length}
              >
                <Plus className="size-4" /> Dodaj artikal
              </Button>
              <Button variant="ghost" onClick={() => setNewProduct(true)}>
                <Plus className="size-4" /> Novi artikal u šifrarniku
              </Button>
            </div>
          </fieldset>

          <Field label="Napomena">
            <input
              className={inputCls}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="npr. oštećena ambalaža, nedostaje 1 kom…"
            />
          </Field>
        </form>
      </Modal>
      {newProduct && (
        <ProductDialog
          product={null}
          onClose={() => setNewProduct(false)}
          onSaved={(id) =>
            setLines((l) => [...l, { productId: id, qty: '1', unitCost: '' }])
          }
        />
      )}
    </>
  )
}
