/**
 * Obrada fotografija za web stranicu (čista matematika nad RGBA pikselima, radi i u testovima):
 * isti omjer 4:3 kao na webu, ujednačena svjetlina i kontrast, blago izoštravanje,
 * upozorenje za premalu ili mutnu fotografiju.
 */

/** Web prikazuje artikle u omjeru 4:3 (katalog, stranica artikla). */
export const WEB_PHOTO = { width: 1600, height: 1200, minSide: 800, quality: 0.86 } as const

const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b

export interface PhotoStats {
  /** 1. i 99. percentil svjetline (0–255) */
  lo: number
  hi: number
  /** prosječna svjetlina 0–1 */
  mean: number
}

export function photoStats(data: Uint8ClampedArray): PhotoStats {
  const hist = new Uint32Array(256)
  let sum = 0
  const n = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    const l = Math.round(lum(data[i], data[i + 1], data[i + 2]))
    hist[l]++
    sum += l
  }
  const pct = (p: number) => {
    const target = n * p
    let acc = 0
    for (let v = 0; v < 256; v++) {
      acc += hist[v]
      if (acc >= target) return v
    }
    return 255
  }
  return { lo: pct(0.01), hi: pct(0.99), mean: n ? sum / n / 255 : 0.5 }
}

/**
 * Tablica za ujednačenje: razvuče raspon svjetline (ograničeno, da se boje ne „spale”)
 * i posvijetli tamnu / malo stiša preeksponiranu fotografiju.
 */
export function levelsTable(s: PhotoStats) {
  const lo = Math.min(s.lo, 40)
  const hi = Math.max(s.hi, 150)
  const gain = Math.min(255 / Math.max(1, hi - lo), 1.6)
  // Svjetlina nakon razvlačenja → gama prema ~0,5.
  const m = Math.min(1, Math.max(0.01, ((s.mean * 255 - lo) * gain) / 255))
  let gamma = 1
  if (m < 0.42) gamma = Math.max(0.6, Math.log(0.48) / Math.log(m))
  else if (m > 0.64) gamma = Math.min(1.15, Math.log(0.6) / Math.log(m))
  const t = new Uint8ClampedArray(256)
  for (let v = 0; v < 256; v++) {
    const x = Math.min(1, Math.max(0, ((v - lo) * gain) / 255))
    t[v] = Math.round(Math.pow(x, gamma) * 255)
  }
  return { table: t, gain, gamma, changed: gain > 1.03 || Math.abs(gamma - 1) > 0.03 }
}

export function applyTable(data: Uint8ClampedArray, t: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = t[data[i]]
    data[i + 1] = t[data[i + 1]]
    data[i + 2] = t[data[i + 2]]
  }
}

/** Kako fotografiju smjestiti u 4:3: blizu omjera → izreži sredinu; jako uska/široka → cijela, s podlogom. */
export function fitPlan(w: number, h: number, outW: number = WEB_PHOTO.width, outH: number = WEB_PHOTO.height) {
  const ratio = outW / outH
  const a = w / h
  if (Math.abs(a / ratio - 1) <= 0.22) {
    // izrezivanje (cover)
    const sw = a > ratio ? h * ratio : w
    const sh = a > ratio ? h : w / ratio
    return { mode: 'izrez' as const, sx: (w - sw) / 2, sy: (h - sh) / 2, sw, sh, dx: 0, dy: 0, dw: outW, dh: outH }
  }
  // cijela fotografija (contain) uz rub od 4 %
  const pad = 0.04
  const s = Math.min((outW * (1 - 2 * pad)) / w, (outH * (1 - 2 * pad)) / h)
  const dw = w * s
  const dh = h * s
  return { mode: 'podloga' as const, sx: 0, sy: 0, sw: w, sh: h, dx: (outW - dw) / 2, dy: (outH - dh) / 2, dw, dh }
}

/** Prosječna boja ruba fotografije — podloga koja se uklapa (umjesto crnih ili bijelih pruga). */
export function edgeColor(data: Uint8ClampedArray, w: number, h: number): [number, number, number] {
  let r = 0, g = 0, b = 0, n = 0
  const add = (x: number, y: number) => {
    const i = (y * w + x) * 4
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
  }
  const step = Math.max(1, Math.floor(Math.max(w, h) / 200))
  for (let x = 0; x < w; x += step) { add(x, 0); add(x, h - 1) }
  for (let y = 0; y < h; y += step) { add(0, y); add(w - 1, y) }
  return n ? [Math.round(r / n), Math.round(g / n), Math.round(b / n)] : [244, 241, 236]
}

/** Oštrina: varijanca Laplaceovog operatora na svjetlini (manje = mutnije). Mjeri se na umanjenoj slici (~500 px). */
export function sharpness(data: Uint8ClampedArray, w: number, h: number) {
  if (w < 3 || h < 3) return 0
  const L = new Float32Array(w * h)
  for (let i = 0, p = 0; p < w * h; i += 4, p++) L[p] = lum(data[i], data[i + 1], data[i + 2])
  let sum = 0, sum2 = 0, n = 0
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x
      const v = 4 * L[p] - L[p - 1] - L[p + 1] - L[p - w] - L[p + w]
      sum += v; sum2 += v * v; n++
    }
  const mean = sum / n
  return sum2 / n - mean * mean
}

/** Blago izoštravanje (unsharp mask 3×3) nakon smanjivanja. */
export function sharpen(data: Uint8ClampedArray, w: number, h: number, amount = 0.35) {
  const src = new Uint8ClampedArray(data)
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4
      for (let c = 0; c < 3; c++) {
        const k = i + c
        const blur = (src[k - 4] + src[k + 4] + src[k - w * 4] + src[k + w * 4] + 4 * src[k]) / 8
        data[k] = src[k] + amount * (src[k] - blur) * 2
      }
    }
}

/** Ispod ove oštrine (na ~500 px) fotografija je vjerojatno mutna. Izmjereno na fotografijama s weba: oštre 136–2131, blago zamućene (σ≈2,4 px) 2–15. */
export const BLUR_LIMIT = 50

export function photoWarnings(w: number, h: number, sharp: number) {
  const out: string[] = []
  if (Math.min(w, h) < WEB_PHOTO.minSide) out.push(`premala (${w} × ${h} px) — na webu može izgledati mutno; najbolje barem ${WEB_PHOTO.minSide} px po kraćoj strani`)
  if (sharp < BLUR_LIMIT) out.push('izgleda mutno ili neoštro — provjeri je li fotografija izoštrena')
  return out
}
