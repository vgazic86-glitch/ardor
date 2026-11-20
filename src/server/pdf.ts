/** PDF dokumenti na službenom memorandumu ARDOR namještaja (narudžbe dobavljačima, ponude, predračuni, otpremnice). */
import fontkit from '@pdf-lib/fontkit'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib'
import { BRAND, MARK, TAGLINE, WORDMARK } from '../lib/brand'
import type { CompanyInfo, PurchaseOrder } from '../lib/types'

const hex = (h: string): RGB => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255)
const RED = hex(BRAND.red)
const ORANGE = hex(BRAND.orange)
const GRAY = hex(BRAND.gray)
const INK = hex('#2B2522')
const MUTED = hex('#7A7270')
const LINE = hex('#E4DDD6')
const TINT = hex('#FBF6F2')

function fontBytes(name: string) {
  const path = [join(process.cwd(), 'public', 'brand', 'fonts', name), join(process.cwd(), 'dist', 'client', 'brand', 'fonts', name)].find((p) =>
    existsSync(p),
  )
  if (!path) throw new Error(`Nedostaje font ${name}.`)
  return readFileSync(path)
}

export const num = (v: number, dec = 2) => {
  const [i, d] = Math.abs(v).toFixed(dec).split('.')
  return `${v < 0 ? '-' : ''}${i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${dec ? `,${d}` : ''}`
}
export const dateBa = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}.`
}

/** Prelamanje teksta na zadanu širinu. */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = []
  for (const para of text.split(/\r?\n/)) {
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

/** Zamijeni znakove kojih nema u fontu (sigurnosno). */
const safe = (s: string) => s.replace(/[^ -ſ–—‘’“”„•…€\n]/g, '')

export interface DocColumn {
  key: string
  label: string
  /** 0 = ostatak širine (naziv). */
  w: number
  align: 'l' | 'r'
}

export interface DocRow {
  cells: Record<string, string>
  /** Crvena napomena ispod naziva. */
  note?: string
  /** Siva pojašnjenja ispod naziva (npr. opis namještaja po mjeri). */
  detail?: string
  /** Slika ispod naziva (JPEG ili PNG), npr. prikaz kuhinje iz Palette CAD-a. */
  image?: { data: Uint8Array; mime: string }
}

export interface LetterDoc {
  company: CompanyInfo
  title: string
  number: string
  meta: string[]
  boxes: { title: string; lines: string[] }[]
  intro: string
  columns: DocColumn[]
  rows: DocRow[]
  summary?: string
  totals?: [string, number, boolean][]
  totalsNote?: string
  note?: string
  closing?: string
  signer: { label: string; name: string; contact: string; extra?: string }
  /** Potpisna polja desno (npr. „Za ARDOR namještaj”, „Robu preuzeo”). */
  signatures: string[]
  /** Visina okvira kupac/prodavac (zadano 74; više za duže adrese, npr. izvoz). */
  boxHeight?: number
}

/** Opći dokument na memorandumu: zaglavlje s logom, dva okvira, tablica stavki, zbir, napomena, potpisi, podnožje. */
export async function renderLetterDoc(doc: LetterDoc) {
  const { company } = doc
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const R = await pdf.embedFont(fontBytes('Ubuntu-R.ttf'), { subset: true })
  const M = await pdf.embedFont(fontBytes('Ubuntu-M.ttf'), { subset: true })
  const B = await pdf.embedFont(fontBytes('Ubuntu-B.ttf'), { subset: true })
  pdf.setTitle(`${doc.title} ${doc.number}`)
  pdf.setAuthor(company.name)
  pdf.setCreator('ARDOR aplikacija')
  pdf.setLanguage('bs')

  const W = 595.28
  const H = 841.89
  const ML = 48
  const MR = 48
  const CW = W - ML - MR
  const FOOT = 70
  const pages: PDFPage[] = []
  let page!: PDFPage
  let y = 0

  const text = (s: string, x: number, yy: number, size: number, font = R, color = INK) => page.drawText(safe(s), { x, y: yy, size, font, color })
  const right = (s: string, xr: number, yy: number, size: number, font = R, color = INK) =>
    text(s, xr - font.widthOfTextAtSize(safe(s), size), yy, size, font, color)

  function drawLogo(x: number, top: number, height: number) {
    const s = height / 59
    const ox = x - 484 * s
    const oy = top + 78 * s
    page.drawSvgPath(MARK.red, { x: ox, y: oy, scale: s, color: RED })
    page.drawSvgPath(MARK.gray, { x: ox, y: oy, scale: s, color: GRAY })
    page.drawSvgPath(MARK.orange, { x: ox, y: oy, scale: s, color: ORANGE })
    for (const d of [...WORDMARK, ...TAGLINE]) page.drawSvgPath(d, { x: ox, y: oy, scale: s, color: GRAY })
  }

  function header(first: boolean) {
    page = pdf.addPage([W, H])
    pages.push(page)
    drawLogo(ML, H - 40, first ? 46 : 36)
    const info = [
      company.legalName || company.name,
      company.address,
      company.city,
      [company.phone && `Tel: ${company.phone}`, company.email].filter(Boolean).join('  ·  '),
      company.web,
    ].filter(Boolean)
    let iy = H - 46
    info.forEach((l, i) => {
      right(l, W - MR, iy, i === 0 ? 9.5 : 8.5, i === 0 ? B : R, i === 0 ? INK : MUTED)
      iy -= 12
    })
    const lineY = H - 112
    page.drawRectangle({ x: ML, y: lineY, width: CW * 0.62, height: 2, color: RED })
    page.drawRectangle({ x: ML + CW * 0.62, y: lineY, width: CW * 0.24, height: 2, color: ORANGE })
    page.drawRectangle({ x: ML + CW * 0.86, y: lineY, width: CW * 0.14, height: 2, color: GRAY })
    y = lineY - 24
    if (!first) {
      text(`${doc.title.charAt(0)}${doc.title.slice(1).toLowerCase()} ${doc.number} (nastavak)`, ML, y, 10, M, MUTED)
      y -= 22
    }
  }

  function footer(p: PDFPage, i: number, n: number) {
    const fy = 34
    p.drawRectangle({ x: 0, y: 0, width: W * 0.62, height: 6, color: RED })
    p.drawRectangle({ x: W * 0.62, y: 0, width: W * 0.24, height: 6, color: ORANGE })
    p.drawRectangle({ x: W * 0.86, y: 0, width: W * 0.14, height: 6, color: GRAY })
    const legal = [
      company.legalName || company.name,
      `${company.address}, ${company.city}`,
      company.jib && `JIB: ${company.jib}`,
      company.vatNumber && `PDV broj: ${company.vatNumber}`,
    ]
      .filter(Boolean)
      .join('  ·  ')
    const bank = [company.bankAccount && `Žiro račun: ${company.bankAccount}`, company.bank, company.web].filter(Boolean).join('  ·  ')
    p.drawLine({ start: { x: ML, y: fy + 22 }, end: { x: W - MR, y: fy + 22 }, thickness: 0.5, color: LINE })
    p.drawText(safe(legal), { x: ML, y: fy + 8, size: 7.5, font: R, color: MUTED })
    if (bank) p.drawText(safe(bank), { x: ML, y: fy - 3, size: 7.5, font: R, color: MUTED })
    const pg = `Stranica ${i + 1} / ${n}`
    p.drawText(pg, { x: W - MR - R.widthOfTextAtSize(pg, 7.5), y: fy + 8, size: 7.5, font: R, color: MUTED })
  }

  const ensure = (space: number) => {
    if (y - space < FOOT + 10) header(false)
  }

  header(true)

  // naslov
  text(doc.title, ML, y - 4, 22, B, INK)
  right(doc.number, W - MR, y - 4, 16, B, RED)
  y -= 22
  text(doc.meta.filter(Boolean).join('     '), ML, y, 9.5, R, MUTED)
  y -= 22

  // okviri (npr. dobavljač / naručitelj, kupac / prodavač)
  const boxW = (CW - 14) / 2
  const boxH = doc.boxHeight ?? 74
  doc.boxes.slice(0, 2).forEach((box, i) => {
    const bx = ML + i * (boxW + 14)
    page.drawRectangle({ x: bx, y: y - boxH, width: boxW, height: boxH, color: TINT, borderColor: LINE, borderWidth: 0.6 })
    page.drawRectangle({ x: bx, y: y - boxH, width: 3, height: boxH, color: i === 0 ? RED : ORANGE })
    text(box.title, bx + 14, y - 16, 7.5, B, MUTED)
    let ly = y - 32
    box.lines.filter(Boolean).forEach((l, j) => {
      for (const part of wrap(l, j === 0 ? B : R, j === 0 ? 11 : 9, boxW - 26).slice(0, 2)) {
        if (ly < y - boxH + 6) return
        text(part, bx + 14, ly, j === 0 ? 11 : 9, j === 0 ? B : R, INK)
        ly -= j === 0 ? 14 : 12
      }
    })
  })
  y -= boxH + 22

  if (doc.intro) {
    text(doc.intro, ML, y, 9.5, R, INK)
    y -= 14
  }

  // tablica
  const cols = doc.columns.map((c) => ({ ...c }))
  const fixed = cols.reduce((s, c) => s + c.w, 0)
  const flex = cols.find((c) => c.w === 0)
  if (flex) flex.w = CW - fixed
  const xs: number[] = []
  cols.reduce((x, c) => (xs.push(x), x + c.w), ML)

  function tableHead() {
    page.drawRectangle({ x: ML, y: y - 20, width: CW, height: 20, color: GRAY })
    cols.forEach((c, i) => {
      if (c.align === 'r') right(c.label, xs[i] + c.w - 6, y - 13.5, 8, B, rgb(1, 1, 1))
      else text(c.label, xs[i] + 6, y - 13.5, 8, B, rgb(1, 1, 1))
    })
    y -= 20
  }
  tableHead()

  const images = await Promise.all(
    doc.rows.map(async (r) => {
      if (!r.image) return null
      try {
        return r.image.mime === 'image/png' ? await pdf.embedPng(r.image.data) : await pdf.embedJpg(r.image.data)
      } catch {
        return null
      }
    }),
  )
  doc.rows.forEach((row, idx) => {
    const nameCol = cols.find((c) => c.key === 'name')!
    const nameW = nameCol.w - 12
    const nameLines = wrap(row.cells.name ?? '', M, 9.5, nameW)
    const noteLines = row.note ? wrap(row.note, R, 8, nameW) : []
    const detailLines = row.detail ? wrap(row.detail, R, 8.5, nameW) : []
    const img = images[idx]
    const imgScale = img ? Math.min(220 / img.height, nameW / img.width, 1) : 0
    const imgH = img ? img.height * imgScale + 8 : 0
    const codeCol = cols.find((c) => c.key === 'code')
    const codeLines = codeCol ? wrap(row.cells.code || '—', R, 8.5, codeCol.w - 10) : []
    const rowH = Math.max(nameLines.length * 12 + detailLines.length * 11 + noteLines.length * 10.5 + imgH, codeLines.length * 11) + 12
    if (y - rowH < FOOT + 10) {
      header(false)
      tableHead()
    }
    if (idx % 2 === 1) page.drawRectangle({ x: ML, y: y - rowH, width: CW, height: rowH, color: TINT })
    const top = y - 15
    cols.forEach((c, i) => {
      const x = xs[i]
      if (c.key === 'name') {
        let ly = top
        nameLines.forEach((s) => {
          text(s, x + 6, ly, 9.5, M, INK)
          ly -= 12
        })
        detailLines.forEach((s) => {
          text(s, x + 6, ly + 1, 8.5, R, MUTED)
          ly -= 11
        })
        noteLines.forEach((s) => {
          text(s, x + 6, ly + 1, 8, R, RED)
          ly -= 10.5
        })
        if (img) {
          const w = img.width * imgScale
          const h = img.height * imgScale
          page.drawImage(img, { x: x + 6, y: ly - h + 6, width: w, height: h })
          page.drawRectangle({ x: x + 6, y: ly - h + 6, width: w, height: h, borderColor: LINE, borderWidth: 0.6 })
        }
      } else if (c.key === 'code') codeLines.forEach((s, j) => text(s, x + 6, top - j * 11, 8.5, R, MUTED))
      else {
        const v = row.cells[c.key] ?? ''
        const strong = c.key === 'qty' || c.key === 'sum'
        const font = c.key === 'qty' ? B : c.key === 'sum' ? M : R
        const size = c.key === 'qty' ? 10 : 9
        const color = c.key === 'rb' ? MUTED : INK
        if (c.align === 'r') right(v, x + c.w - 6, top, size, font, color)
        else text(v, x + 6, top, size, strong ? font : R, color)
      }
    })
    y -= rowH
    page.drawLine({ start: { x: ML, y }, end: { x: ML + CW, y }, thickness: 0.5, color: LINE })
  })

  // zbir
  y -= 6
  const totals = doc.totals ?? []
  ensure(totals.length ? 24 + totals.length * 15 : 24)
  if (doc.summary) text(doc.summary, ML, y - 12, 8.5, R, MUTED)
  if (totals.length) {
    totals.forEach(([label, v, strong], i) => {
      const ry = y - 12 - i * 15
      right(label, W - MR - 92, ry, strong ? 9.5 : 8.5, strong ? B : R, strong ? INK : MUTED)
      right(num(v), W - MR - 6, ry, strong ? 10.5 : 9, strong ? B : R, INK)
    })
    y -= 12 + totals.length * 15
    if (doc.totalsNote) {
      text(doc.totalsNote, ML, y - 12, 7.5, R, MUTED)
      y -= 18
    }
  } else y -= 22

  if (doc.note) {
    const noteLines = wrap(doc.note, R, 9.5, CW - 28)
    const h = noteLines.length * 13 + 30
    ensure(h + 10)
    y -= 8
    page.drawRectangle({ x: ML, y: y - h, width: CW, height: h, color: hex('#FEF3EC'), borderColor: hex('#F9C9AE'), borderWidth: 0.6 })
    text('NAPOMENA', ML + 14, y - 16, 7.5, B, RED)
    noteLines.forEach((l, i) => text(l, ML + 14, y - 31 - i * 13, 9.5, R, INK))
    y -= h + 8
  }

  // potpisnik i potpisi
  ensure(130)
  y -= 18
  if (doc.closing) {
    for (const l of wrap(doc.closing, R, 9, CW)) {
      text(l, ML, y, 9, R, INK)
      y -= 12
    }
    y -= 14
  }
  text(doc.signer.label, ML, y, 7.5, B, MUTED)
  y -= 15
  text(doc.signer.name, ML, y, 11, B, INK)
  y -= 13
  if (doc.signer.contact) {
    text(doc.signer.contact, ML, y, 9, R, MUTED)
    y -= 12
  }
  if (doc.signer.extra) text(doc.signer.extra, ML, y, 8.5, R, MUTED)
  const sigs = doc.signatures.slice(0, 2)
  const sw = 160
  sigs.forEach((label, i) => {
    const sx = W - MR - sw - (sigs.length - 1 - i) * (sw + 20)
    const sy = y - 4 - (sigs.length > 1 ? 0 : 0)
    page.drawLine({ start: { x: sx, y: sy + 10 }, end: { x: sx + sw, y: sy + 10 }, thickness: 0.7, color: GRAY })
    text(label, sx, sy - 2, 8, R, MUTED)
  })

  pages.forEach((p, i) => footer(p, i, pages.length))
  return pdf.save()
}

/* ───────────────────────── narudžba dobavljaču ───────────────────────── */

export interface PurchasePdfInput {
  order: PurchaseOrder
  company: CompanyInfo
  supplier: { name: string; phone: string; email: string }
  creator: { name: string; role: string; phone: string; email: string }
}

export function renderPurchaseOrderPdf({ order, company, supplier, creator }: PurchasePdfInput) {
  const hasPrice = order.lines.some((l) => l.price != null && l.price > 0)
  const total = order.lines.reduce((s, l) => s + (l.price ?? 0) * l.qty, 0)
  const columns: DocColumn[] = hasPrice
    ? [
        { key: 'rb', w: 24, label: 'R.br.', align: 'l' },
        { key: 'code', w: 62, label: 'Šifra', align: 'l' },
        { key: 'name', w: 0, label: 'Naziv artikla / napomena', align: 'l' },
        { key: 'qty', w: 40, label: 'Kol.', align: 'r' },
        { key: 'unit', w: 34, label: 'J.mj.', align: 'l' },
        { key: 'price', w: 62, label: 'Cijena', align: 'r' },
        { key: 'sum', w: 70, label: 'Iznos', align: 'r' },
      ]
    : [
        { key: 'rb', w: 28, label: 'R.br.', align: 'l' },
        { key: 'code', w: 80, label: 'Šifra', align: 'l' },
        { key: 'name', w: 0, label: 'Naziv artikla / napomena', align: 'l' },
        { key: 'qty', w: 52, label: 'Količina', align: 'r' },
        { key: 'unit', w: 40, label: 'J.mj.', align: 'l' },
      ]
  return renderLetterDoc({
    company,
    title: 'NARUDŽBA',
    number: order.number,
    meta: [`Datum: ${dateBa(order.date)}`, order.deliveryBy ? `Željeni rok isporuke: ${dateBa(order.deliveryBy)}` : ''],
    boxes: [
      { title: 'DOBAVLJAČ', lines: [supplier.name, supplier.phone && `Tel: ${supplier.phone}`, supplier.email] },
      {
        title: 'NARUČITELJ',
        lines: [
          company.legalName || company.name,
          `${company.address}, ${company.city}`,
          [company.jib && `JIB: ${company.jib}`, company.vatNumber && `PDV: ${company.vatNumber}`].filter(Boolean).join('  ·  '),
        ],
      },
    ],
    intro: 'Molimo da nam isporučite sljedeću robu:',
    columns,
    rows: order.lines.map((l, i) => {
      const amount = l.price != null && l.price > 0 ? l.price * l.qty : 0
      return {
        cells: {
          rb: `${i + 1}.`,
          code: l.code || '—',
          name: l.name,
          qty: num(l.qty, 0),
          unit: l.unit,
          price: l.price ? num(l.price) : '—',
          sum: amount ? num(amount) : '—',
        },
        note: l.note,
      }
    }),
    summary: `Ukupno stavki: ${order.lines.length}   ·   ukupna količina: ${num(order.lines.reduce((s, l) => s + l.qty, 0), 0)}`,
    totals: hasPrice
      ? [
          ['Ukupno bez PDV-a', total, false],
          ['PDV 17 %', total * 0.17, false],
          ['Ukupno s PDV-om (KM)', total * 1.17, true],
        ]
      : undefined,
    totalsNote: hasPrice ? 'Cijene su orijentacione (zadnja nabavna, bez PDV-a) i podložne potvrdi dobavljača.' : undefined,
    note: order.note,
    closing: 'Molimo potvrdu narudžbe i rok isporuke na kontakt ispod.',
    signer: {
      label: 'NARUDŽBU IZRADIO/LA',
      name: creator.name,
      contact: [creator.role, creator.phone && `Tel: ${creator.phone}`, creator.email || company.email].filter(Boolean).join('  ·  '),
      extra: order.closedAt ? `Zaključeno: ${dateBa(order.closedAt)}` : undefined,
    },
    signatures: [`Za ${company.name} (potpis i pečat)`],
  })
}
