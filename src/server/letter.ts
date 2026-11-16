/** Slobodniji PDF na memorandumu: više tablica, okviri, kućice za kvačice, potpisi, nove stranice po osobi/kupcu. */
import fontkit from '@pdf-lib/fontkit'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib'
import { BRAND, MARK, TAGLINE, WORDMARK } from '../lib/brand'
import type { CompanyInfo } from '../lib/types'

const hex = (h: string): RGB => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255)
export const C = {
  red: hex(BRAND.red),
  orange: hex(BRAND.orange),
  gray: hex(BRAND.gray),
  ink: hex('#2B2522'),
  muted: hex('#7A7270'),
  line: hex('#E4DDD6'),
  tint: hex('#FBF6F2'),
  warm: hex('#FEF3EC'),
  warmLine: hex('#F9C9AE'),
  green: hex('#2F6B45'),
  white: rgb(1, 1, 1),
}

function fontBytes(name: string) {
  const path = [join(process.cwd(), 'public', 'brand', 'fonts', name), join(process.cwd(), 'dist', 'client', 'brand', 'fonts', name)].find((p) =>
    existsSync(p),
  )
  if (!path) throw new Error(`Nedostaje font ${name}.`)
  return readFileSync(path)
}

const safe = (s: string) => s.replace(/[^ -ſ–—‘’“”„•…€\n]/g, '')

export interface Col {
  key: string
  label: string
  /** 0 = ostatak širine */
  w: number
  align?: 'l' | 'r' | 'c'
  /** Prikaži praznu kućicu za kvačicu umjesto teksta. */
  check?: boolean
  bold?: boolean
}
export type Cell = string | string[]

export class Letter {
  private constructor(
    private pdf: PDFDocument,
    private company: CompanyInfo,
    readonly R: PDFFont,
    readonly M: PDFFont,
    readonly B: PDFFont,
    private docTitle: string,
  ) {}
  readonly W = 595.28
  readonly H = 841.89
  readonly ML = 44
  readonly MR = 44
  readonly FOOT = 64
  get CW() {
    return this.W - this.ML - this.MR
  }
  page!: PDFPage
  y = 0
  private pages: PDFPage[] = []
  private contTitle = ''

  static async create(company: CompanyInfo, docTitle: string) {
    const pdf = await PDFDocument.create()
    pdf.registerFontkit(fontkit)
    const R = await pdf.embedFont(fontBytes('Ubuntu-R.ttf'), { subset: true })
    const M = await pdf.embedFont(fontBytes('Ubuntu-M.ttf'), { subset: true })
    const B = await pdf.embedFont(fontBytes('Ubuntu-B.ttf'), { subset: true })
    pdf.setTitle(docTitle)
    pdf.setAuthor(company.name)
    pdf.setCreator('ARDOR aplikacija')
    pdf.setLanguage('bs')
    return new Letter(pdf, company, R, M, B, docTitle)
  }

  /* ── osnovno crtanje ── */
  text(s: string, x: number, y: number, size: number, font = this.R, color = C.ink) {
    this.page.drawText(safe(s), { x, y, size, font, color })
  }
  right(s: string, xr: number, y: number, size: number, font = this.R, color = C.ink) {
    this.text(s, xr - font.widthOfTextAtSize(safe(s), size), y, size, font, color)
  }
  center(s: string, xc: number, y: number, size: number, font = this.R, color = C.ink) {
    this.text(s, xc - font.widthOfTextAtSize(safe(s), size) / 2, y, size, font, color)
  }
  width(s: string, size: number, font = this.R) {
    return font.widthOfTextAtSize(safe(s), size)
  }
  wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const out: string[] = []
    for (const para of safe(text).split(/\r?\n/)) {
      let line = ''
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word
        if (font.widthOfTextAtSize(next, size) <= width) line = next
        else {
          if (line) out.push(line)
          let w = word
          while (font.widthOfTextAtSize(w, size) > width && w.length > 1) {
            let k = w.length
            while (k > 1 && font.widthOfTextAtSize(w.slice(0, k), size) > width) k--
            out.push(w.slice(0, k))
            w = w.slice(k)
          }
          line = w
        }
      }
      out.push(line)
    }
    return out
  }
  box(x: number, y: number, size = 9, color = C.gray) {
    this.page.drawRectangle({ x, y, width: size, height: size, borderColor: color, borderWidth: 0.9, color: C.white })
  }

  /* ── stranice ── */
  private logo(x: number, top: number, height: number) {
    const s = height / 59
    const ox = x - 484 * s
    const oy = top + 78 * s
    this.page.drawSvgPath(MARK.red, { x: ox, y: oy, scale: s, color: C.red })
    this.page.drawSvgPath(MARK.gray, { x: ox, y: oy, scale: s, color: C.gray })
    this.page.drawSvgPath(MARK.orange, { x: ox, y: oy, scale: s, color: C.orange })
    for (const d of [...WORDMARK, ...TAGLINE]) this.page.drawSvgPath(d, { x: ox, y: oy, scale: s, color: C.gray })
  }

  /** Nova stranica s memorandumom. Ako je zadan naslov, ispisuje ga velikim slovima s brojem/datumom desno. */
  newPage(opts: { title?: string; number?: string; meta?: string[]; continued?: string } = {}) {
    const { W, H, ML, MR, CW, company } = this
    this.page = this.pdf.addPage([W, H])
    this.pages.push(this.page)
    const big = !!opts.title
    this.logo(ML, H - 38, big ? 42 : 32)
    const info = [
      company.legalName || company.name,
      [company.address, company.city].filter(Boolean).join(', '),
      [company.phone && `Tel: ${company.phone}`, company.email].filter(Boolean).join('  ·  '),
      company.web,
    ].filter(Boolean)
    let iy = H - 44
    info.forEach((l, i) => {
      this.right(l, W - MR, iy, i === 0 ? 9 : 8, i === 0 ? this.B : this.R, i === 0 ? C.ink : C.muted)
      iy -= 11
    })
    const lineY = H - (big ? 100 : 88)
    this.page.drawRectangle({ x: ML, y: lineY, width: CW * 0.62, height: 2, color: C.red })
    this.page.drawRectangle({ x: ML + CW * 0.62, y: lineY, width: CW * 0.24, height: 2, color: C.orange })
    this.page.drawRectangle({ x: ML + CW * 0.86, y: lineY, width: CW * 0.14, height: 2, color: C.gray })
    this.y = lineY - 22
    if (opts.title) {
      this.contTitle = opts.continued ?? `${opts.title} (nastavak)`
      this.text(opts.title, ML, this.y - 6, 20, this.B)
      if (opts.number) this.right(opts.number, W - MR, this.y - 6, 14, this.B, C.red)
      this.y -= 22
      if (opts.meta?.length) {
        this.text(opts.meta.filter(Boolean).join('     '), ML, this.y, 9, this.R, C.muted)
        this.y -= 18
      } else this.y -= 4
    } else if (this.contTitle) {
      this.text(this.contTitle, ML, this.y, 9.5, this.M, C.muted)
      this.y -= 20
    }
  }

  /** Osigurava prostor; inače nova stranica (nastavak). Vraća true ako je otvorena nova stranica. */
  ensure(h: number) {
    if (this.y - h < this.FOOT + 8) {
      this.newPage()
      return true
    }
    return false
  }
  space(h: number) {
    this.y -= h
  }

  heading(title: string, sub?: string) {
    this.ensure(40)
    this.y -= 6
    this.page.drawRectangle({ x: this.ML, y: this.y - 12, width: 3, height: 14, color: C.red })
    this.text(title, this.ML + 9, this.y - 10, 11.5, this.B)
    if (sub) this.right(sub, this.W - this.MR, this.y - 10, 8.5, this.R, C.muted)
    this.y -= 22
  }

  paragraph(s: string, size = 9, color = C.ink, font = this.R) {
    for (const l of this.wrap(s, font, size, this.CW)) {
      this.ensure(size + 4)
      this.text(l, this.ML, this.y, size, font, color)
      this.y -= size + 3.5
    }
  }

  /** Red pločica s brojkama (npr. ukupno, gotovina, kartica…). Prva je naglašena. */
  tiles(items: { label: string; value: string; hint?: string }[]) {
    const gap = 8
    const h = 52
    this.ensure(h + 8)
    const w = (this.CW - gap * (items.length - 1)) / items.length
    items.forEach((it, i) => {
      const x = this.ML + i * (w + gap)
      const accent = i === 0
      this.page.drawRectangle({ x, y: this.y - h, width: w, height: h, color: accent ? hex('#2E241F') : C.tint, borderColor: accent ? hex('#2E241F') : C.line, borderWidth: 0.6 })
      this.text(it.label.toUpperCase(), x + 9, this.y - 14, 6.8, this.B, accent ? hex('#E8C9A8') : C.muted)
      const vs = it.value.length > 12 ? 11 : 13.5
      this.text(it.value, x + 9, this.y - 32, vs, this.B, accent ? C.white : C.ink)
      if (it.hint) this.text(it.hint, x + 9, this.y - 44, 7, this.R, accent ? hex('#CDB8A6') : C.muted)
    })
    this.y -= h + 12
  }

  /** Dva (ili više) okvira jedan pored drugog. */
  boxes(items: { title: string; lines: string[] }[], h = 66) {
    this.ensure(h + 10)
    const gap = 12
    const w = (this.CW - gap * (items.length - 1)) / items.length
    items.forEach((b, i) => {
      const x = this.ML + i * (w + gap)
      this.page.drawRectangle({ x, y: this.y - h, width: w, height: h, color: C.tint, borderColor: C.line, borderWidth: 0.6 })
      this.page.drawRectangle({ x, y: this.y - h, width: 3, height: h, color: i === 0 ? C.red : i === 1 ? C.orange : C.gray })
      this.text(b.title, x + 12, this.y - 14, 7, this.B, C.muted)
      let ly = this.y - 29
      b.lines.filter(Boolean).forEach((l, j) => {
        for (const part of this.wrap(l, j === 0 ? this.B : this.R, j === 0 ? 10.5 : 8.5, w - 22).slice(0, 2)) {
          if (ly < this.y - h + 6) return
          this.text(part, x + 12, ly, j === 0 ? 10.5 : 8.5, j === 0 ? this.B : this.R)
          ly -= j === 0 ? 13 : 11
        }
      })
    })
    this.y -= h + 12
  }

  /** Tablica s ponavljanjem zaglavlja na novoj stranici. Ćelija može biti niz redova (prvi podebljan). */
  table(cols: Col[], rows: Record<string, Cell>[], opts: { size?: number; footer?: Record<string, string>; minRow?: number } = {}) {
    const size = opts.size ?? 8.8
    const cs = cols.map((c) => ({ ...c }))
    const fixed = cs.reduce((s, c) => s + c.w, 0)
    const flex = cs.find((c) => c.w === 0)
    if (flex) flex.w = this.CW - fixed
    const xs: number[] = []
    cs.reduce((x, c) => (xs.push(x), x + c.w), this.ML)
    const head = () => {
      this.ensure(40)
      this.page.drawRectangle({ x: this.ML, y: this.y - 18, width: this.CW, height: 18, color: C.gray })
      cs.forEach((c, i) => {
        const yy = this.y - 12.5
        if (c.align === 'r') this.right(c.label, xs[i] + c.w - 5, yy, 7.4, this.B, C.white)
        else if (c.align === 'c' || c.check) this.center(c.label, xs[i] + c.w / 2, yy, 7.4, this.B, C.white)
        else this.text(c.label, xs[i] + 5, yy, 7.4, this.B, C.white)
      })
      this.y -= 18
    }
    head()
    rows.forEach((row, idx) => {
      const lines = cs.map((c) => {
        const v = row[c.key]
        if (c.check) return [] as string[]
        const parts = Array.isArray(v) ? v : [v ?? '']
        return parts.flatMap((p, j) => this.wrap(p, j === 0 && (c.bold || Array.isArray(v)) ? this.M : this.R, j === 0 ? size : size - 1, c.w - 10).map((t) => ({ t, j })))
      }) as unknown as { t: string; j: number }[][]
      const rowH = Math.max(opts.minRow ?? 0, ...lines.map((ls) => ls.reduce((s, l) => s + (l.j === 0 ? size + 3 : size + 2), 0))) + 9
      if (this.y - rowH < this.FOOT + 8) {
        this.newPage()
        head()
      }
      if (idx % 2 === 1) this.page.drawRectangle({ x: this.ML, y: this.y - rowH, width: this.CW, height: rowH, color: C.tint })
      cs.forEach((c, i) => {
        const x = xs[i]
        if (c.check) {
          this.box(x + c.w / 2 - 5, this.y - 15)
          return
        }
        let ly = this.y - 12
        for (const { t, j } of lines[i]) {
          const font = j === 0 && (c.bold || Array.isArray(row[c.key])) ? this.M : this.R
          const sz = j === 0 ? size : size - 1
          const color = j === 0 ? C.ink : C.muted
          if (c.align === 'r') this.right(t, x + c.w - 5, ly, sz, font, color)
          else if (c.align === 'c') this.center(t, x + c.w / 2, ly, sz, font, color)
          else this.text(t, x + 5, ly, sz, font, color)
          ly -= j === 0 ? size + 3 : size + 2
        }
      })
      this.y -= rowH
      this.page.drawLine({ start: { x: this.ML, y: this.y }, end: { x: this.ML + this.CW, y: this.y }, thickness: 0.5, color: C.line })
    })
    if (opts.footer) {
      this.ensure(20)
      this.page.drawRectangle({ x: this.ML, y: this.y - 18, width: this.CW, height: 18, color: hex('#EFE7DD') })
      cs.forEach((c, i) => {
        const v = opts.footer![c.key]
        if (!v) return
        if (c.align === 'r') this.right(v, xs[i] + c.w - 5, this.y - 12.5, 8.8, this.B)
        else this.text(v, xs[i] + 5, this.y - 12.5, 8.8, this.B)
      })
      this.y -= 18
    }
    this.y -= 10
  }

  /** Niz kućica s opisom (kontrolna lista). */
  checklist(items: string[], cols = 2) {
    const w = this.CW / cols
    for (let i = 0; i < items.length; i += cols) {
      this.ensure(16)
      items.slice(i, i + cols).forEach((t, j) => {
        const x = this.ML + j * w
        this.box(x, this.y - 9)
        this.text(t, x + 15, this.y - 7.5, 9)
      })
      this.y -= 17
    }
    this.y -= 4
  }

  /** Crta za upis rukom s oznakom (npr. „Vrijeme preuzimanja”). */
  fillLines(labels: string[], cols = 2) {
    const gap = 18
    const w = (this.CW - gap * (cols - 1)) / cols
    for (let i = 0; i < labels.length; i += cols) {
      this.ensure(28)
      labels.slice(i, i + cols).forEach((t, j) => {
        const x = this.ML + j * (w + gap)
        this.text(t, x, this.y - 8, 8, this.R, C.muted)
        this.page.drawLine({ start: { x, y: this.y - 22 }, end: { x: x + w, y: this.y - 22 }, thickness: 0.6, color: C.gray })
      })
      this.y -= 36
    }
  }

  /** Okvir s napomenom. */
  note(title: string, body: string) {
    const lines = this.wrap(body, this.R, 9, this.CW - 24)
    const h = lines.length * 12.5 + 26
    this.ensure(h + 8)
    this.page.drawRectangle({ x: this.ML, y: this.y - h, width: this.CW, height: h, color: C.warm, borderColor: C.warmLine, borderWidth: 0.6 })
    this.text(title, this.ML + 12, this.y - 14, 7, this.B, C.red)
    lines.forEach((l, i) => this.text(l, this.ML + 12, this.y - 28 - i * 12.5, 9))
    this.y -= h + 10
  }

  /** Potpisna polja u jednom redu. */
  signatures(labels: string[]) {
    this.ensure(56)
    this.y -= 30
    const gap = 26
    const w = (this.CW - gap * (labels.length - 1)) / labels.length
    labels.forEach((l, i) => {
      const x = this.ML + i * (w + gap)
      this.page.drawLine({ start: { x, y: this.y }, end: { x: x + w, y: this.y }, thickness: 0.7, color: C.gray })
      this.text(l, x, this.y - 11, 8, this.R, C.muted)
    })
    this.y -= 24
  }

  async save() {
    const { W, ML, MR, company } = this
    const n = this.pages.length
    this.pages.forEach((p, i) => {
      const fy = 30
      p.drawRectangle({ x: 0, y: 0, width: W * 0.62, height: 5, color: C.red })
      p.drawRectangle({ x: W * 0.62, y: 0, width: W * 0.24, height: 5, color: C.orange })
      p.drawRectangle({ x: W * 0.86, y: 0, width: W * 0.14, height: 5, color: C.gray })
      const legal = [company.legalName || company.name, `${company.address}, ${company.city}`, company.jib && `JIB: ${company.jib}`, company.vatNumber && `PDV: ${company.vatNumber}`]
        .filter(Boolean)
        .join('  ·  ')
      p.drawLine({ start: { x: ML, y: fy + 18 }, end: { x: W - MR, y: fy + 18 }, thickness: 0.5, color: C.line })
      p.drawText(safe(legal), { x: ML, y: fy + 5, size: 7, font: this.R, color: C.muted })
      const pg = `${this.docTitle} · stranica ${i + 1} / ${n}`
      p.drawText(safe(pg), { x: W - MR - this.R.widthOfTextAtSize(safe(pg), 7), y: fy + 5, size: 7, font: this.R, color: C.muted })
    })
    return this.pdf.save()
  }
}
