import { Plus, Trash2,
  Hourglass,
  Hammer,
  ImagePlus,
} from 'lucide-react'
import { prepareImage } from '../lib/image'
import { CUSTOM_KINDS, type CustomKind } from '../lib/pomjeri'
import { useState } from 'react'
import {
  itemsTotal,
  type Delivery,
  type OrderItem,
  type OrderStatus,
  type PaymentMethod, parseOptions } from '../lib/types'
import { money, money2, parseAmount } from '../lib/format'
import { useStore } from '../lib/store'
import { reservedQty } from '../lib/stats'
import { Modal } from './Modal'
import { ProductImage } from './ProductImage'
import { Button, inputCls } from './ui'
import { addMonths } from '../lib/collection'

const lbl = 'flex flex-col gap-1 text-xs font-semibold text-walnut-700'

export function NewOrderDialog({
  onClose,
  onCreated,
  initialItems,
  asOffer = false,
}: {
  onClose: () => void
  onCreated: (id: string) => void
  /** Artikli unaprijed (npr. iz kataloga za kupca). */
  initialItems?: { productId: string; qty: number }[]
  /** Otvori kao ponudu. */
  asOffer?: boolean
}) {
  const {
    addOrder,
    customers,
    drivers,
    products,
    orders,
    salesPeople,
    today: TODAY,
    productById,
    me,
    busy,
    restricted,
  } = useStore()
  const maxDiscount = restricted ? 10 : 50
  // Opći artikli „po mjeri” se ne biraju s popisa — za njih je gumb „Po mjeri”.
  const sellable = products.filter((p) => !p.madeToOrder)
  const reserved = reservedQty(orders)
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '')
  const [employeeId, setEmployeeId] = useState(
    me && me.role !== 'Dostava i montaža' ? me.id : (salesPeople[0]?.id ?? ''),
  )
  const [items, setItems] = useState<OrderItem[]>(
    initialItems?.length
      ? initialItems
          .filter((i) => sellable.some((p) => p.id === i.productId))
          .map((i) => ({ productId: i.productId, qty: Math.max(1, i.qty), unitPrice: productById(i.productId).price, discountPct: 0 }))
      : sellable[0]
      ? [
          {
            productId: sellable[0].id,
            qty: 1,
            unitPrice: sellable[0].price,
            discountPct: 0,
          },
        ]
      : [],
  )
  const [status, setStatus] = useState<OrderStatus>(asOffer ? 'ponuda' : 'potvrđena')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Kartica')
  const [paid, setPaid] = useState('')
  const [rateCount, setRateCount] = useState('6')
  const [rateFirst, setRateFirst] = useState(() => addMonths(TODAY, 1))
  const [withDelivery, setWithDelivery] = useState(true)
  const [dDate, setDDate] = useState('')
  const [slot, setSlot] = useState<Delivery['slot']>('08–12')
  const [driverId, setDriverId] = useState(drivers[0]?.id ?? '')
  const [assembly, setAssembly] = useState(true)
  const [note, setNote] = useState('')

  const total = itemsTotal(items)
  const [pickupNow, setPickupNow] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newCity, setNewCity] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const customer = customers.find((c) => c.id === customerId) ?? {
    address: newAddress,
    city: newCity,
  }
  const update = (i: number, patch: Partial<OrderItem>) =>
    setItems((list) =>
      list.map((it, j) => (j === i ? { ...it, ...patch } : it)),
    )

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!items.length) return
    const isNew = customerId === 'novi'
    const order = await addOrder({
      customerId: isNew ? null : customerId,
      newCustomer: isNew
        ? {
            name: newName,
            phone: newPhone,
            email: '',
            city: newCity,
            address: newAddress,
          }
        : null,
      employeeId,
      items,
      status,
      paymentMethod,
      paid: Math.min(total, parseAmount(paid)),
      note,
      pickupNow,
      ratePlan: paymentMethod === 'Rate' && status !== 'ponuda' && !pickupNow && Number(rateCount) > 0 && rateFirst ? { count: Number(rateCount), first: rateFirst } : null,
      delivery:
        withDelivery && !pickupNow && status !== 'ponuda'
          ? { date: dDate || TODAY, slot, driverId, assembly }
          : null,
    })
    if (order) onCreated(order.id)
  }

  return (
    <Modal
      title="Nova prodaja"
      help="narudzba"
      subtitle="Kupac, artikli, plaćanje i dostava. Ako robe nema u salonu, prodaja se vodi kao narudžba kupca dok roba ne stigne."
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <div className="text-sm">
            Ukupno:{' '}
            <span className="font-display text-xl font-semibold tabular">
              {money2(total)}
            </span>
          </div>
          <Button variant="ghost" className="ml-auto" onClick={onClose}>
            Odustani
          </Button>
          <Button type="submit" form="new-order" disabled={busy}>
            {busy ? 'Spremam…' : 'Spremi prodaju'}
          </Button>
        </div>
      }
    >
      <form id="new-order" onSubmit={submit} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={lbl}>
            Kupac
            <select
              className={inputCls}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="novi">+ Novi kupac (upisujem novog)</option>
              {[...customers]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.city}
                  </option>
                ))}
            </select>
            <span className="mt-1.5 flex items-center gap-2 text-xs font-normal">
              {customerId === 'novi' ? (
                <button
                  type="button"
                  className="font-semibold text-copper-700 hover:underline"
                  onClick={() => setCustomerId(customers[0]?.id ?? '')}
                >
                  ← Izaberi postojećeg kupca
                </button>
              ) : (
                <button
                  type="button"
                  className="font-semibold text-copper-700 hover:underline"
                  onClick={() => setCustomerId('novi')}
                >
                  + Dodaj novog kupca
                </button>
              )}
            </span>
          </label>
          <label className={lbl}>
            Prodavač
            <select
              className={inputCls}
              value={employeeId}
              disabled={restricted}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              {salesPeople.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {customerId === 'novi' && (
          <div className="grid gap-4 rounded-xl border border-walnut-200 bg-linen p-4 sm:grid-cols-2">
            <label className={lbl}>
              Ime i prezime
              <input
                className={inputCls}
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </label>
            <label className={lbl}>
              Telefon
              <input
                className={inputCls}
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </label>
            <label className={lbl}>
              Adresa
              <input
                className={inputCls}
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
              />
            </label>
            <label className={lbl}>
              Grad
              <input
                className={inputCls}
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
              />
            </label>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={pickupNow}
            onChange={(e) => setPickupNow(e.target.checked)}
            className="size-4 accent-copper-500"
          />
          Kupac odmah preuzima robu u salonu (plaćeno u cijelosti, automatski se
          skida sa zaliha)
        </label>

        <fieldset>
          <legend className="mb-2 font-display text-lg font-semibold">
            Artikli
          </legend>
          <div className="space-y-2">
            {items.map((it, i) => it.customKind ? (
              <CustomItemCard
                key={i}
                item={it}
                maxDiscount={maxDiscount}
                onChange={(patch) => update(i, patch)}
                onRemove={() => setItems((l) => l.filter((_, j) => j !== i))}
              />
            ) : (
              <div
                key={i}
                className="grid grid-cols-[1fr_70px_80px_auto] items-end gap-2 rounded-xl border border-walnut-200 bg-linen p-3 sm:grid-cols-[44px_1fr_70px_80px_110px_auto]"
              >
                <span className="hidden sm:block">
                  <ProductImage product={productById(it.productId)} />
                </span>
                <label className={lbl}>
                  Artikal
                  <select
                    className={inputCls}
                    value={it.productId}
                    onChange={(e) =>
                      update(i, {
                        productId: e.target.value,
                        unitPrice: productById(e.target.value).price,
                        variant: '',
                      })
                    }
                  >
                    {sellable.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({money(p.price)})
                        {p.stock <= 0
                          ? ' — po narudžbi'
                          : ` — stanje ${p.stock}`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={lbl}>
                  Kol.
                  <input
                    className={inputCls}
                    type="number"
                    min={1}
                    value={it.qty}
                    onChange={(e) =>
                      update(i, { qty: Math.max(1, Number(e.target.value)) })
                    }
                  />
                </label>
                <label className={lbl}>
                  Popust %
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    max={maxDiscount}
                    value={it.discountPct}
                    onChange={(e) =>
                      update(i, {
                        discountPct: Math.min(
                          maxDiscount,
                          Math.max(0, Number(e.target.value)),
                        ),
                      })
                    }
                  />
                </label>
                <div className="hidden pb-2 text-right text-sm font-semibold tabular sm:block">
                  {money(it.qty * it.unitPrice * (1 - it.discountPct / 100))}
                </div>
                <button
                  type="button"
                  onClick={() => setItems((l) => l.filter((_, j) => j !== i))}
                  className="mb-1 rounded-lg p-2 text-walnut-500 hover:bg-walnut-100"
                  aria-label="Ukloni stavku"
                >
                  <Trash2 className="size-4" />
                </button>
                {(() => {
                  const p = productById(it.productId)
                  const free = p.stock - (reserved.get(p.id) ?? 0)
                  const asked = items.filter((x) => x.productId === it.productId).reduce((n, x) => n + x.qty, 0)
                  if (asked <= free) return null
                  if (pickupNow)
                    return (
                      <div className="col-span-full flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800">
                        <Hourglass className="size-3.5 shrink-0" />
                        U salonu je slobodno {Math.max(0, free)} kom. Kupac ne može odmah preuzeti ovaj artikal — isključite „Kupac odmah preuzima” ili smanjite količinu.
                      </div>
                    )
                  return status !== 'ponuda' ? (
                    <div className="col-span-full flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
                      <Hourglass className="size-3.5 shrink-0" />
                      U salonu je slobodno {Math.max(0, free)} kom. Prodaja će se voditi pod „Narudžbe kupaca” dok roba ne stigne
                      {p.leadTimeDays ? ` (rok dobavljača oko ${p.leadTimeDays} dana)` : ''}.
                    </div>
                  ) : null
                })()}
                <VariantPicker
                  options={productById(it.productId).options}
                  value={it.variant ?? ''}
                  onChange={(variant) => update(i, { variant })}
                />
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="mt-2"
            onClick={() =>
              setItems((l) => [
                ...l,
                {
                  productId: sellable[0].id,
                  qty: 1,
                  unitPrice: sellable[0].price,
                  discountPct: 0,
                },
              ])
            }
          >
            <Plus className="size-4" /> Dodaj artikal
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="mt-2"
            onClick={() =>
              setItems((l) => [
                ...l,
                { productId: '', customKind: 'kuhinja', customName: CUSTOM_KINDS.kuhinja.name, description: '', customImage: null, qty: 1, unitPrice: 0, discountPct: 0 },
              ])
            }
          >
            <Hammer className="size-4" /> Po mjeri (kuhinja, plakar…)
          </Button>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className={lbl}>
            Status
            <select
              className={inputCls}
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
            >
              <option value="ponuda">Ponuda</option>
              <option value="potvrđena">Potvrđena</option>
              <option value="u_izradi">U izradi</option>
            </select>
          </label>
          <label className={lbl}>
            Način plaćanja
            <select
              className={inputCls}
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value as PaymentMethod)
              }
            >
              {(['Gotovina', 'Kartica', 'Virman', 'Rate'] as const).map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className={lbl}>
            Avans / uplaćeno
            <input
              className={inputCls}
              inputMode="decimal"
              placeholder="0"
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
            />
          </label>
        </div>

        {paymentMethod === 'Rate' && status !== 'ponuda' && !pickupNow && (
          <div className="grid gap-4 rounded-xl border border-walnut-200 bg-linen p-4 sm:grid-cols-3">
            <label className={lbl}>
              Broj rata
              <input
                className={inputCls}
                type="number"
                min={1}
                max={60}
                value={rateCount}
                onChange={(e) => setRateCount(e.target.value)}
              />
            </label>
            <label className={lbl}>
              Prva rata
              <input className={inputCls} type="date" value={rateFirst} onChange={(e) => setRateFirst(e.target.value)} />
            </label>
            <p className="self-end text-xs text-walnut-500">
              Ostatak nakon avansa dijeli se na jednake mjesečne rate. Plan se vidi i mijenja u prozoru prodaje, a kašnjenja na stranici Naplata.
            </p>
          </div>
        )}

        {status !== 'ponuda' && !pickupNow && (
          <fieldset className="rounded-xl border border-walnut-200 bg-linen p-4">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={withDelivery}
                onChange={(e) => setWithDelivery(e.target.checked)}
                className="size-4 accent-copper-500"
              />
              Zakaži dostavu na adresu kupca ({customer.address},{' '}
              {customer.city})
            </label>
            {withDelivery && (
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <label className={lbl}>
                  Datum
                  <input
                    className={inputCls}
                    type="date"
                    min={TODAY}
                    value={dDate}
                    onChange={(e) => setDDate(e.target.value)}
                  />
                </label>
                <label className={lbl}>
                  Termin
                  <select
                    className={inputCls}
                    value={slot}
                    onChange={(e) =>
                      setSlot(e.target.value as Delivery['slot'])
                    }
                  >
                    {(['08–12', '12–16', '16–20'] as const).map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className={lbl}>
                  Ekipa
                  <select
                    className={inputCls}
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                  >
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm sm:col-span-3">
                  <input
                    type="checkbox"
                    checked={assembly}
                    onChange={(e) => setAssembly(e.target.checked)}
                    className="size-4 accent-copper-500"
                  />
                  Uključena montaža
                </label>
              </div>
            )}
          </fieldset>
        )}

        <label className={lbl}>
          Napomena
          <textarea
            className={inputCls}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Boja, dimenzije, sprat, posebni zahtjevi…"
          />
        </label>
      </form>
    </Modal>
  )
}

/** Izbor varijante (štof, boja, dimenzija…) za stavku narudžbe. */
function VariantPicker({ options, value, onChange }: { options?: string; value: string; onChange: (v: string) => void }) {
  const groups = parseOptions(options)
  if (!groups.length) return null
  const chosen = Object.fromEntries(
    value
      .split(' · ')
      .map((p) => p.split(': '))
      .filter((x) => x.length === 2),
  ) as Record<string, string>
  const set = (name: string, v: string) => {
    const next = { ...chosen, [name]: v }
    onChange(
      groups
        .filter((g) => next[g.name])
        .map((g) => `${g.name}: ${next[g.name]}`)
        .join(' · '),
    )
  }
  return (
    <div className="col-span-full flex flex-wrap gap-2 border-t border-walnut-200/70 pt-2">
      {groups.map((g) => (
        <label key={g.name} className="flex items-center gap-1.5 text-xs font-semibold text-walnut-700">
          {g.name}
          <select
            className={`rounded-lg border px-2 py-1 text-sm font-medium ${chosen[g.name] ? 'border-walnut-200 bg-white' : 'border-amber-300 bg-amber-50'}`}
            value={chosen[g.name] ?? ''}
            onChange={(e) => set(g.name, e.target.value)}
          >
            <option value="">— odaberite —</option>
            {g.values.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      ))}
    </div>
  )
}

/** Stavka namještaja po mjeri: vrsta, naziv za kupca, opis, cijena iz Palette CAD-a i slika (ide na ponudu). */
function CustomItemCard({
  item,
  maxDiscount,
  onChange,
  onRemove,
}: {
  item: OrderItem
  maxDiscount: number
  onChange: (patch: Partial<OrderItem>) => void
  onRemove: () => void
}) {
  const [price, setPrice] = useState(item.unitPrice ? String(item.unitPrice).replace('.', ',') : '')
  const [imgError, setImgError] = useState('')
  const [loading, setLoading] = useState(false)
  const thumb = item.customImage?.thumb
  const kinds = Object.entries(CUSTOM_KINDS) as [CustomKind, { name: string }][]
  return (
    <div className="grid gap-3 rounded-xl border border-copper-200 bg-copper-50/40 p-3 sm:grid-cols-[120px_1fr]">
      <label className="relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border border-dashed border-walnut-300 bg-white text-center text-[11px] font-semibold text-walnut-500 hover:border-copper-400">
        {thumb ? (
          <img src={`data:${thumb.mime};base64,${thumb.dataB64}`} alt="Slika po mjeri" className="absolute inset-0 size-full object-cover" />
        ) : (
          <>
            <ImagePlus className="size-5" />
            {loading ? 'Učitavam…' : 'Slika iz Palette CAD-a'}
          </>
        )}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Slika stavke po mjeri"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            setImgError('')
            setLoading(true)
            try {
              onChange({ customImage: await prepareImage(f, true) })
            } catch (err) {
              setImgError(err instanceof Error ? err.message : 'Slika nije učitana.')
            } finally {
              setLoading(false)
            }
          }}
        />
      </label>
      <div className="grid grid-cols-6 gap-2">
        <label className={`${lbl} col-span-6 sm:col-span-2`}>
          Po mjeri
          <select
            className={inputCls}
            value={item.customKind}
            onChange={(e) => {
              const k = e.target.value as CustomKind
              const wasDefault = kinds.some(([, d]) => d.name === item.customName)
              onChange({ customKind: k, ...(wasDefault || !item.customName ? { customName: CUSTOM_KINDS[k].name } : {}) })
            }}
          >
            {kinds.map(([k, d]) => (
              <option key={k} value={k}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className={`${lbl} col-span-6 sm:col-span-4`}>
          Naziv za kupca
          <input className={inputCls} value={item.customName ?? ''} onChange={(e) => onChange({ customName: e.target.value })} placeholder="npr. Kuhinja po mjeri — bijeli mat, hrast" />
        </label>
        <label className={`${lbl} col-span-2 sm:col-span-1`}>
          Kol.
          <input className={inputCls} type="number" min={1} value={item.qty} onChange={(e) => onChange({ qty: Math.max(1, Number(e.target.value)) })} />
        </label>
        <label className={`${lbl} col-span-4 sm:col-span-2`}>
          Cijena s PDV-om
          <input
            className={inputCls}
            inputMode="decimal"
            placeholder="iz Palette CAD-a"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value)
              onChange({ unitPrice: Math.max(0, parseAmount(e.target.value)) })
            }}
          />
        </label>
        <label className={`${lbl} col-span-3 sm:col-span-2`}>
          Popust %
          <input
            className={inputCls}
            type="number"
            min={0}
            max={maxDiscount}
            value={item.discountPct}
            onChange={(e) => onChange({ discountPct: Math.min(maxDiscount, Math.max(0, Number(e.target.value))) })}
          />
        </label>
        <button type="button" onClick={onRemove} className="col-span-3 mt-5 self-start justify-self-end rounded-lg p-2 sm:col-span-1 text-walnut-500 hover:bg-walnut-100" aria-label="Ukloni stavku po mjeri">
          <Trash2 className="size-4" />
        </button>
        <label className={`${lbl} col-span-6`}>
          Opis za kupca (ide na ponudu)
          <textarea
            className={inputCls}
            rows={2}
            value={item.description ?? ''}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="npr. Dužina 3,40 m + ugao 1,80 m, fronte bijeli mat, radna ploča hrast, uključeni okovi Blum i montaža"
          />
        </label>
        {imgError && <p className="text-xs font-semibold text-rose-700 col-span-6">{imgError}</p>}
        <p className="text-xs text-walnut-500 col-span-6">
          Iznos: <b>{money(item.qty * item.unitPrice * (1 - item.discountPct / 100))}</b> · Kad prodaju potvrdite, radionica dobije radni nalog. Status „Spremna” je moguć kad je nalog gotov.
        </p>
      </div>
    </div>
  )
}
