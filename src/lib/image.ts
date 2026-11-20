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
