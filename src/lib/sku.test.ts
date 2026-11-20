import { describe, expect, it } from 'vitest'
import { archivedSku, formatSku, nextInternalSku, skuNumber } from './sku'

describe('interna šifra artikla', () => {
  it('formatira redom s četiri znamenke', () => {
    expect(formatSku(1)).toBe('ART-0001')
    expect(formatSku(2727)).toBe('ART-2727')
    expect(formatSku(12345)).toBe('ART-12345')
  })

  it('čita broj iz šifre', () => {
    expect(skuNumber('ART-0042')).toBe(42)
    expect(skuNumber('art-7')).toBe(7)
    expect(skuNumber('000104')).toBeNull()
    expect(skuNumber('ARH-15')).toBeNull()
  })

  it('prvi artikal dobije ART-0001', () => {
    expect(nextInternalSku([])).toBe('ART-0001')
  })

  it('popunjava rupu nakon brisanja', () => {
    expect(nextInternalSku(['ART-0001', 'ART-0002', 'ART-0004'])).toBe('ART-0003')
    expect(nextInternalSku(['ART-0002', 'ART-0003'])).toBe('ART-0001')
  })

  it('bez rupe ide na sljedeći broj, ostale šifre ne smetaju', () => {
    expect(nextInternalSku(['ART-0001', 'ART-0002', '000104', archivedSku(3)])).toBe('ART-0003')
  })
})
