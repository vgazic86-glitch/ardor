import { describe, expect, it } from 'vitest'
import { CHECK_TEXT, checkKey, decrypt, deriveKey, encrypt, masterProblem, newSalt } from './vaultCrypto'

describe('trezor: šifriranje', () => {
  const salt = newSalt()
  const key = deriveKey('tajna-lozinka-trezora', salt)

  it('šifrira i dešifrira (i naša slova)', () => {
    const packed = encrypt(key, 'Lozinka č ć ž š đ 123!')
    expect(packed).not.toContain('Lozinka')
    expect(decrypt(key, packed)).toBe('Lozinka č ć ž š đ 123!')
  })

  it('isti tekst daje različit zapis (slučajni iv)', () => {
    expect(encrypt(key, 'abc')).not.toBe(encrypt(key, 'abc'))
  })

  it('pogrešna lozinka trezora ne otvara zapis', () => {
    const check = encrypt(key, CHECK_TEXT)
    expect(checkKey(key, check)).toBe(true)
    expect(checkKey(deriveKey('druga-lozinka-xx', salt), check)).toBe(false)
    expect(() => decrypt(deriveKey('druga-lozinka-xx', salt), encrypt(key, 'x'))).toThrow()
  })

  it('izmijenjen zapis se odbija', () => {
    const p = encrypt(key, 'tajna').split(':')
    p[3] = Buffer.from('drugo').toString('base64')
    expect(() => decrypt(key, p.join(':'))).toThrow()
  })

  it('prazno ostaje prazno; prekratka lozinka trezora', () => {
    expect(encrypt(key, '')).toBe('')
    expect(decrypt(key, '')).toBe('')
    expect(masterProblem('kratka')).toBeTruthy()
    expect(masterProblem('dovoljno-duga')).toBeNull()
  })
})
