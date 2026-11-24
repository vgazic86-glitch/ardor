/** Smanjivanje slika u pregledniku prije slanja (velika slika + sličica). */
import type { ImagePart, ProductImageUpload } from '../server/images'

const blobToB64 = async (b: Blob) => {
  const buf = new Uint8Array(await b.arrayBuffer())
  let bin = ''
  for (let i = 0; i < buf.length; i += 0x8000)
    bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(bin)
}

async function encode(
  bmp: ImageBitmap,
  max: number,
  quality: number,
  jpeg = false,
): Promise<ImagePart> {
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale))
  const h = Math.max(1, Math.round(bmp.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff' // prozirne PNG slike dobijaju bijelu pozadinu
  ctx.fillRect(0, 0, w, h)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, w, h)
  const toBlob = (type: string) =>
    new Promise<Blob | null>((r) => canvas.toBlob(r, type, quality))
  let blob = jpeg ? null : await toBlob('image/webp')
  if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg')
  if (!blob) throw new Error('Slika se ne može obraditi.')
  return { mime: blob.type, dataB64: await blobToB64(blob) }
}

/** jpeg = true: JPEG umjesto WebP (slika ide i na PDF dokumente). */
export async function prepareImage(file: File, jpeg = false): Promise<ProductImageUpload> {
  if (!file.type.startsWith('image/'))
    throw new Error('Odaberite sliku (JPG, PNG ili WebP).')
  if (file.size > 25 * 1024 * 1024) throw new Error('Slika je veća od 25 MB.')
  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error(
      'Ovaj format slike preglednik ne može otvoriti. Spremite je kao JPG ili PNG.',
    )
  }
  try {
    return {
      name: file.name,
      image: await encode(bmp, 1200, 0.82, jpeg),
      thumb: await encode(bmp, 240, 0.78, jpeg),
    }
  } finally {
    bmp.close()
  }
}

export const imageUrl = (id: string | null) => (id ? `/api/slike/${id}` : null)

/**
 * Fotografija za web stranicu: 1600 × 1200 (4:3 kao na webu), ujednačena svjetlina i kontrast,
 * blago izoštrena, JPEG. Vraća i upozorenja (premala, mutna) i što je napravljeno.
 */
export async function prepareWebPhoto(file: File): Promise<{ image: ImagePart; warnings: string[]; done: string[] }> {
  const q = await import('./photoQuality')
  if (!file.type.startsWith('image/')) throw new Error('Odaberite sliku (JPG, PNG ili WebP).')
  if (file.size > 25 * 1024 * 1024) throw new Error('Slika je veća od 25 MB.')
  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('Ovaj format slike preglednik ne može otvoriti. Spremite je kao JPG ili PNG.')
  }
  try {
    const W = q.WEB_PHOTO.width, H = q.WEB_PHOTO.height
    // 1) mjerenje na umanjenoj kopiji (~500 px): oštrina, svjetlina, boja ruba
    const ms = Math.min(1, 500 / Math.max(bmp.width, bmp.height))
    const mw = Math.max(3, Math.round(bmp.width * ms)), mh = Math.max(3, Math.round(bmp.height * ms))
    const mc = document.createElement('canvas')
    mc.width = mw; mc.height = mh
    const mx = mc.getContext('2d', { willReadFrequently: true })!
    mx.fillStyle = '#ffffff'; mx.fillRect(0, 0, mw, mh)
    mx.drawImage(bmp, 0, 0, mw, mh)
    const small = mx.getImageData(0, 0, mw, mh).data
    const sharp = q.sharpness(small, mw, mh)
    const stats = q.photoStats(small)
    const lv = q.levelsTable(stats)
    const [er, eg, eb] = q.edgeColor(small, mw, mh)
    // 2) smještanje u 4:3
    const plan = q.fitPlan(bmp.width, bmp.height, W, H)
    const c = document.createElement('canvas')
    c.width = W; c.height = H
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.fillStyle = `rgb(${er},${eg},${eb})`
    ctx.fillRect(0, 0, W, H)
    if (plan.mode === 'podloga') {
      // Podloga = ista fotografija (sredina u 4:3) jako zamućena i posvijetljena.
      // Radi u svim preglednicima: nacrtaj sitno (32 × 24), pa razvuci preko cijele slike.
      const r = W / H
      const sw = Math.min(bmp.width, bmp.height * r)
      const sh = sw / r
      const tc = document.createElement('canvas')
      tc.width = 32; tc.height = 24
      const tx = tc.getContext('2d')!
      tx.drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) / 2, sw, sh, 0, 0, 32, 24)
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(tc, 0, 0, W, H)
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(0, 0, W, H)
    }
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bmp, plan.sx, plan.sy, plan.sw, plan.sh, plan.dx, plan.dy, plan.dw, plan.dh)
    // 3) svjetlina/kontrast i izoštravanje
    const img = ctx.getImageData(0, 0, W, H)
    if (lv.changed) q.applyTable(img.data, lv.table)
    q.sharpen(img.data, W, H)
    ctx.putImageData(img, 0, 0)
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', q.WEB_PHOTO.quality))
    if (!blob) throw new Error('Slika se ne može obraditi.')
    const done = [
      plan.mode === 'izrez' ? 'izrezana na omjer 4:3' : 'cijela, na zamućenoj podlozi (4:3)',
      ...(lv.gamma < 0.97 ? ['posvijetljena'] : lv.gamma > 1.03 ? ['malo potamnjena'] : []),
      ...(lv.gain > 1.03 ? ['pojačan kontrast'] : []),
      'izoštrena',
    ]
    return { image: { mime: 'image/jpeg', dataB64: await blobToB64(blob) }, warnings: q.photoWarnings(bmp.width, bmp.height, sharp), done }
  } finally {
    bmp.close()
  }
}
