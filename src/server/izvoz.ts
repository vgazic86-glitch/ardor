/** Izvoz: ponude stranim kupcima; prihvaćena ponuda automatski postaje račun (i roba izlazi sa zalihe). */
import { asc, desc, eq, inArray, like } from 'drizzle-orm'
import { db, type Tx } from '../../db/index.js'
import * as t from '../../db/schema.js'
import type { SessionUser } from './auth'
import { avgCosts, todayIso } from './logic'
import { getCompany } from './ops'
import { dateBa, num, renderLetterDoc, type DocColumn } from './pdf'
import {
  addDays,
  canMoveOffer,
  DEFAULT_VALID_DAYS,
  DEFAULT_VAT_NOTE,
  lineTotal,
  nextNumber,
  offerTotal,
  toKm,
  type ExportInvoiceStatus,
  type ExportOfferStatus,
} from '../lib/izvoz'

export interface ExportItemInput {
  productId: string | null
  code: string
  name: string
  qty: number
  unit: string
  unitPrice: number
  discountPct: number
}

export interface ExportOfferInput {
  id: string | null
  date: string
  validUntil: string
  buyerName: string
  buyerAddress: string
  buyerCity: string
  buyerCountry: string
  buyerVatId: string
  buyerContact: string
  buyerEmail: string
  buyerPhone: string
  currency: string
  rate: number
  incoterms: string
  paymentDays: number
  paymentTerms: string
  deliveryTerms: string
  location: 'skladiste' | 'salon'
  vatNote: string
  note: string
  items: ExportItemInput[]
}

export interface ExportOfferRow extends Omit<ExportOfferInput, 'id' | 'items'> {
  id: string
  number: string
  status: ExportOfferStatus
  total: number
  createdBy: string
  decidedAt: string | null
  items: (ExportItemInput & { id: string; total: number })[]
  invoice: { id: string; number: string; status: ExportInvoiceStatus } | null
}

export interface ExportInvoiceRow {
  id: string
  number: string
  offerId: string
  offerNumber: string
  buyerName: string
  buyerCountry: string
  date: string
  dueDate: string
  total: number
  totalKm: number
  currency: string
  rate: number
  status: ExportInvoiceStatus
  paidAt: string | null
  createdBy: string
}

const OFFER_PREFIX = 'IZP'
const INVOICE_PREFIX = 'IZR'

const year = (iso: string) => Number(iso.slice(0, 4))
const isoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

/** Sve ponude i računi za izvoz (najnovije prve). */
export async function listExport(): Promise<{ offers: ExportOfferRow[]; invoices: ExportInvoiceRow[]; today: string }> {
  const offers = await db.select().from(t.exportOffers).orderBy(desc(t.exportOffers.date), desc(t.exportOffers.id))
  const items = await db.select().from(t.exportOfferItems).orderBy(asc(t.exportOfferItems.id))
  const invoices = await db.select().from(t.exportInvoices).orderBy(desc(t.exportInvoices.date), desc(t.exportInvoices.id))
  const emps = await db.select({ id: t.employees.id, name: t.employees.name }).from(t.employees)
  const empName = new Map(emps.map((e) => [e.id, e.name]))
  const byOffer = new Map<number, (typeof items)[number][]>()
  for (const i of items) byOffer.set(i.offerId, [...(byOffer.get(i.offerId) ?? []), i])
  const offerById = new Map(offers.map((o) => [o.id, o]))

  return {
    today: todayIso(),
    offers: offers.map((o) => {
      const its = byOffer.get(o.id) ?? []
      const inv = invoices.find((i) => i.offerId === o.id && i.status !== 'storniran')
      return {
        id: String(o.id),
        number: o.number,
        status: o.status as ExportOfferStatus,
        date: o.date,
        validUntil: o.validUntil,
        buyerName: o.buyerName,
        buyerAddress: o.buyerAddress,
        buyerCity: o.buyerCity,
        buyerCountry: o.buyerCountry,
        buyerVatId: o.buyerVatId,
        buyerContact: o.buyerContact,
        buyerEmail: o.buyerEmail,
        buyerPhone: o.buyerPhone,
        currency: o.currency,
        rate: o.rate,
        incoterms: o.incoterms,
        paymentDays: o.paymentDays,
        paymentTerms: o.paymentTerms,
        deliveryTerms: o.deliveryTerms,
        location: o.location === 'salon' ? 'salon' : 'skladiste',
        vatNote: o.vatNote,
        note: o.note,
        total: offerTotal(its),
        createdBy: o.employeeId ? (empName.get(o.employeeId) ?? '') : '',
        decidedAt: o.decidedAt ? o.decidedAt.toISOString() : null,
        items: its.map((i) => ({
          id: String(i.id),
          productId: i.productId ? String(i.productId) : null,
          code: i.code,
          name: i.name,
          qty: i.qty,
          unit: i.unit,
          unitPrice: i.unitPrice,
          discountPct: i.discountPct,
          total: lineTotal(i),
        })),
        invoice: inv ? { id: String(inv.id), number: inv.number, status: inv.status as ExportInvoiceStatus } : null,
      }
    }),
    invoices: invoices.map((i) => {
      const o = offerById.get(i.offerId)
      return {
        id: String(i.id),
        number: i.number,
        offerId: String(i.offerId),
        offerNumber: o?.number ?? '',
        buyerName: o?.buyerName ?? '',
        buyerCountry: o?.buyerCountry ?? '',
        date: i.date,
        dueDate: i.dueDate,
        total: i.total,
        totalKm: toKm(i.total, i.rate),
        currency: i.currency,
        rate: i.rate,
        status: i.status as ExportInvoiceStatus,
        paidAt: i.paidAt,
        createdBy: i.employeeId ? (empName.get(i.employeeId) ?? '') : '',
      }
    }),
  }
}

function clean(input: ExportOfferInput) {
  const s = (v: unknown, max = 300) => String(v ?? '').trim().slice(0, max)
  const buyerName = s(input.buyerName, 160)
  if (!buyerName) throw new Error('Upišite naziv kupca.')
  const date = isoDate(input.date) ? input.date : todayIso()
  const validUntil = isoDate(input.validUntil) ? input.validUntil : addDays(date, DEFAULT_VALID_DAYS)
  if (validUntil < date) throw new Error('Rok važenja ponude ne može biti prije datuma ponude.')
  const currency = s(input.currency, 8).toUpperCase() || 'EUR'
  const rate = currency === 'KM' ? 1 : Number(input.rate)
  if (!(rate > 0)) throw new Error('Upišite kurs: koliko KM vrijedi 1 ' + currency + '.')
  const items = (input.items ?? [])
    .map((i) => ({
      productId: i.productId ? Number(i.productId) : null,
      code: s(i.code, 60),
      name: s(i.name, 300),
      qty: Math.round(Number(i.qty)),
      unit: s(i.unit, 12) || 'kom',
      unitPrice: Math.round(Number(i.unitPrice) * 100) / 100,
      discountPct: Math.min(100, Math.max(0, Math.round(Number(i.discountPct || 0) * 100) / 100)),
    }))
    .filter((i) => i.name || i.qty)
  if (!items.length) throw new Error('Dodajte barem jednu stavku.')
  for (const [n, i] of items.entries()) {
    if (!i.name) throw new Error(`Stavka ${n + 1}: upišite naziv.`)
    if (!(i.qty > 0)) throw new Error(`Stavka ${n + 1} (${i.name}): količina mora biti veća od 0.`)
    if (!(i.unitPrice >= 0) || Number.isNaN(i.unitPrice)) throw new Error(`Stavka ${n + 1} (${i.name}): neispravna cijena.`)
  }
  return {
    offer: {
      date,
      validUntil,
      buyerName,
      buyerAddress: s(input.buyerAddress),
      buyerCity: s(input.buyerCity),
      buyerCountry: s(input.buyerCountry, 80),
      buyerVatId: s(input.buyerVatId, 60),
      buyerContact: s(input.buyerContact, 120),
      buyerEmail: s(input.buyerEmail, 160),
      buyerPhone: s(input.buyerPhone, 60),
      currency,
      rate,
      incoterms: s(input.incoterms, 120),
      paymentDays: Math.max(0, Math.min(365, Math.round(Number(input.paymentDays) || 0))),
      paymentTerms: s(input.paymentTerms, 500),
      deliveryTerms: s(input.deliveryTerms, 500),
      location: input.location === 'salon' ? 'salon' : 'skladiste',
      vatNote: s(input.vatNote, 500) || DEFAULT_VAT_NOTE,
      note: s(input.note, 2000),
    },
    items,
  }
}

/** Nova ili izmijenjena ponuda. Prihvaćena ponuda se ne mijenja (prvo storno računa). */
export async function saveOffer(user: SessionUser, input: ExportOfferInput) {
  const { offer, items } = clean(input)
  return db.transaction(async (tx) => {
    let id: number
    let number: string
    if (input.id) {
      const [o] = await tx.select().from(t.exportOffers).where(eq(t.exportOffers.id, Number(input.id))).for('update')
      if (!o) throw new Error('Ponuda ne postoji.')
      if (o.status === 'prihvacena') throw new Error('Ponuda je prihvaćena i po njoj je izdan račun — ne može se mijenjati. Za ispravku prvo stornirajte račun.')
      await tx.update(t.exportOffers).set(offer).where(eq(t.exportOffers.id, o.id))
      await tx.delete(t.exportOfferItems).where(eq(t.exportOfferItems.offerId, o.id))
      id = o.id
      number = o.number
    } else {
      const existing = await tx
        .select({ n: t.exportOffers.number })
        .from(t.exportOffers)
        .where(like(t.exportOffers.number, `${OFFER_PREFIX}-${year(offer.date)}-%`))
      number = nextNumber(OFFER_PREFIX, year(offer.date), existing.map((e) => e.n))
      const [row] = await tx
        .insert(t.exportOffers)
        .values({ ...offer, number, status: 'nacrt', employeeId: user.employeeId ? Number(user.employeeId) : null, createdAt: new Date() })
        .returning()
      id = row.id
    }
    await tx.insert(t.exportOfferItems).values(items.map((i) => ({ ...i, offerId: id })))
    return { id: String(id), number }
  })
}

/** Izdaje račun za prihvaćenu ponudu (u istoj transakciji): broj redom, rok plaćanja, izlaz robe sa zalihe. */
async function issueInvoice(tx: Tx, user: SessionUser, o: typeof t.exportOffers.$inferSelect) {
  const items = await tx.select().from(t.exportOfferItems).where(eq(t.exportOfferItems.offerId, o.id))
  if (!items.length) throw new Error('Ponuda nema stavki — račun se ne može izdati.')
  const date = todayIso()
  const existing = await tx
    .select({ n: t.exportInvoices.number })
    .from(t.exportInvoices)
    .where(like(t.exportInvoices.number, `${INVOICE_PREFIX}-${year(date)}-%`))
    .for('update')
  const number = nextNumber(INVOICE_PREFIX, year(date), existing.map((e) => e.n))
  const actor = user.employeeId ? Number(user.employeeId) : null
  const [inv] = await tx
    .insert(t.exportInvoices)
    .values({
      number,
      offerId: o.id,
      date,
      dueDate: addDays(date, o.paymentDays),
      total: offerTotal(items),
      currency: o.currency,
      rate: o.rate,
      status: 'izdan',
      employeeId: actor,
      createdAt: new Date(),
    })
    .returning()
  const stocked = items.filter((i) => i.productId != null)
  if (stocked.length) {
    const ids = [...new Set(stocked.map((i) => i.productId!))]
    const alive = new Set((await tx.select({ id: t.products.id }).from(t.products).where(inArray(t.products.id, ids))).map((p) => p.id))
    const costs = await avgCosts(tx, ids)
    const rows = stocked
      .filter((i) => alive.has(i.productId!))
      .map((i) => ({
        productId: i.productId!,
        date,
        type: 'izvoz',
        qty: -i.qty,
        unitCost: costs.get(i.productId!) ?? 0,
        employeeId: actor,
        location: o.location === 'salon' ? 'salon' : 'skladiste',
        exportInvoiceId: inv.id,
        note: `Izvoz po računu ${number} (${o.buyerName})`,
      }))
    if (rows.length) await tx.insert(t.stockMovements).values(rows)
  }
  return number
}

/** Promjena statusa ponude. „Prihvaćena” automatski izdaje račun. Vraća broj računa ako je izdan. */
export async function setOfferStatus(user: SessionUser, id: string, status: ExportOfferStatus) {
  if (!['nacrt', 'poslana', 'prihvacena', 'odbijena'].includes(status)) throw new Error('Nepoznat status.')
  return db.transaction(async (tx) => {
    const [o] = await tx.select().from(t.exportOffers).where(eq(t.exportOffers.id, Number(id))).for('update')
    if (!o) throw new Error('Ponuda ne postoji.')
    const from = o.status as ExportOfferStatus
    if (from === 'prihvacena') throw new Error('Ponuda je već prihvaćena i račun je izdan. Za povratak prvo stornirajte račun.')
    if (!canMoveOffer(from, status)) throw new Error('Ta promjena statusa nije moguća.')
    let invoice: string | null = null
    if (status === 'prihvacena') invoice = await issueInvoice(tx, user, o)
    await tx
      .update(t.exportOffers)
      .set({ status, decidedAt: status === 'prihvacena' || status === 'odbijena' ? new Date() : null })
      .where(eq(t.exportOffers.id, o.id))
    return { number: o.number, invoice }
  })
}

/** Briše ponudu koja nikad nije imala račun. */
export async function deleteOffer(id: string) {
  const [o] = await db.select().from(t.exportOffers).where(eq(t.exportOffers.id, Number(id)))
  if (!o) throw new Error('Ponuda ne postoji.')
  const [inv] = await db.select({ id: t.exportInvoices.id }).from(t.exportInvoices).where(eq(t.exportInvoices.offerId, o.id)).limit(1)
  if (inv) throw new Error('Po ovoj ponudi je izdavan račun — ponuda se čuva i ne može se obrisati.')
  await db.delete(t.exportOffers).where(eq(t.exportOffers.id, o.id))
  return { number: o.number }
}

/** Račun plaćen / vraćen na neplaćen / storniran (storno vraća robu na zalihu i ponudu u „Poslana”). */
export async function setInvoiceStatus(id: string, status: ExportInvoiceStatus, paidAt?: string) {
  if (!['izdan', 'placen', 'storniran'].includes(status)) throw new Error('Nepoznat status.')
  return db.transaction(async (tx) => {
    const [inv] = await tx.select().from(t.exportInvoices).where(eq(t.exportInvoices.id, Number(id))).for('update')
    if (!inv) throw new Error('Račun ne postoji.')
    if (inv.status === 'storniran') throw new Error('Račun je storniran i više se ne mijenja.')
    if (status === 'storniran') {
      await tx.delete(t.stockMovements).where(eq(t.stockMovements.exportInvoiceId, inv.id))
      await tx.update(t.exportInvoices).set({ status, paidAt: null }).where(eq(t.exportInvoices.id, inv.id))
      await tx.update(t.exportOffers).set({ status: 'poslana', decidedAt: null }).where(eq(t.exportOffers.id, inv.offerId))
    } else {
      const day = status === 'placen' ? (paidAt && isoDate(paidAt) ? paidAt : todayIso()) : null
      await tx.update(t.exportInvoices).set({ status, paidAt: day }).where(eq(t.exportInvoices.id, inv.id))
    }
    return { number: inv.number }
  })
}

/* ───────────────────────── PDF (dvojezično: bosanski / engleski) ───────────────────────── */

async function loadOffer(offerId: number) {
  const [o] = await db.select().from(t.exportOffers).where(eq(t.exportOffers.id, offerId))
  if (!o) throw new Error('Ponuda ne postoji.')
  const items = await db.select().from(t.exportOfferItems).where(eq(t.exportOfferItems.offerId, o.id)).orderBy(asc(t.exportOfferItems.id))
  const [e] = o.employeeId ? await db.select().from(t.employees).where(eq(t.employees.id, o.employeeId)) : []
  return { o, items, e }
}

/** Datum za engleski dio teksta (bez završne tačke). */
const en = (iso: string) => dateBa(iso).slice(0, -1)

const fileSafe = (s: string) => s.replace(/[^\p{L}\p{N} .-]/gu, '')

async function exportPdf(kind: 'offer' | 'invoice', offerId: number, inv?: typeof t.exportInvoices.$inferSelect) {
  const { o, items, e } = await loadOffer(offerId)
  const company = await getCompany()
  const cur = o.currency
  const total = offerTotal(items)
  const anyDiscount = items.some((i) => i.discountPct > 0)
  const columns: DocColumn[] = [
    { key: 'rb', w: 24, label: 'R.br.', align: 'l' },
    { key: 'code', w: 56, label: 'Šifra / Code', align: 'l' },
    { key: 'name', w: 0, label: 'Opis / Description', align: 'l' },
    { key: 'qty', w: 36, label: 'Kol./Qty', align: 'r' },
    { key: 'unit', w: 30, label: 'J.mj.', align: 'l' },
    { key: 'price', w: 62, label: `Cijena/Price`, align: 'r' },
    ...(anyDiscount ? [{ key: 'disc', w: 38, label: 'Rabat', align: 'r' as const }] : []),
    { key: 'sum', w: 70, label: `Iznos/Amount`, align: 'r' },
  ]
  const buyer = [
    o.buyerName,
    o.buyerAddress,
    [o.buyerCity, o.buyerCountry].filter(Boolean).join(', '),
    o.buyerVatId && `VAT/PDV: ${o.buyerVatId}`,
    [o.buyerContact, o.buyerPhone && `Tel: ${o.buyerPhone}`, o.buyerEmail].filter(Boolean).join('  ·  '),
  ]
  const seller = [
    company.legalName || company.name,
    company.address,
    `${company.city}, Bosna i Hercegovina`,
    [company.jib && `JIB/ID: ${company.jib}`, company.vatNumber && `PDV/VAT: ${company.vatNumber}`].filter(Boolean).join('  ·  '),
  ]
  const terms = [
    o.incoterms && `Paritet / Incoterms: ${o.incoterms}`,
    o.deliveryTerms && `Isporuka / Delivery: ${o.deliveryTerms}`,
    o.paymentTerms
      ? `Plaćanje / Payment: ${o.paymentTerms}`
      : o.paymentDays
        ? `Plaćanje / Payment: ${o.paymentDays} dana od datuma računa / ${o.paymentDays} days from invoice date`
        : 'Plaćanje / Payment: avansno / in advance',
    [company.iban && `IBAN: ${company.iban}`, company.swift && `SWIFT/BIC: ${company.swift}`, company.bank].filter(Boolean).join('  ·  '),
    o.vatNote,
    o.note,
  ]
    .filter(Boolean)
    .join('\n')
  const isInvoice = kind === 'invoice' && inv
  const totals: [string, number, boolean][] = [
    [`Ukupno / Total (${cur})`, total, true],
    ...(cur !== 'KM' ? ([[`Protuvrijednost u KM (1 ${cur} = ${num(o.rate, o.rate === 1.95583 ? 5 : 4)} KM)`, toKm(total, o.rate), false]] as [string, number, boolean][]) : []),
  ]
  const bytes = await renderLetterDoc({
    company,
    title: isInvoice ? (inv.status === 'storniran' ? 'RAČUN (STORNIRAN)' : 'RAČUN / INVOICE') : 'PONUDA / OFFER',
    number: isInvoice ? inv.number : o.number,
    meta: isInvoice
      ? [`Datum / Date: ${dateBa(inv.date)}`, `Dospijeće / Due: ${dateBa(inv.dueDate)}`, `Po ponudi / Offer: ${o.number}`]
      : [`Datum / Date: ${dateBa(o.date)}`, `Vrijedi do / Valid until: ${dateBa(o.validUntil)}`],
    boxes: [
      { title: 'KUPAC / BUYER', lines: buyer },
      { title: 'PRODAVAC / SELLER', lines: seller },
    ],
    intro: isInvoice
      ? 'Fakturišemo Vam sljedeću robu: / We invoice you for the following goods:'
      : 'Zahvaljujemo na upitu. Nudimo Vam: / Thank you for your inquiry. We are pleased to offer:',
    columns,
    rows: items.map((i, idx) => ({
      cells: {
        rb: `${idx + 1}.`,
        code: i.code || '—',
        name: i.name,
        qty: num(i.qty, 0),
        unit: i.unit,
        price: num(i.unitPrice),
        disc: i.discountPct ? `${num(i.discountPct, i.discountPct % 1 ? 2 : 0)} %` : '—',
        sum: num(lineTotal(i)),
      },
    })),
    summary: `Stavki / Items: ${items.length}   ·   kol. / qty: ${num(items.reduce((s, i) => s + i.qty, 0), 0)}`,
    totals,
    totalsNote: `Cijene u ${cur}, PDV 0 % (izvoz).  /  Prices in ${cur}, VAT 0 % (export).`,
    boxHeight: 100,
    note: terms,
    closing: isInvoice
      ? `Molimo uplatu do ${dateBa(inv.dueDate)} uz poziv na broj ${inv.number}. / Please pay by ${en(inv.dueDate)} quoting reference ${inv.number}.`
      : `Ponuda vrijedi do ${dateBa(o.validUntil)} Za potvrdu narudžbe odgovorite na ovu ponudu. / This offer is valid until ${en(o.validUntil)}. Please reply to confirm your order.`,
    signer: {
      label: isInvoice ? 'RAČUN IZDAO / ISSUED BY' : 'PONUDU PRIPREMIO / PREPARED BY',
      name: e?.name ?? company.name,
      contact: [e?.phone && `Tel: ${e.phone}`, company.email].filter(Boolean).join('  ·  '),
    },
    signatures: [`Za / For ${company.name}`],
  })
  const label = isInvoice ? `Racun ${inv.number}` : `Ponuda ${o.number}`
  return { name: `${label} - ${fileSafe(o.buyerName)}.pdf`, data: Buffer.from(bytes).toString('base64') }
}

export function offerPdf(id: string) {
  return exportPdf('offer', Number(id))
}

export async function invoicePdf(id: string) {
  const [inv] = await db.select().from(t.exportInvoices).where(eq(t.exportInvoices.id, Number(id)))
  if (!inv) throw new Error('Račun ne postoji.')
  return exportPdf('invoice', inv.offerId, inv)
}
