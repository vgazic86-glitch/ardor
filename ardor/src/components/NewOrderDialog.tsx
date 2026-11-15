import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  itemsTotal,
  type Delivery,
  type OrderItem,
  type OrderStatus,
  type PaymentMethod,
} from '../lib/types'
import { money, money2, parseAmount } from '../lib/format'
import { useStore } from '../lib/store'
import { Modal } from './Modal'
import { Button, inputCls } from './ui'

const lbl = 'flex flex-col gap-1 text-xs font-semibold text-walnut-700'

export function NewOrderDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const {
    addOrder,
    customers,
    drivers,
    products,
    salesPeople,
    today: TODAY,
    productById,
    me,
    busy,
  } = useStore()
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '')
  const [employeeId, setEmployeeId] = useState(
    me && me.role !== 'Dostava i montaža' ? me.id : (salesPeople[0]?.id ?? ''),
  )
  const [items, setItems] = useState<OrderItem[]>(
    products[0]
      ? [
          {
            productId: products[0].id,
            qty: 1,
            unitPrice: products[0].price,
            discountPct: 0,
          },
        ]
      : [],
  )
  const [status, setStatus] = useState<OrderStatus>('potvrđena')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Kartica')
  const [paid, setPaid] = useState('')
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
      delivery:
        withDelivery && !pickupNow && status !== 'ponuda'
          ? { date: dDate || TODAY, slot, driverId, assembly }
          : null,
    })
    if (order) onCreated(order.id)
  }

  return (
    <Modal
      title="Nova narudžba"
      subtitle="Unesite kupca, artikle, plaćanje i termin dostave."
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
            {busy ? 'Spremam…' : 'Spremi narudžbu'}
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
              {[...customers]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.city}
                  </option>
                ))}
              <option value="novi">+ Novi kupac…</option>
            </select>
          </label>
          <label className={lbl}>
            Prodavač
            <select
              className={inputCls}
              value={employeeId}
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
            {items.map((it, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_70px_80px_auto] items-end gap-2 rounded-xl border border-walnut-200 bg-linen p-3 sm:grid-cols-[1fr_70px_80px_110px_auto]"
              >
                <label className={lbl}>
                  Artikal
                  <select
                    className={inputCls}
                    value={it.productId}
                    onChange={(e) =>
                      update(i, {
                        productId: e.target.value,
                        unitPrice: productById(e.target.value).price,
                      })
                    }
                  >
                    {products.map((p) => (
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
                    max={50}
                    value={it.discountPct}
                    onChange={(e) =>
                      update(i, {
                        discountPct: Math.min(
                          50,
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
                  productId: products[0].id,
                  qty: 1,
                  unitPrice: products[0].price,
                  discountPct: 0,
                },
              ])
            }
          >
            <Plus className="size-4" /> Dodaj artikal
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
