import { ImagePlus } from 'lucide-react'
import { useState } from 'react'
import { prepareImage } from '../lib/image'
import { ProductImageEditor } from './ProductImage'
import type { Product } from '../lib/types'
import { money2, netOf, parseAmount, pct, VAT_RATE } from '../lib/format'
import { useStore } from '../lib/store'
import { Modal } from './Modal'
import { Button, Field, inputCls } from './ui'

/** Novi artikal ili izmjena postojećeg. */
export function ProductDialog({
  product,
  onClose,
  onSaved,
  prefill,
}: {
  product: Product | null
  onClose: () => void
  onSaved?: (id: string) => void
  /** Podaci iz primke (dokument dobavljača) za novi artikal. */
  prefill?: { sku?: string; name?: string; cost?: number; supplierId?: string | null }
}) {
  const { suppliers, products, categories, saveProduct, setProductImage, notify, busy } =
    useStore()
  const [newImage, setNewImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const live = product
    ? (products.find((p) => p.id === product.id) ?? product)
    : null
  const nextSku = () => {
    const nums = products
      .map((p) => Number(p.sku.replace(/\D/g, '')))
      .filter(Number.isFinite)
    return `ART-${String((Math.max(0, ...nums) || 0) + 1).padStart(3, '0')}`
  }
  const [sku, setSku] = useState(product?.sku ?? prefill?.sku ?? nextSku())
  const [name, setName] = useState(product?.name ?? prefill?.name ?? '')
  const [category, setCategory] = useState<string>(
    product?.category ?? categories[0] ?? 'Ostalo',
  )
  // Popis: kategorije iz Artikala; ako artikal ima kategoriju koje nema na popisu, ona se pokaže da se ne izgubi.
  const categoryChoices = [...new Set([...categories, category])]
  const [price, setPrice] = useState(product ? String(product.price) : '')
  const [cost, setCost] = useState(
    product ? String(product.purchasePrice) : prefill?.cost ? String(prefill.cost) : '',
  )
  const [minStock, setMinStock] = useState(String(product?.minStock ?? 1))
  const [supplierId, setSupplierId] = useState(
    product?.supplierId ?? prefill?.supplierId ?? suppliers[0]?.id ?? '',
  )
  const [opening, setOpening] = useState('0')
  const [options, setOptions] = useState(product?.options ?? '')

  const p = parseAmount(price)
  const c = parseAmount(cost)
  const net = netOf(p)
  const margin = net - c

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const res = await saveProduct({
      id: product?.id ?? null,
      sku,
      name,
      category,
      price: p,
      purchasePrice: c,
      minStock: Number(minStock) || 0,
      supplierId: supplierId || null,
      openingStock: product ? 0 : Number(opening) || 0,
      options,
    })
    if (res) {
      if (!product && newImage) {
        try {
          await setProductImage(res.id, await prepareImage(newImage))
        } catch (err) {
          notify(err instanceof Error ? err.message : 'Slika nije spremljena.')
        }
      }
      onSaved?.(res.id)
      onClose()
    }
  }

  return (
    <Modal
      title={product ? 'Uredi artikal' : 'Novi artikal'}
      subtitle={
        product
          ? `${product.sku} · na stanju ${product.stock}`
          : 'Šifra, cijene, minimalna zaliha i dobavljač.'
      }
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="ml-auto" onClick={onClose}>
            Odustani
          </Button>
          <Button type="submit" form="product-form" disabled={busy}>
            {busy ? 'Spremam…' : 'Spremi artikal'}
          </Button>
        </div>
      }
    >
      <form
        id="product-form"
        onSubmit={submit}
        className="grid gap-4 sm:grid-cols-2"
      >
        {live ? (
          <div className="sm:col-span-2 sm:mx-auto sm:w-80">
            <ProductImageEditor product={live} />
          </div>
        ) : (
          <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-walnut-300 bg-walnut-50 p-3 hover:bg-white sm:col-span-2">
            <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-walnut-200 bg-white">
              {preview ? (
                <img src={preview} alt="" className="size-full object-cover" />
              ) : (
                <ImagePlus className="size-6 text-walnut-400" />
              )}
            </span>
            <span className="text-sm">
              <span className="block font-semibold text-walnut-900">
                {newImage ? newImage.name : 'Dodaj sliku artikla'}
              </span>
              <span className="block text-xs text-walnut-500">
                JPG, PNG ili WebP — slika se automatski smanjuje.
              </span>
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setNewImage(f)
                if (preview) URL.revokeObjectURL(preview)
                setPreview(f ? URL.createObjectURL(f) : null)
              }}
            />
          </label>
        )}
        <Field label="Šifra">
          <input
            className={inputCls}
            required
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
        </Field>
        <Field label="Kategorija" hint="Nove kategorije dodajete u Artiklima → Kategorije.">
          <select
            className={inputCls}
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categoryChoices.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Naziv artikla" className="sm:col-span-2">
          <input
            className={inputCls}
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="npr. Ugaona garnitura Mila, siva"
          />
        </Field>
        <Field label="Maloprodajna cijena (s PDV-om)">
          <input
            className={inputCls}
            inputMode="decimal"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0,00"
          />
        </Field>
        <Field
          label="Nabavna cijena (bez PDV-a)"
          hint="Ažurira se automatski pri svakom prijemu robe."
        >
          <input
            className={inputCls}
            inputMode="decimal"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="0,00"
          />
        </Field>
        <Field label="Dobavljač">
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
        <Field
          label="Minimalna zaliha"
          hint="Ispod ove količine artikal ide na listu za naručivanje."
        >
          <input
            className={inputCls}
            type="number"
            min={0}
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
          />
        </Field>
        {!product && (
          <Field
            label="Početno stanje (komada)"
            hint="Roba koja je već u salonu. Kasniji ulazi idu preko prijema robe."
          >
            <input
              className={inputCls}
              type="number"
              min={0}
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
            />
          </Field>
        )}

        <Field
          label="Varijante (neobavezno)"
          hint="Jedna grupa po redu: naziv, dvotačka, vrijednosti odvojene zarezom. Kupac bira pri narudžbi."
          className="sm:col-span-2"
        >
          <textarea
            className={`${inputCls} min-h-20 font-mono text-[13px]`}
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            placeholder={'Štof: Soft siva, Soft bež, Velvet zelena\nNoge: hrast, crni metal\nOrijentacija: lijeva, desna'}
          />
        </Field>
        <div className="grid grid-cols-3 gap-3 rounded-xl border border-walnut-200 bg-walnut-50 p-4 text-sm sm:col-span-2">
          <div>
            <div className="text-xs text-walnut-500">
              Cijena bez PDV-a ({Math.round(VAT_RATE * 100)}%)
            </div>
            <div className="font-semibold tabular">{money2(net)}</div>
          </div>
          <div>
            <div className="text-xs text-walnut-500">Razlika u cijeni</div>
            <div
              className={`font-semibold tabular ${margin < 0 ? 'text-rose-700' : ''}`}
            >
              {money2(margin)}
            </div>
          </div>
          <div>
            <div className="text-xs text-walnut-500">Marža</div>
            <div
              className={`font-semibold tabular ${margin < 0 ? 'text-rose-700' : 'text-moss-600'}`}
            >
              {net ? pct(margin / net) : '—'}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  )
}
