/** Slike artikala. Uvozi se samo iz serverskih funkcija i serverskih ruta. */
import { and, eq, or, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const ALLOWED = ['image/webp', 'image/jpeg', 'image/png']

export interface ImagePart {
  mime: string
  dataB64: string
}
export interface ProductImageUpload {
  name: string
  image: ImagePart
  thumb: ImagePart
}

export function decodeImage(p: ImagePart) {
  return decode(p)
}

function decode(p: ImagePart) {
  if (!ALLOWED.includes(p.mime))
    throw new Error('Dozvoljene su slike JPG, PNG ili WebP.')
  const data = Buffer.from(p.dataB64, 'base64')
  if (!data.length) throw new Error('Slika je prazna.')
  if (data.length > MAX_IMAGE_BYTES)
    throw new Error('Slika je prevelika (najviše 2 MB nakon smanjivanja).')
  return data
}

/** Postavlja novu sliku artikla (ili briše uz null) i uklanja staru iz baze. */
export async function setProductImage(
  productId: string,
  upload: ProductImageUpload | null,
) {
  const pid = Number(productId)
  await db.transaction(async (tx) => {
    const [p] = await tx
      .select({ imageId: t.products.imageId, thumbId: t.products.thumbId })
      .from(t.products)
      .where(eq(t.products.id, pid))
    if (!p) throw new Error('Artikal nije pronađen.')
    let imageId: number | null = null
    let thumbId: number | null = null
    if (upload) {
      const base =
        upload.name.replace(/\.[^.]+$/, '').slice(0, 120) || 'artikal'
      const ext = (m: string) =>
        m === 'image/webp' ? 'webp' : m === 'image/png' ? 'png' : 'jpg'
      const img = decode(upload.image)
      const th = decode(upload.thumb)
      ;[{ id: imageId }] = await tx
        .insert(t.files)
        .values({
          name: `${base}.${ext(upload.image.mime)}`,
          mime: upload.image.mime,
          size: img.length,
          data: img,
        })
        .returning()
      ;[{ id: thumbId }] = await tx
        .insert(t.files)
        .values({
          name: `${base}-mala.${ext(upload.thumb.mime)}`,
          mime: upload.thumb.mime,
          size: th.length,
          data: th,
        })
        .returning()
    }
    await tx
      .update(t.products)
      .set({ imageId, thumbId })
      .where(eq(t.products.id, pid))
    const old = [p.imageId, p.thumbId].filter((x): x is number => x !== null)
    for (const id of old) await tx.delete(t.files).where(eq(t.files.id, id))
  })
}

/**
 * Vraća sliku samo ako pripada nekom artiklu — tako se preko ove javne adrese
 * ne mogu dohvatiti ugovori ni drugi povjerljivi dokumenti.
 */
export async function readProductImage(id: number) {
  if (!Number.isInteger(id) || id <= 0) return null
  const [f] = await db
    .select({ mime: t.files.mime, data: t.files.data })
    .from(t.files)
    .where(
      and(
        eq(t.files.id, id),
        or(
          sql`exists (select 1 from ${t.products} where ${or(eq(t.products.imageId, id), eq(t.products.thumbId, id))})`,
          sql`exists (select 1 from ${t.complaintPhotos} where ${or(eq(t.complaintPhotos.imageId, id), eq(t.complaintPhotos.thumbId, id))})`,
          sql`exists (select 1 from ${t.orderItems} where ${or(eq(t.orderItems.imageId, id), eq(t.orderItems.thumbId, id))})`,
        ),
      ),
    )
  return f ?? null
}
