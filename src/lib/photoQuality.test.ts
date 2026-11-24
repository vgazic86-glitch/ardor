import { describe, expect, it } from 'vitest'
import { applyTable, edgeColor, fitPlan, levelsTable, photoStats, photoWarnings, sharpness, sharpen } from './photoQuality'

/** Slika w×h u jednoj boji ili po funkciji. */
function img(w: number, h: number, f: (x: number, y: number) => number) {
  const d = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = f(x, y), i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255 }
  return d
}

describe('fotografije za web: omjer 4:3', () => {
  it('fotografija blizu omjera se izreže po sredini', () => {
    const p = fitPlan(4000, 3000)
    expect(p.mode).toBe('izrez')
    expect(p.sw / p.sh).toBeCloseTo(4 / 3)
    const wide = fitPlan(4000, 2600) // 1,54 — izreže lijevo i desno
    expect(wide.mode).toBe('izrez')
    expect(wide.sh).toBe(2600)
    expect(wide.sx).toBeGreaterThan(0)
  })
  it('jako uska (uspravna s mobitela) ide cijela na podlogu', () => {
    const p = fitPlan(3000, 4000)
    expect(p.mode).toBe('podloga')
    expect(p.dh).toBeLessThanOrEqual(1200)
    expect(p.dx).toBeGreaterThan(0)
  })
})

describe('fotografije za web: svjetlina', () => {
  it('tamnu fotografiju posvijetli', () => {
    const dark = img(40, 30, (x) => 10 + x) // 10..49
    const lv = levelsTable(photoStats(dark))
    expect(lv.changed).toBe(true)
    const before = photoStats(dark).mean
    applyTable(dark, lv.table)
    expect(photoStats(dark).mean).toBeGreaterThan(before + 0.05)
  })
  it('dobru fotografiju ne dira', () => {
    const ok = img(256, 2, (x) => x)
    expect(levelsTable(photoStats(ok)).changed).toBe(false)
  })
})

describe('fotografije za web: oštrina i upozorenja', () => {
  it('oštri rubovi imaju veću oštrinu od jednolične plohe', () => {
    const flat = img(50, 50, () => 128)
    const edges = img(50, 50, (x, y) => ((x >> 2) + (y >> 2)) % 2 ? 230 : 20)
    expect(sharpness(flat, 50, 50)).toBeLessThan(1)
    expect(sharpness(edges, 50, 50)).toBeGreaterThan(1000)
  })
  it('izoštravanje ne mijenja jednoličnu plohu', () => {
    const flat = img(10, 10, () => 100)
    sharpen(flat, 10, 10)
    expect(flat[(5 * 10 + 5) * 4]).toBe(100)
  })
  it('upozori za premalu i mutnu', () => {
    expect(photoWarnings(800, 600, 500)).toHaveLength(1)
    expect(photoWarnings(4000, 3000, 5)).toHaveLength(1)
    expect(photoWarnings(4000, 3000, 500)).toHaveLength(0)
  })
  it('boja ruba za podlogu', () => {
    expect(edgeColor(img(20, 20, () => 200), 20, 20)).toEqual([200, 200, 200])
  })
})
