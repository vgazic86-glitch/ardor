import { describe, expect, it } from 'vitest'
import { canSeeDocument, MANUALS, MANUAL_CATEGORY, parseRoles, visibleDocuments } from './manuals'

const file = { id: '1', name: 'x.pdf', mime: 'application/pdf', size: 1 }
const manual = (slug: string, withFile = true) => {
  const m = MANUALS.find((x) => x.slug === slug)!
  return { slug, category: MANUAL_CATEGORY, roles: m.roles as string[], file: withFile ? file : null }
}
const all = MANUALS.map((m) => manual(m.slug))
const seen = (role: string) => visibleDocuments(all, role).map((d) => d.slug).sort()

describe('priručnici po ulozi', () => {
  it('admin i uprava vide svih 9', () => {
    expect(seen('admin')).toHaveLength(9)
    expect(seen('uprava')).toHaveLength(9)
  })
  it('trgovac: svoj + uređenje salona', () => {
    expect(seen('trgovac')).toEqual(['prirucnik-trgovac', 'prirucnik-uredjenje-salona'])
  })
  it('voditelj: svoj + uređenje salona + digitalni marketing', () => {
    expect(seen('voditelj')).toEqual(['digitalni-marketing', 'prirucnik-uredjenje-salona', 'prirucnik-voditelj-salona'])
  })
  it('nagrađivanje vide samo admin i uprava', () => {
    for (const r of ['trgovac', 'voditelj', 'operativa', 'dostava']) expect(seen(r)).not.toContain('nagradjivanje-stimulacija')
  })
  it('operativa i dostava: samo svoj', () => {
    expect(seen('operativa')).toEqual(['prirucnik-operativa-skladiste'])
    expect(seen('dostava')).toEqual(['prirucnik-dostava-montaza'])
  })
  it('vlasnika i marketinga ne vidi nitko osim admina i uprave', () => {
    for (const r of ['trgovac', 'voditelj', 'operativa', 'dostava']) {
      expect(seen(r)).not.toContain('prirucnik-vlasnika')
      expect(seen(r)).not.toContain('prirucnik-voditelj-marketinga')
    }
  })
  it('priručnik bez PDF-a vidi samo admin/uprava', () => {
    expect(canSeeDocument(manual('prirucnik-trgovac', false), 'trgovac')).toBe(false)
    expect(canSeeDocument(manual('prirucnik-trgovac', false), 'admin')).toBe(true)
  })
  it('obični dokument bez uloga vide svi', () => {
    expect(canSeeDocument({ category: 'Pravila', roles: [], file: null }, 'dostava')).toBe(true)
  })
  it('uloge iz baze', () => {
    expect(parseRoles('trgovac, voditelj')).toEqual(['trgovac', 'voditelj'])
    expect(parseRoles('')).toEqual([])
  })
})
