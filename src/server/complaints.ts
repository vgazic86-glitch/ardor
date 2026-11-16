/** Reklamacije kupaca: prijava, fotografije, praćenje roka i rješenja, zapisnik u PDF-u. */
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'
import { isFull, type SessionUser } from './auth'
import type { ProductImageUpload } from './images'
import { Letter } from './letter'
import { getCompany } from './ops'

export type ComplaintStatus = 'prijavljena' | 'u_obradi' | 'kod_dobavljaca' | 'rijesena' | 'odbijena'
export type ComplaintKind = 'ostecenje' | 'greska' | 'nedostaje' | 'montaza' | 'ostalo'

export const STATUS_LABEL: Record<ComplaintStatus, string> = {
  prijavljena: 'Prijavljena',
  u_obradi: 'U obradi',
  kod_dobavljaca: 'Kod dobavljača',
  rijesena: 'Riješena',
  odbijena: 'Odbijena',
}
export const KIND_LABEL: Record<ComplaintKind, string> = {
  ostecenje: 'Oštećenje',
  greska: 'Greška u izradi',
  nedostaje: 'Nedostaje dio',
  montaza: 'Montaža',
  ostalo: 'Ostalo',
}
export const RESOLUTION_LABEL: Record<string, string> = {
  popravak: 'Popravak',
  zamjena: 'Zamjena robe',
  povrat_novca: 'Povrat novca',
  popust: 'Popust',
  odbijena: 'Odbijena',
  drugo: 'Drugo',
}

export interface Complaint {
  id: string
  number: string
  date: string
  customerId: string | null
  customerName: string
  customerPhone: string
  orderId: string | null
  orderNumber: string
  productId: string | null
  productName: string
  supplierId: string | null
  supplierName: string
  kind: ComplaintKind
  description: string
  status: ComplaintStatus
  resolution: string
  resolutionNote: string
  dueDate: string | null
  assigneeId: string | null
  assigneeName: string
  createdByName: string
  createdAt: string
  updatedAt: string
  closedAt: string | null
  photos: { imageId: string; thumbId: string }[]
}

export interface ComplaintInput {
  id?: string
  date: string
  customerId: string | null
  orderId: string | null
  productId: string | null
  supplierId: string | null
  kind: ComplaintKind
  description: string
  dueDate: string | null
  assigneeId: string | null
}

const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
const num = (v: string | null | undefined) => (v ? Number(v) || null : null)
const str = (v: number | null) => (v === null ? null : String(v))

export async function listComplaints(): Promise<{ complaints: Complaint[]; users: { id: string; name: string }[] }> {
  const rows = await db
    .select({
      c: t.complaints,
      customerName: t.customers.name,
      customerPhone: t.customers.phone,
      orderNumber: t.orders.number,
      productName: t.products.name,
      supplierName: t.suppliers.name,
      assigneeName: t.users.name,
    })
    .from(t.complaints)
    .leftJoin(t.customers, eq(t.customers.id, t.complaints.customerId))
    .leftJoin(t.orders, eq(t.orders.id, t.complaints.orderId))
    .leftJoin(t.products, eq(t.products.id, t.complaints.productId))
    .leftJoin(t.suppliers, eq(t.suppliers.id, t.complaints.supplierId))
    .leftJoin(t.users, eq(t.users.id, t.complaints.assigneeId))
    .orderBy(desc(t.complaints.id))
  const ids = rows.map((r) => r.c.id)
  const photos = ids.length ? await db.select().from(t.complaintPhotos).where(inArray(t.complaintPhotos.complaintId, ids)) : []
  const users = await db.select({ id: t.users.id, name: t.users.name }).from(t.users).where(eq(t.users.active, true)).orderBy(t.users.name)
  return {
    users: users.map((u) => ({ id: String(u.id), name: u.name })),
    complaints: rows.map(({ c, ...r }) => ({
      id: String(c.id),
      number: c.number,
      date: c.date,
      customerId: str(c.customerId),
      customerName: r.customerName ?? '',
      customerPhone: r.customerPhone ?? '',
      orderId: str(c.orderId),
      orderNumber: r.orderNumber ?? '',
      productId: str(c.productId),
      productName: r.productName ?? '',
      supplierId: str(c.supplierId),
      supplierName: r.supplierName ?? '',
      kind: c.kind as ComplaintKind,
      description: c.description,
      status: c.status as ComplaintStatus,
      resolution: c.resolution,
      resolutionNote: c.resolutionNote,
      dueDate: c.dueDate,
      assigneeId: str(c.assigneeId),
      assigneeName: r.assigneeName ?? '',
      createdByName: c.createdByName,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      closedAt: c.closedAt ? c.closedAt.toISOString() : null,
      photos: photos.filter((p) => p.complaintId === c.id).map((p) => ({ imageId: String(p.imageId), thumbId: String(p.thumbId) })),
    })),
  }
}

export async function saveComplaint(user: SessionUser, d: ComplaintInput) {
  if (!d.description?.trim()) throw new Error('Opišite problem.')
  if (!isDate(d.date)) throw new Error('Neispravan datum.')
  if (d.dueDate && !isDate(d.dueDate)) throw new Error('Neispravan rok.')
  if (!d.customerId && !d.orderId) throw new Error('Odaberite kupca ili narudžbu.')
  let customerId = num(d.customerId)
  const orderId = num(d.orderId)
  if (orderId) {
    const [o] = await db.select({ c: t.orders.customerId }).from(t.orders).where(eq(t.orders.id, orderId))
    if (!o) throw new Error('Narudžba nije pronađena.')
    customerId = o.c
  }
  let supplierId = num(d.supplierId)
  const productId = num(d.productId)
  if (!supplierId && productId) {
    const [p] = await db.select({ s: t.products.supplierId }).from(t.products).where(eq(t.products.id, productId))
    supplierId = p?.s ?? null
  }
  const values = {
    date: d.date,
    customerId,
    orderId,
    productId,
    supplierId,
    kind: (Object.keys(KIND_LABEL).includes(d.kind) ? d.kind : 'ostalo') as string,
    description: d.description.trim().slice(0, 4000),
    dueDate: d.dueDate || null,
    assigneeId: num(d.assigneeId),
    updatedAt: new Date(),
  }
  if (d.id) {
    await db.update(t.complaints).set(values).where(eq(t.complaints.id, Number(d.id)))
    return { id: d.id }
  }
  const yy = d.date.slice(2, 4)
  const last = await db
    .select({ n: t.complaints.number })
    .from(t.complaints)
    .orderBy(desc(t.complaints.id))
    .limit(50)
  const next = last.map((x) => x.n.match(new RegExp(`^RK-${yy}-(\\d+)$`))?.[1]).filter(Boolean).map(Number).reduce((a, b) => Math.max(a, b), 0) + 1
  const [row] = await db
    .insert(t.complaints)
    .values({ ...values, number: `RK-${yy}-${String(next).padStart(4, '0')}`, createdById: Number(user.id), createdByName: user.name, createdAt: new Date() })
    .returning()
  return { id: String(row.id), number: row.number }
}

export async function setComplaintStatus(
  user: SessionUser,
  d: { id: string; status: ComplaintStatus; resolution?: string; resolutionNote?: string },
) {
  if (!STATUS_LABEL[d.status]) throw new Error('Nepoznat status.')
  const closing = d.status === 'rijesena' || d.status === 'odbijena'
  if (closing && !isFull(user.role) && user.role !== 'voditelj')
    throw new Error('Reklamaciju zatvara voditelj salona ili uprava.')
  if (closing && !d.resolution) throw new Error('Odaberite rješenje.')
  await db
    .update(t.complaints)
    .set({
      status: d.status,
      resolution: closing ? (d.resolution ?? '') : '',
      resolutionNote: (d.resolutionNote ?? '').slice(0, 2000),
      closedAt: closing ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(t.complaints.id, Number(d.id)))
}

export async function addComplaintPhoto(id: string, upload: ProductImageUpload) {
  const cid = Number(id)
  const [c] = await db.select({ id: t.complaints.id }).from(t.complaints).where(eq(t.complaints.id, cid))
  if (!c) throw new Error('Reklamacija nije pronađena.')
  const n = await db.select({ id: t.complaintPhotos.id }).from(t.complaintPhotos).where(eq(t.complaintPhotos.complaintId, cid))
  if (n.length >= 8) throw new Error('Najviše 8 fotografija po reklamaciji.')
  const { decodeImage } = await import('./images')
  const img = decodeImage(upload.image)
  const th = decodeImage(upload.thumb)
  await db.transaction(async (tx) => {
    const [a] = await tx.insert(t.files).values({ name: `reklamacija-${cid}.jpg`, mime: upload.image.mime, size: img.length, data: img }).returning()
    const [b] = await tx.insert(t.files).values({ name: `reklamacija-${cid}-mala.jpg`, mime: upload.thumb.mime, size: th.length, data: th }).returning()
    await tx.insert(t.complaintPhotos).values({ complaintId: cid, imageId: a.id, thumbId: b.id })
  })
}

export async function deleteComplaintPhoto(imageId: string) {
  const [p] = await db.select().from(t.complaintPhotos).where(eq(t.complaintPhotos.imageId, Number(imageId)))
  if (!p) return
  await db.transaction(async (tx) => {
    await tx.delete(t.complaintPhotos).where(eq(t.complaintPhotos.id, p.id))
    await tx.delete(t.files).where(inArray(t.files.id, [p.imageId, p.thumbId]))
  })
}

export async function deleteComplaint(user: SessionUser, id: string) {
  if (!isFull(user.role)) throw new Error('Reklamaciju može obrisati samo uprava.')
  const cid = Number(id)
  const ph = await db.select().from(t.complaintPhotos).where(eq(t.complaintPhotos.complaintId, cid))
  await db.transaction(async (tx) => {
    await tx.delete(t.complaints).where(eq(t.complaints.id, cid))
    if (ph.length) await tx.delete(t.files).where(inArray(t.files.id, ph.flatMap((p) => [p.imageId, p.thumbId])))
  })
}

const dateBa = (iso: string | null) => {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}.`
}

/** Zapisnik o reklamaciji za potpis kupca. */
export async function complaintPdf(id: string) {
  const { complaints } = await listComplaints()
  const c = complaints.find((x) => x.id === id)
  if (!c) throw new Error('Reklamacija nije pronađena.')
  const [cust] = c.customerId ? await db.select().from(t.customers).where(eq(t.customers.id, Number(c.customerId))) : []
  const company = await getCompany()
  const L = await Letter.create(company, `Reklamacija ${c.number}`)
  L.newPage({ title: 'ZAPISNIK O REKLAMACIJI', number: c.number, meta: [`Datum prijave: ${dateBa(c.date)}`, `Rok za rješenje: ${dateBa(c.dueDate)}`, `Zaprimio/la: ${c.createdByName}`] })
  L.boxes([
    { title: 'KUPAC', lines: [c.customerName, [cust?.address, cust?.city].filter(Boolean).join(', '), c.customerPhone ? `Tel: ${c.customerPhone}` : ''] },
    { title: 'PREDMET REKLAMACIJE', lines: [c.productName || '—', c.orderNumber ? `Narudžba ${c.orderNumber}` : 'Bez broja narudžbe', `Vrsta: ${KIND_LABEL[c.kind]}`] },
  ])
  L.heading('Opis nedostatka', 'kako ga je opisao kupac')
  L.paragraph(c.description, 10)
  if (c.photos.length) L.paragraph(`Uz reklamaciju je priloženo fotografija: ${c.photos.length}.`, 8)
  L.heading('Zahtjev kupca')
  L.checklist(['Popravak', 'Zamjena robe', 'Povrat novca', 'Umanjenje cijene'], 4)
  if (c.status === 'rijesena' || c.status === 'odbijena') {
    L.heading('Rješenje')
    L.boxes([{ title: STATUS_LABEL[c.status].toUpperCase(), lines: [RESOLUTION_LABEL[c.resolution] ?? c.resolution, c.resolutionNote.slice(0, 120), c.closedAt ? `Zatvoreno: ${dateBa(c.closedAt)}` : ''] }], 58)
  } else L.fillLines(['Mišljenje salona / dobavljača', 'Predloženo rješenje'], 1)
  L.paragraph('Kupac potpisom potvrđuje da je reklamacija zaprimljena s navedenim opisom. Salon će kupca obavijestiti o rješenju u dogovorenom roku.', 8)
  L.signatures(['Za salon (ime i potpis)', 'Kupac (čitko ime, prezime i potpis)'])
  return { name: `Reklamacija ${c.number}.pdf`, data: Buffer.from(await L.save()).toString('base64') }
}

/** Otvorene reklamacije kojima je prošao rok (za zvonce). */
export async function overdueCount(today: string) {
  const rows = await db
    .select({ due: t.complaints.dueDate })
    .from(t.complaints)
    .where(and(inArray(t.complaints.status, ['prijavljena', 'u_obradi', 'kod_dobavljaca'])))
  return { open: rows.length, overdue: rows.filter((r) => r.due && r.due < today).length }
}
