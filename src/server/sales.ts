/** Kupci (uređivanje) i dokumenti za kupca: ponuda, predračun, otpremnica. Izvoz svih podataka. */
import { asc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'
import type { SessionUser } from './auth'
import { getCompany } from './ops'
import { dateBa, num, renderLetterDoc, type DocColumn } from './pdf'

/* ───────────────────────── kupci ───────────────────────── */

export interface CustomerInput {
  id: string
  name: string
  phone: string
  email: string
  city: string
  address: string
  note: string
}

export async function saveCustomer(input: CustomerInput) {
  const name = input.name.trim()
  if (!name) throw new Error('Ime kupca je obavezno.')
  await db
    .update(t.customers)
    .set({
      name,
      phone: input.phone.trim(),
      email: input.email.trim(),
      city: input.city.trim(),
      address: input.address.trim(),
      note: input.note.trim(),
    })
    .where(eq(t.customers.id, Number(input.id)))
}

/* ───────────────────────── dokumenti za kupca ───────────────────────── */

export type CustomerDocKind = 'ponuda' | 'predracun' | 'racun' | 'otpremnica'

export async function customerDocPdf(user: SessionUser, orderId: string, kind: CustomerDocKind) {
  const [o] = await db.select().from(t.orders).where(eq(t.orders.id, Number(orderId)))
  if (!o) throw new Error('Narudžba ne postoji.')
  const restricted = user.role === 'trgovac' || user.role === 'operativa'
  if (restricted && String(o.employeeId) !== user.employeeId) throw new Error('Dokumente možete izdavati samo za svoje narudžbe.')
  const [c] = await db.select().from(t.customers).where(eq(t.customers.id, o.customerId))
  const [e] = await db.select().from(t.employees).where(eq(t.employees.id, o.employeeId))
  const [d] = await db.select().from(t.deliveries).where(eq(t.deliveries.orderId, o.id))
  const items = await db
    .select({ i: t.orderItems, sku: t.products.sku, name: t.products.name })
    .from(t.orderItems)
    .innerJoin(t.products, eq(t.orderItems.productId, t.products.id))
    .where(eq(t.orderItems.orderId, o.id))
    .orderBy(asc(t.orderItems.id))
  const pays = await db.select().from(t.payments).where(eq(t.payments.orderId, o.id))
  const paid = pays.reduce((s, p) => s + p.amount, 0)
  const company = await getCompany()
  // Slike stavki po mjeri (prikaz iz Palette CAD-a) idu na sve dokumente osim otpremnice.
  const imgIds = kind === 'otpremnica' ? [] : items.map((x) => x.i.imageId).filter((v): v is number => v != null)
  const imgs = new Map<number, { data: Uint8Array; mime: string }>()
  if (imgIds.length)
    for (const f of await db.select({ id: t.files.id, mime: t.files.mime, data: t.files.data }).from(t.files).where(inArray(t.files.id, imgIds)))
      imgs.set(f.id, { data: new Uint8Array(f.data as Uint8Array), mime: f.mime })

  const lineSum = (i: (typeof items)[number]['i']) => i.qty * i.unitPrice * (1 - i.discountPct / 100)
  const total = items.reduce((s, x) => s + lineSum(x.i), 0)
  const base = total / 1.17
  // Račun: ako je kupac platio cijeli iznos, to je konačni račun; ako je platio dio, račun za predujam.
  const fullyPaid = paid >= total - 0.005
  if (kind === 'racun' && paid <= 0) throw new Error('Račun se izdaje kad je kupac nešto platio. Prvo upišite uplatu, ili izdajte predračun.')
  const advance = kind === 'racun' && !fullyPaid
  const advBase = paid / 1.17
  const withPrices = kind !== 'otpremnica'
  const anyDiscount = items.some((x) => x.i.discountPct > 0)
  const columns: DocColumn[] = withPrices
    ? [
        { key: 'rb', w: 24, label: 'R.br.', align: 'l' },
        { key: 'code', w: 58, label: 'Šifra', align: 'l' },
        { key: 'name', w: 0, label: 'Artikal', align: 'l' },
        { key: 'qty', w: 34, label: 'Kol.', align: 'r' },
        { key: 'price', w: 64, label: 'Cijena', align: 'r' },
        ...(anyDiscount ? [{ key: 'disc', w: 40, label: 'Popust', align: 'r' as const }] : []),
        { key: 'sum', w: 70, label: 'Iznos', align: 'r' },
      ]
    : [
        { key: 'rb', w: 28, label: 'R.br.', align: 'l' },
        { key: 'code', w: 80, label: 'Šifra', align: 'l' },
        { key: 'name', w: 0, label: 'Artikal', align: 'l' },
        { key: 'qty', w: 52, label: 'Količina', align: 'r' },
        { key: 'unit', w: 40, label: 'J.mj.', align: 'l' },
      ]
  const title =
    kind === 'ponuda' ? 'PONUDA' : kind === 'predracun' ? 'PREDRAČUN' : kind === 'racun' ? (advance ? 'RAČUN ZA PREDUJAM' : 'RAČUN') : 'OTPREMNICA'
  const prefix = kind === 'ponuda' ? 'PON' : kind === 'predracun' ? 'PRD' : kind === 'racun' ? (advance ? 'RPD' : 'RAC') : 'OTP'
  const number = `${prefix}-${o.number}`
  const validTo = new Date(`${o.date}T00:00:00Z`)
  validTo.setUTCDate(validTo.getUTCDate() + 15)
  const meta =
    kind === 'otpremnica'
      ? [`Datum: ${dateBa(d?.date ?? o.issuedAt ?? o.date)}`, `Po narudžbi ${o.number}`]
      : kind === 'ponuda'
        ? [`Datum: ${dateBa(o.date)}`, `Vrijedi do: ${dateBa(validTo.toISOString())}`]
        : [`Datum: ${dateBa(o.date)}`, `Narudžba: ${o.number}`, `Način plaćanja: ${o.paymentMethod}`]
  const deliveryLine = d ? `Dostava: ${d.address}, ${d.city} · ${dateBa(d.date)} (${d.slot})${d.assembly ? ' · s montažom' : ''}` : ''

  const bytes = await renderLetterDoc({
    company,
    title,
    number,
    meta,
    boxes: [
      { title: 'KUPAC', lines: [c?.name ?? '', [c?.address, c?.city].filter(Boolean).join(', '), [c?.phone && `Tel: ${c.phone}`, c?.email].filter(Boolean).join('  ·  ')] },
      kind === 'otpremnica'
        ? { title: 'ISPORUKA', lines: [d ? `${d.address}, ${d.city}` : 'Preuzimanje u salonu', d ? `${dateBa(d.date)} · termin ${d.slot}` : '', d?.assembly ? 'Uključena montaža' : ''] }
        : { title: 'PRODAVAČ', lines: [company.legalName || company.name, `${company.address}, ${company.city}`, [company.jib && `JIB: ${company.jib}`, company.vatNumber && `PDV: ${company.vatNumber}`].filter(Boolean).join('  ·  ')] },
    ],
    intro:
      kind === 'ponuda'
        ? 'Zahvaljujemo na interesovanju. Za Vas smo pripremili sljedeću ponudu:'
        : kind === 'predracun'
          ? 'Predračun za naručenu robu:'
          : kind === 'racun'
            ? advance
              ? 'Primili smo predujam za naručenu robu. Stavke narudžbe su:'
              : 'Račun za naručenu robu, plaćen u cijelosti:'
            : 'Izdajemo sljedeću robu:',
    columns,
    rows: items.map((x, idx) => ({
      ...(x.i.customName ? { detail: x.i.description || undefined, image: imgs.get(x.i.imageId ?? 0) } : {}),
      cells: {
        rb: `${idx + 1}.`,
        code: x.i.customName ? 'po mjeri' : x.sku,
        name: x.i.customName ? x.i.customName : x.i.variant ? `${x.name} (${x.i.variant})` : x.name,
        qty: num(x.i.qty, 0),
        unit: 'kom',
        price: num(x.i.unitPrice),
        disc: x.i.discountPct ? `${num(x.i.discountPct, 0)} %` : '—',
        sum: num(lineSum(x.i)),
      },
    })),
    summary: `Ukupno stavki: ${items.length}   ·   ukupna količina: ${num(items.reduce((s, x) => s + x.i.qty, 0), 0)}`,
    totals: withPrices
      ? advance
        ? [
            ['Ukupna vrijednost narudžbe s PDV-om (KM)', total, false],
            ['Osnovica predujma (bez PDV-a)', advBase, false],
            ['PDV 17 % na predujam', paid - advBase, false],
            ['Iznos predujma (KM)', paid, true],
            ['Preostalo za uplatu (KM)', Math.max(0, total - paid), false],
          ]
        : [
          ['Osnovica (bez PDV-a)', base, false],
          ['PDV 17 %', total - base, false],
          ['Ukupno s PDV-om (KM)', total, true],
          ...(kind === 'racun' ? ([['Uplaćeno (KM)', paid, false]] as [string, number, boolean][]) : []),
          ...(kind === 'predracun' && paid > 0
            ? ([
                ['Uplaćeno (avans)', paid, false],
                ['Za uplatu (KM)', Math.max(0, total - paid), true],
              ] as [string, number, boolean][])
            : []),
        ]
      : undefined,
    totalsNote: withPrices ? 'Cijene su u KM i uključuju PDV 17 %.' : undefined,
    // Napomena iz prodaje je interna (za kolege i dostavu) i nikad se ne ispisuje na dokumentima za kupca.
    note: kind !== 'otpremnica' ? deliveryLine : '',
    closing:
      kind === 'ponuda'
        ? 'Ponuda vrijedi 15 dana. Za sva pitanja, izmjene ili dogovor o dostavi slobodno nas kontaktirajte.'
        : kind === 'predracun'
          ? `Uplatu možete izvršiti na žiro račun${company.bankAccount ? ` ${company.bankAccount}` : ''} uz poziv na broj ${o.number}, ili u salonu.`
          : kind === 'racun'
            ? advance
              ? `Preostali iznos platite prije preuzimanja robe, na žiro račun${company.bankAccount ? ` ${company.bankAccount}` : ''} uz poziv na broj ${o.number}, ili u salonu.`
              : 'Hvala na kupovini. Narudžba je plaćena u cijelosti.'
            : 'Kupac svojim potpisom potvrđuje da je robu preuzeo u ispravnom stanju i u navedenim količinama.',
    signer: {
      label: kind === 'otpremnica' ? 'ROBU IZDAO/LA' : 'VAŠ PRODAVAČ',
      name: e?.name ?? '',
      contact: [e?.phone && `Tel: ${e.phone}`, company.email].filter(Boolean).join('  ·  '),
    },
    signatures: kind === 'otpremnica' ? ['Robu izdao', 'Robu preuzeo (kupac)'] : [`Za ${company.name}`],
  })
  return { name: `${title.charAt(0)}${title.slice(1).toLowerCase()} ${o.number} - ${(c?.name ?? '').replace(/[^\p{L}\p{N} .-]/gu, '')}.pdf`, data: Buffer.from(bytes).toString('base64') }
}

/* ───────────────────────── izvoz svih podataka ───────────────────────── */

/** Sve tablice (osim datoteka i lozinki) kao redovi za Excel — rezervna kopija. */
export async function exportAll() {
  const tables: [string, string][] = [
    ['Kupci', 'customers'],
    ['Narudžbe', 'orders'],
    ['Stavke narudžbi', 'order_items'],
    ['Uplate', 'payments'],
    ['Dostave', 'deliveries'],
    ['Artikli', 'products'],
    ['Dobavljači', 'suppliers'],
    ['Primke', 'receipts'],
    ['Kretanja robe', 'stock_movements'],
    ['Narudžbe dobavljačima', 'purchase_orders'],
    ['Stavke nar. dobavljačima', 'purchase_order_items'],
    ['Kartice dobavljača', 'supplier_ledger'],
    ['Zaposlenici', 'employees'],
    ['Planovi prometa', 'employee_targets'],
    ['Radno vrijeme', 'work_time'],
    ['Plaće', 'salaries'],
    ['Bonusi', 'bonuses'],
    ['Troškovi', 'expenses'],
    ['Zadaci', 'tasks'],
    ['Dokumenti', 'documents'],
    ['Izvoz - ponude', 'export_offers'],
    ['Izvoz - stavke ponuda', 'export_offer_items'],
    ['Izvoz - računi', 'export_invoices'],
  ]
  const out: { sheet: string; header: string[]; rows: (string | number | null)[][] }[] = []
  for (const [sheet, table] of tables) {
    const res = await db.execute(sql.raw(`select * from "${table}" order by 1`))
    const rows = res.rows as Record<string, unknown>[]
    const header = rows[0] ? Object.keys(rows[0]).filter((k) => !/hash|code|data$/.test(k)) : ['(prazno)']
    out.push({
      sheet,
      header,
      rows: rows.map((r) =>
        header.map((k) => {
          const v = r[k]
          if (v == null) return null
          if (v instanceof Date) return v.toISOString().replace('T', ' ').slice(0, 19)
          if (typeof v === 'number') return v
          if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) && !/phone|number|sku|code|jib|account/.test(k)) return Number(v)
          return String(v).slice(0, 32000)
        }),
      ),
    })
  }
  return { date: new Date().toISOString().slice(0, 10), tables: out }
}

/** Naknadni upis PDV-a s računa dobavljača na primku (null = 17 %). */
export async function setReceiptVat(receiptId: string, vat: number | null) {
  await db
    .update(t.receipts)
    .set({ vat: vat == null || Number.isNaN(vat) ? null : Math.round(Math.max(0, vat) * 100) / 100 })
    .where(eq(t.receipts.id, Number(receiptId)))
}
