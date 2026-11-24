import { describe, expect, it } from 'vitest'
import { allowedOrigin, cleanWebSettings, guessRoom, makeLimiter, parseSwatches, slugify, validateInquiry, webAvailability } from './web'

describe('web: slug i prostorija', () => {
  it('pravi adresu bez dijakritike', () => {
    expect(slugify('Isabel Lux — garnitura')).toBe('isabel-lux-garnitura')
    expect(slugify('Dječja soba Đurđa Šarić')).toBe('djecja-soba-djurdja-saric')
    expect(slugify('***')).toBe('artikal')
  })
  it('pogađa prostoriju iz kategorije', () => {
    expect(guessRoom('Kuhinje')).toBe('kuhinja')
    expect(guessRoom('Spavaće sobe')).toBe('spavaca-soba')
    expect(guessRoom('Blagovaonice')).toBe('trpezarija')
    expect(guessRoom('Uredski namještaj')).toBe('ured')
    expect(guessRoom('Sjedeće garniture')).toBe('dnevni-boravak')
  })
})

describe('web: postavke artikla', () => {
  it('stara cijena samo ako je veća od trenutne', () => {
    expect(cleanWebSettings({ oldPrice: 900 }, 'X', 1000).oldPrice).toBeNull()
    expect(cleanWebSettings({ oldPrice: 1200 }, 'X', 1000).oldPrice).toBe(1200)
  })
  it('nepoznate vrijednosti padaju na zadane', () => {
    const s = cleanWebSettings({ room: 'garaza', style: 'x', swatches: '#fff, crvena, #A1B2C3' }, 'Grande', 10)
    expect(s.room).toBe('dnevni-boravak')
    expect(s.style).toBe('moderni')
    expect(s.slug).toBe('grande')
    expect(s.swatches).toBe('#fff, #A1B2C3')
  })
  it('boje: samo hex, najviše 6', () => {
    expect(parseSwatches('#111 #222 #333 #444 #555 #666 #777')).toHaveLength(6)
  })
  it('dostupnost iz slobodne zalihe', () => {
    expect(webAvailability(3, 1)).toBe('stanje')
    expect(webAvailability(2, 2)).toBe('narudzba')
    expect(webAvailability(0, 0)).toBe('narudzba')
  })
})

describe('web: upit', () => {
  const base = { ime: 'Ana Anić', telefon: '065 111 222', pristanak: 'on' }
  it('ponuda prolazi s imenom, telefonom i pristankom', () => {
    const r = validateInquiry({ ...base, vrsta: 'ponuda', poruka: 'kuhinja' }, '2026-11-19')
    expect('ok' in r && r.ok.kind).toBe('ponuda')
    expect('ok' in r && r.ok.date).toBeNull()
  })
  it('odbija bez pristanka, s lošim telefonom ili e-mailom', () => {
    expect(validateInquiry({ ...base, pristanak: '' }, '2026-11-19')).toHaveProperty('error')
    expect(validateInquiry({ ...base, telefon: '12' }, '2026-11-19')).toHaveProperty('error')
    expect(validateInquiry({ ...base, email: 'nije-mail' }, '2026-11-19')).toHaveProperty('error')
  })
  it('honeypot polje = spam', () => {
    expect(validateInquiry({ ...base, website: 'http://x' }, '2026-11-19')).toEqual({ error: 'spam' })
  })
  it('posjet: najranije sutra, ne nedjeljom, s terminom', () => {
    expect(validateInquiry({ ...base, vrsta: 'posjet', datum: '2026-11-19', termin: '10:30' }, '2026-11-19')).toHaveProperty('error')
    expect(validateInquiry({ ...base, vrsta: 'posjet', datum: '2026-11-22', termin: '10:30' }, '2026-11-19')).toHaveProperty('error') // nedjelja
    expect(validateInquiry({ ...base, vrsta: 'posjet', datum: '2026-11-21' }, '2026-11-19')).toHaveProperty('error')
    const ok = validateInquiry({ ...base, vrsta: 'posjet', datum: '2026-11-21', termin: '10:30' }, '2026-11-19')
    expect('ok' in ok && ok.ok.slot).toBe('10:30')
  })
  it('mjerenje traži adresu', () => {
    expect(validateInquiry({ ...base, vrsta: 'mjerenje', datum: '2026-11-20', termin: '09:00' }, '2026-11-19')).toHaveProperty('error')
    expect(validateInquiry({ ...base, vrsta: 'mjerenje', datum: '2026-11-20', termin: '09:00', adresa: 'Kralja Petra 1' }, '2026-11-19')).toHaveProperty('ok')
  })
})

describe('web: CORS i ograničenje', () => {
  it('dopušta samo našu domenu i localhost', () => {
    expect(allowedOrigin('https://www.ardornamjestaj.com')).toBe('https://www.ardornamjestaj.com')
    expect(allowedOrigin('http://localhost:4321')).toBe('http://localhost:4321')
    expect(allowedOrigin('https://zlo.example')).toBeNull()
    expect(allowedOrigin('https://ardor-web.pages.dev', 'https://ardor-web.pages.dev')).toBe('https://ardor-web.pages.dev')
  })
  it('limiter pušta max zahtjeva u prozoru', () => {
    const lim = makeLimiter(2, 1000)
    expect(lim('a', 0)).toBe(true)
    expect(lim('a', 10)).toBe(true)
    expect(lim('a', 20)).toBe(false)
    expect(lim('a', 1500)).toBe(true)
  })
})

describe('web: artikli za web (vlastiti popis)', () => {
  it('čita cijenu u domaćem zapisu', async () => {
    const { parsePrice } = await import('./web')
    expect(parsePrice('1.290,50')).toBe(1290.5)
    expect(parsePrice('1290')).toBe(1290)
    expect(parsePrice('2 490 KM')).toBe(2490)
    expect(parsePrice('abc')).toBe(0)
    expect(parsePrice(-5)).toBe(0)
  })
  it('traži naziv, cijenu i fotografiju za vidljiv artikal', async () => {
    const { cleanWebItem } = await import('./web')
    expect(cleanWebItem({ name: '', price: 100, imageIds: ['1'] })).toEqual({ error: 'Upiši naziv artikla.' })
    expect('error' in cleanWebItem({ name: 'Grande', price: '', imageIds: ['1'] })).toBe(true)
    expect('error' in cleanWebItem({ name: 'Grande', price: 100 })).toBe(true)
    expect('ok' in cleanWebItem({ name: 'Grande', price: 100, visible: false })).toBe(true)
    expect('error' in cleanWebItem({ name: 'Grande', price: 1000, oldPrice: 900, imageIds: ['1'] })).toBe(true)
  })
  it('čisti fotografije i dostupnost', async () => {
    const { cleanWebItem } = await import('./web')
    const r = cleanWebItem({ name: 'Grande garnitura', price: '2.490', oldPrice: '2990', avail: 'xx', imageIds: ['5', '5', 'x', '7'] })
    if (!('ok' in r)) throw new Error(r.error)
    expect(r.ok.imageIds).toBe('5,7')
    expect(r.ok.avail).toBe('stanje')
    expect(r.ok.oldPrice).toBe(2990)
    expect(r.ok.slug).toBe('grande-garnitura')
  })
})
