/**
 * Interna šifra artikla: ART-0001, ART-0002 … redom.
 * Novi artikal dobije najmanji slobodan broj, pa se rupa nakon arhiviranja (brisanja) popuni.
 * Fiskalna šifra (iz knjigovodstvenog programa) je posebno polje i ne mijenja se.
 */
export const SKU_PREFIX = 'ART-'

export function formatSku(n: number) {
  return `${SKU_PREFIX}${String(n).padStart(4, '0')}`
}

export function skuNumber(sku: string): number | null {
  const m = /^ART-(\d+)$/i.exec(sku.trim())
  return m ? Number(m[1]) : null
}

export function nextInternalSku(skus: Iterable<string>) {
  const used = new Set<number>()
  for (const s of skus) {
    const n = skuNumber(s)
    if (n) used.add(n)
  }
  let n = 1
  while (used.has(n)) n++
  return formatSku(n)
}

/** Šifra arhiviranog artikla: oslobađa broj za nove artikle, a ostaje jedinstvena. */
export const archivedSku = (id: string | number) => `ARH-${id}`
