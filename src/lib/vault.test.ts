import { describe, expect, it } from 'vitest'
import { safeUrl } from './vault'

describe('trezor: siguran link', () => {
  it('dopušta samo http(s)', () => {
    expect(safeUrl('mail.ardornamjestaj.com')).toBe('https://mail.ardornamjestaj.com')
    expect(safeUrl('http://x.ba')).toBe('http://x.ba')
    expect(safeUrl('javascript:alert(1)')).toBe('https://javascript:alert(1)')
    expect(safeUrl('ftp://x.ba')).toBeNull()
    expect(safeUrl('  ')).toBeNull()
  })
})
