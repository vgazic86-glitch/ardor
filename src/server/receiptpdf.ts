import { asc, eq, inArray } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'
import { getCompany } from './ops'
import { dateBa, num, renderLetterDoc, type DocColumn } from './pdf'

/** Primjerak primke (interni dokument): nabavna i prodajna cijena, marža i ukupne vrijednosti. */
const VAT = 0.17

export async function receiptPdf(id: string) {
  const [r] = await db.select().from(t.receipts).where(eq(t.receipts.id, Number(id)))
  if (!r) throw new Error('Primka ne postoji.')
  const [s] = r.supplierId ? await db.select().from(t.suppliers).where(eq(t.suppliers.id, r.supplierId)) : []
  const [e] = r.employeeId ? await db.select().from(t.employees).where(eq(t.employees.id, r.employeeId)) : []
  const moves = await db.select().from(t.stockMovements).where(eq(t.stockMovements.receiptId, r.id)).orderBy(asc(t.stockMovements.id))
  const pids = [...new Set(moves.map((m) => m.productId))]
  const prods = pids.length ? await db.select().from(t.products).where(inArray(t.products.id, pids)) : []
  const pmap = new Map(prods.map((p) => [p.id, p]))
  const company = await getCompany()

  const lineCost = (qty: number, unit: number) => qty * unit
  const cost = moves.reduce((sum, m) => sum + lineCost(m.qty, m.unitCost), 0)
  const retail = moves.reduce((sum, m) => sum + m.qty * (pmap.get(m.productId)?.price ?? 0), 0)
  const pieces = moves.reduce((sum, m) => sum + m.qty, 0)
  const vat = r.vat ?? cost * VAT
  const margin = retail > 0 ? 1 - cost / (retail / (1 + VAT)) : 0

  const columns: DocColumn[] = [
    { key: 'rb', w: 24, label: 'R.br.', align: 'l' },
    { key: 'code', w: 58, label: 'Šifra', align: 'l' },
    { key: 'name', w: 0, label: 'Artikal', align: 'l' },
    { key: 'qty', w: 34, label: 'Kol.', align: 'r' },
    { key: 'cost', w: 60, label: 'Nabavna/kom', align: 'r' },
    { key: 'costSum', w: 66, label: 'Nabavna ukup.', align: 'r' },
    { key: 'price', w: 60, label: 'Prodajna/kom', align: 'r' },
    { key: 'margin', w: 44, label: 'Marža', align: 'r' },
  ]

  const bytes = await renderLetterDoc({
    company,
    title: 'PRIMKA ROBE',
    number: r.number,
    meta: [
      `Datum prijema: ${dateBa(r.date)}`,
      `Broj dokumenta dobavljača: ${r.documentNumber || '—'}`,
      `Mjesto prijema: ${moves[0]?.location === 'skladiste' ? 'Skladište' : 'Salon'}`,
      `Zaprimio: ${e?.name ?? '—'}`,
    ],
    boxes: [
      {
        title: 'DOBAVLJAČ',
        lines: [s?.name ?? 'Bez dobavljača', [s?.phone && `Tel: ${s.phone}`, s?.email].filter(Boolean).join('  ·  ')],
      },
      {
        title: 'INTERNO',
        lines: ['Dokument za salon i knjigovodstvo. Nije za kupca.', `Stavki: ${moves.length}   ·   komada: ${num(pieces, 0)}`],
      },
    ],
    intro: 'Primljena roba, s nabavnim i prodajnim cijenama:',
    columns,
    rows: moves.map((m, idx) => {
      const p = pmap.get(m.productId)
      const net = p ? p.price / (1 + VAT) : 0
      const mg = net > 0 ? 1 - m.unitCost / net : 0
      return {
        cells: {
          rb: `${idx + 1}.`,
          code: p?.sku ?? '—',
          name: p?.name ?? '—',
          qty: num(m.qty, 0),
          cost: num(m.unitCost),
          costSum: num(lineCost(m.qty, m.unitCost)),
          price: p ? num(p.price) : '—',
          margin: net > 0 ? `${num(mg * 100, 0)} %` : '—',
        },
      }
    }),
    summary: `Stavki: ${moves.length}   ·   komada: ${num(pieces, 0)}`,
    totals: [
      ['Nabavna vrijednost bez PDV-a (KM)', cost, false],
      ['PDV na prijem (KM)', vat, false],
      ['Nabavna vrijednost s PDV-om (KM)', cost + vat, true],
      ['Prodajna vrijednost s PDV-om (KM)', retail, false],
      ['Prosječna marža (%)', margin * 100, false],
    ],
    totalsNote: 'Nabavne cijene su bez PDV-a. Prodajne cijene su s PDV-om (17 %). Marža je razlika prodajne (bez PDV-a) i nabavne cijene, u postotku prodajne.',
    note: r.note,
    closing: 'Primjerak primke za evidenciju. Stanje zaliha je ažurirano na dan prijema.',
    signer: { label: 'ZAPRIMIO', name: e?.name ?? '', contact: '' },
    signatures: ['Zaprimio', 'Dobavljač (otpremio)'],
  })
  return { name: `Primka ${r.number}.pdf`, data: Buffer.from(bytes).toString('base64') }
}
