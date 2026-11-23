/**
 * Šifriranje trezora pristupnih podataka (AES-256-GCM).
 * Ključ se izvodi iz lozinke trezora (scrypt) i nikad se ne sprema — bez lozinke trezora
 * ni kopija baze ni server ne mogu pročitati lozinke.
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

/** Poznati tekst kojim se provjerava je li lozinka trezora tačna. */
export const CHECK_TEXT = 'ARDOR-trezor-v1'
export const MIN_MASTER = 10

export function newSalt() {
  return randomBytes(16).toString('base64')
}

export function deriveKey(master: string, salt: string): Buffer {
  return scryptSync(master.normalize('NFC'), Buffer.from(salt, 'base64'), 32, { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
}

/** Vraća „v1:iv:tag:sadržaj” (base64). Prazan tekst ostaje prazan. */
export function encrypt(key: Buffer, plain: string): string {
  if (!plain) return ''
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', key, iv)
  const data = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), data.toString('base64')].join(':')
}

export function decrypt(key: Buffer, packed: string): string {
  if (!packed) return ''
  const [v, iv, tag, data] = packed.split(':')
  if (v !== 'v1' || !iv || !tag || data === undefined) throw new Error('Neispravan šifrirani zapis.')
  const d = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'))
  d.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8')
}

/** Tačna lozinka trezora = provjerni zapis se dešifrira u CHECK_TEXT. */
export function checkKey(key: Buffer, check: string) {
  try {
    return decrypt(key, check) === CHECK_TEXT
  } catch {
    return false
  }
}

export function masterProblem(master: string) {
  if (master.length < MIN_MASTER) return `Lozinka trezora mora imati najmanje ${MIN_MASTER} znakova.`
  return null
}
