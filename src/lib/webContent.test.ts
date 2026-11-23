import { describe, expect, it } from 'vitest'
import { articleHtml, articleSlug, barActive, canEditArticle, canEditGroup, canSetStatus, cleanArticle, cleanField, mergeTexts, phoneDigits, readingMinutes, WEB_FIELDS } from './webContent'

describe('web tekstovi', () => {
  it('zadani tekstovi i izmjene', () => {
    const m = mergeTexts({ 'naslovna.oznaka': 'Novo', 'naslovna.podnaslov': '', 'traka.tekst': '' })
    expect(m['naslovna.oznaka']).toBe('Novo')
    expect(m['naslovna.podnaslov']).toMatch(/^Kreiraj/) // prazno = zadano
    expect(m['traka.tekst']).toBe('') // traka smije biti prazna
    expect(Object.keys(m)).toHaveLength(WEB_FIELDS.length)
  })
  it('provjera polja', () => {
    expect(cleanField('naslovna.naslov', 'a\nb\nc\nd')).toHaveProperty('error')
    expect(cleanField('naslovna.oznaka', '  Salon   ARDOR ')).toEqual({ ok: 'Salon ARDOR' })
    expect(cleanField('naslovna.oznaka', 'x'.repeat(61))).toHaveProperty('error')
    expect(cleanField('traka.link', 'javascript:alert(1)')).toHaveProperty('error')
    expect(cleanField('traka.link', '/akcije/')).toEqual({ ok: '/akcije/' })
    expect(cleanField('kontakt.telefon', '12')).toHaveProperty('error')
    expect(cleanField('kontakt.radni', '8-20')).toHaveProperty('error')
    expect(cleanField('kontakt.radni', '08:00 – 16:00')).toEqual({ ok: '08:00 – 16:00' })
    expect(cleanField('kontakt.subota', 'zatvoreno')).toEqual({ ok: 'zatvoreno' })
    expect(cleanField('onama.tekst', 'Pozdrav <script>')).toHaveProperty('error')
    expect(cleanField('nepostoji', 'x')).toHaveProperty('error')
  })
  it('telefon u međunarodnom obliku', () => {
    expect(phoneDigits('051 433 750')).toBe('38751433750')
    expect(phoneDigits('+387 65 436 420')).toBe('38765436420')
    expect(phoneDigits('00387 65 436 420')).toBe('38765436420')
  })
  it('traka do datuma', () => {
    expect(barActive({ 'traka.tekst': 'Akcija', 'traka.do': '2026-11-30' }, '2026-11-30')).toBe(true)
    expect(barActive({ 'traka.tekst': 'Akcija', 'traka.do': '2026-11-30' }, '2026-12-01')).toBe(false)
    expect(barActive({ 'traka.tekst': '', 'traka.do': '' }, '2026-12-01')).toBe(false)
  })
  it('uloge', () => {
    expect(canEditGroup('trgovac', 'naslovna')).toBe(true)
    expect(canEditGroup('trgovac', 'kontakt')).toBe(false)
    expect(canEditGroup('voditelj', 'kontakt')).toBe(true)
    expect(canEditGroup('dostava', 'traka')).toBe(false)
  })
})

describe('članci', () => {
  const body = Array.from({ length: 130 }, (_, i) => `riječ${i}`).join(' ')
  it('provjera za objavu', () => {
    expect(cleanArticle({ title: 'Kako' }, false)).toHaveProperty('error')
    expect(cleanArticle({ title: 'Kako odabrati madrac' }, false)).toHaveProperty('ok')
    expect(cleanArticle({ title: 'Kako odabrati madrac', summary: 'kratko' }, true)).toHaveProperty('error')
    const ok = cleanArticle({ title: 'Kako odabrati madrac', summary: 'Tvrd ili mekan, opruge ili pjena — vodič kroz odabir madraca za miran san.', theme: 'Savjeti', body }, true)
    expect(ok).toHaveProperty('ok')
    expect(cleanArticle({ title: 'Kako odabrati madrac', summary: 'x'.repeat(50), theme: 'Savjeti', body: 'prekratko' }, true)).toHaveProperty('error')
  })
  it('adresa i čitanje', () => {
    expect(articleSlug('Koja boja kuhinje? 7 ideja za mali prostor')).toBe('koja-boja-kuhinje-7-ideja-za-mali-prostor')
    expect(readingMinutes(body)).toBe(1)
    expect(readingMinutes(`${body} `.repeat(8))).toBe(5)
  })
  it('statusi po ulogama', () => {
    expect(canSetStatus('trgovac', 'nacrt', 'ceka')).toBe(true)
    expect(canSetStatus('trgovac', 'ceka', 'objavljen')).toBe(false)
    expect(canSetStatus('trgovac', 'objavljen', 'nacrt')).toBe(false)
    expect(canSetStatus('voditelj', 'ceka', 'objavljen')).toBe(true)
    expect(canEditArticle('trgovac', 'objavljen')).toBe(false)
    expect(canEditArticle('uprava', 'objavljen')).toBe(true)
  })
  it('prikaz teksta', () => {
    const h = articleHtml('Uvod **važno** <b>x</b>\nnastavak\n\n## Podnaslov\n- jedan\n- dva\n\n1. prvi\n2. drugi\n\n[Kontakt](/kontakt/) i [zlo](javascript:x)')
    expect(h).toContain('<p>Uvod <strong>važno</strong> &lt;b&gt;x&lt;/b&gt;<br>nastavak</p>')
    expect(h).toContain('<h2>Podnaslov</h2>\n<ul>\n<li>jedan</li>\n<li>dva</li>\n</ul>')
    expect(h).toContain('<ol>\n<li>prvi</li>')
    expect(h).toContain('<a href="/kontakt/">Kontakt</a>')
    expect(h).not.toContain('javascript:x)"')
    expect(h).not.toContain('href="javascript')
  })
})
