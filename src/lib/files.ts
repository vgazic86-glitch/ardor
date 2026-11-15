/** Pomoćne funkcije za učitavanje i preuzimanje datoteka u pregledniku. */

export const MAX_UPLOAD = 4 * 1024 * 1024

export const ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.odt,.ods,.jpg,.jpeg,.png,.webp,.txt'

export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

export async function toUpload(file: File) {
  if (file.size > MAX_UPLOAD)
    throw new Error(`Datoteka „${file.name}” je veća od 4 MB.`)
  const buf = new Uint8Array(await file.arrayBuffer())
  let bin = ''
  for (let i = 0; i < buf.length; i += 0x8000)
    bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return {
    name: file.name,
    mime: file.type || 'application/octet-stream',
    dataB64: btoa(bin),
  }
}

/** Otvara PDF/sliku u novoj kartici, ostalo preuzima. */
export function openDownload(f: {
  name: string
  mime: string
  dataB64: string
}) {
  const bin = atob(f.dataB64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const url = URL.createObjectURL(new Blob([bytes], { type: f.mime }))
  const viewable = /^(application\/pdf|image\/)/.test(f.mime)
  if (viewable) {
    const w = window.open(url, '_blank')
    if (w) {
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      return
    }
  }
  const a = document.createElement('a')
  a.href = url
  a.download = f.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
