import {
  Armchair,
  BedDouble,
  Briefcase,
  CookingPot,
  ImagePlus,
  Lamp,
  Loader2,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { imageUrl, prepareImage } from '../lib/image'
import { useStore } from '../lib/store'
import type { Product } from '../lib/types'

const categoryIcon: Record<string, typeof Armchair> = {
  'Sjedeće garniture': Armchair,
  Kuhinje: CookingPot,
  'Spavaće sobe': BedDouble,
  Blagovaonice: UtensilsCrossed,
  'Uredski namještaj': Briefcase,
  'Dekor i rasvjeta': Lamp,
}

const sizes = {
  xs: 'size-8 rounded-md',
  sm: 'size-11 rounded-lg',
  md: 'size-16 rounded-xl',
  lg: 'w-full aspect-[4/3] rounded-2xl',
}

/** Sličica ili velika slika artikla; bez slike prikazuje ikonu kategorije. */
export function ProductImage({
  product,
  size = 'sm',
  className = '',
}: {
  product: Pick<Product, 'name' | 'category' | 'imageId' | 'thumbId'>
  size?: keyof typeof sizes
  className?: string
}) {
  const src = imageUrl(size === 'lg' ? product.imageId : product.thumbId)
  const Icon = categoryIcon[product.category] ?? Armchair
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden border border-walnut-200/80 bg-walnut-50 ${sizes[size]} ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : (
        <Icon
          className={
            size === 'lg'
              ? 'size-12 text-walnut-300'
              : size === 'md'
                ? 'size-7 text-walnut-300'
                : 'size-[45%] text-walnut-300'
          }
          aria-hidden
        />
      )}
    </span>
  )
}

/** Velika slika s mogućnošću promjene (klik ili povlačenje datoteke) i uklanjanja. */
export function ProductImageEditor({ product }: { product: Product }) {
  const { setProductImage, notify } = useStore()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)

  async function upload(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      await setProductImage(product.id, await prepareImage(file))
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Slika nije spremljena.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div
      className={`group relative ${over ? 'ring-2 ring-copper-400 ring-offset-2 ring-offset-paper' : ''} rounded-2xl`}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        upload(e.dataTransfer.files?.[0])
      }}
    >
      <ProductImage product={product} size="lg" />
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => upload(e.target.files?.[0])}
        aria-label={`Slika artikla ${product.name}`}
      />
      <div className="absolute inset-x-3 bottom-3 flex gap-2">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-sm font-semibold text-walnut-900 shadow-card backdrop-blur hover:bg-white disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4 text-copper-600" />
          )}
          {busy
            ? 'Spremam…'
            : product.imageId
              ? 'Promijeni sliku'
              : 'Dodaj sliku'}
        </button>
        {product.imageId && !busy && (
          <button
            type="button"
            onClick={async () => {
              setBusy(true)
              await setProductImage(product.id, null)
              setBusy(false)
            }}
            className="rounded-lg bg-white/90 px-3 py-2 text-walnut-600 shadow-card backdrop-blur hover:bg-white hover:text-rose-700"
            aria-label="Ukloni sliku"
            title="Ukloni sliku"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
      {!product.imageId && !busy && (
        <p className="pointer-events-none absolute inset-x-0 top-[38%] text-center text-xs text-walnut-400">
          ili povucite sliku ovdje
        </p>
      )}
    </div>
  )
}
