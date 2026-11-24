/**
 * Narudžbe s web stranice (košarica, bez plaćanja karticom).
 * Kupac pošalje artikle za web + podatke; cijene računa server iz web_items. Narudžba stiže u
 * Web stranica → Narudžbe, trgovac je potvrdi telefonom i iz nje napravi prodaju.
 */
import { desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'
import {
  makeLimiter, priceWebOrder, validateWebOrder, webOrderNumber,
  WEB_DELIVERY, WEB_ORDER_STATUS, WEB_PAYMENT, type WebOrderLine, type WebOrderStatus,
} from '../lib/web'
import type { SessionUser } from './auth'
import { mailReady, sendMail } from './mail'
import { salesUserIds, splitIds } from './web'

const orderLimit = makeLimiter(5, 10 * 60_000)
const FROM = () => process.env.NARUDZBE_OD || 'ARDOR namještaj <narudzbe@ardornamjestaj.com>'
const SALON_PHONE = '066 277 222'
const WEB = () => (process.env.WEB_URL || 'https://www.ardornamjestaj.com').replace(/\/$/, '')

const km = (n: number) => {
  const [i, d] = (Math.round(n * 100) / 100).toFixed(2).split('.')
  return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${d === '00' ? '' : ',' + d} KM`
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export async function createWebOrder(body: unknown, ip: string) {
  if (!orderLimit(ip || 'nepoznato')) return { status: 429, error: `Previše narudžbi u kratkom vremenu. Nazovi nas na ${SALON_PHONE}.` }
  const res = validateWebOrder((body && typeof body === 'object' ? body : {}) as Record<string, unknown>)
  if ('error' in res) {
    // Botovima ne javljamo da su uhvaćeni.
    if (res.error === 'spam') return { status: 200, ok: true, number: webOrderNumber(0) }
    return { status: 400, error: res.error }
  }
  const v = res.ok
  const rows = await db.select().from(t.webItems).where(inArray(t.webItems.id, v.lines.map((l) => l.itemId)))
  const priced = priceWebOrder(v.lines, rows.map((r) => ({ id: r.id, name: r.name, slug: r.slug, room: r.room, price: r.price, visible: r.visible, hasImage: splitIds(r.imageIds).length > 0 })))
  if ('error' in priced) return { status: 409, error: priced.error }
  const { lines, total } = priced.ok
  const [row] = await db
    .insert(t.webOrders)
    .values({ at: new Date(), name: v.name, phone: v.phone, email: v.email, city: v.city, address: v.address, delivery: v.delivery, payment: v.payment, message: v.message, lines: JSON.stringify(lines), total, ip: ip.slice(0, 60) })
    .returning()
  const number = webOrderNumber(row.id)
  try {
    const ids = await salesUserIds()
    const pieces = lines.reduce((s, l) => s + l.qty, 0)
    if (ids.length)
      await db.insert(t.notifications).values(ids.map((userId) => ({
        userId,
        at: new Date(),
        title: `Web narudžba ${number} — ${v.name} · ${km(total)}`.slice(0, 120),
        text: `${pieces} kom: ${lines.map((l) => l.name).join(', ')}. ${WEB_PAYMENT[v.payment]}. Otvori „Web stranica” → Narudžbe i nazovi kupca.`.slice(0, 300),
      })))
  } catch (e) {
    console.error('Web narudžba: obavijest nije upisana', e)
  }
  if (v.email && mailReady()) {
    // Potvrda kupcu ne smije srušiti narudžbu — ako ne prođe, trgovac ionako zove.
    sendMail({ from: FROM(), to: [v.email], ...confirmationMail(number, v.name, lines, total, v.delivery, v.payment) })
      .then(() => db.update(t.webOrders).set({ emailSent: true }).where(eq(t.webOrders.id, row.id)))
      .catch((e) => console.error('Web narudžba: potvrda e-poštom nije poslana', e))
  }
  return { status: 200, ok: true, number }
}

/** Potvrda prijema za kupca (nije konačna potvrda: dostupnost, rok i dostavu potvrđujemo pozivom). */
export function confirmationMail(number: string, name: string, lines: WebOrderLine[], total: number, delivery: string, payment: string) {
  const first = name.split(' ')[0]
  const subject = `ARDOR: zaprimili smo narudžbu ${number}`
  const next = [
    'Javit ćemo ti se telefonom najkasnije sljedeći radni dan da potvrdimo dostupnost, rok isporuke i trošak dostave.',
    payment === 'predracun' ? 'Nakon potvrde šaljemo predračun za uplatu na račun.' : '',
    payment === 'rate' ? 'Za plaćanje na rate dogovorit ćemo s tobom dokumentaciju za partnerski kredit.' : '',
    'Ovo je potvrda prijema narudžbe — kupoprodaja je zaključena tek kad je potvrdimo.',
  ].filter(Boolean)
  const text = [
    `Zdravo ${first},`, '', `hvala na narudžbi ${number}.`, '',
    ...lines.map((l) => `- ${l.name} × ${l.qty} — ${km(l.price * l.qty)}`),
    `Ukupno (s PDV-om): ${km(total)}`, '',
    `Preuzimanje: ${WEB_DELIVERY[delivery as keyof typeof WEB_DELIVERY] ?? delivery}`,
    `Plaćanje: ${WEB_PAYMENT[payment as keyof typeof WEB_PAYMENT] ?? payment}`, '',
    ...next, '', `Pitanja: ${SALON_PHONE} (poziv, Viber, WhatsApp).`, '', 'ARDOR namještaj, Vojvode Pere Krece 21, Banja Luka', WEB(),
  ].join('\n')
  const row = (l: WebOrderLine) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #eee"><a href="${WEB()}/namjestaj/${esc(l.room)}/${esc(l.slug)}/" style="color:#222;text-decoration:none">${esc(l.name)}</a> × ${l.qty}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${km(l.price * l.qty)}</td></tr>`
  const html = `<!doctype html><html lang="bs"><body style="margin:0;background:#f4f2ef;font-family:Ubuntu,Arial,sans-serif;color:#222">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
<div style="font-size:22px;font-weight:bold;color:#F15A29;letter-spacing:1px">ARDOR</div>
<div style="background:#fff;border-radius:12px;padding:24px;margin-top:14px">
<h1 style="font-size:20px;margin:0 0 6px">Hvala, ${esc(first)}!</h1>
<p style="margin:0 0 16px;color:#58595B">Zaprimili smo tvoju narudžbu <b>${number}</b>.</p>
<table style="width:100%;border-collapse:collapse;font-size:15px">${lines.map(row).join('')}
<tr><td style="padding:10px 0;font-weight:bold">Ukupno (s PDV-om)</td><td style="padding:10px 0;text-align:right;font-weight:bold;white-space:nowrap">${km(total)}</td></tr></table>
<p style="font-size:14px;color:#58595B;margin:14px 0 0">${esc(WEB_DELIVERY[delivery as keyof typeof WEB_DELIVERY] ?? delivery)} · ${esc(WEB_PAYMENT[payment as keyof typeof WEB_PAYMENT] ?? payment)}</p>
${next.map((n) => `<p style="font-size:14px;margin:12px 0 0">${esc(n)}</p>`).join('')}
<p style="font-size:14px;margin:16px 0 0">Pitanja: <b>${SALON_PHONE}</b> (poziv, Viber, WhatsApp).</p>
</div>
<p style="font-size:12px;color:#888;margin:14px 4px">ARDOR namještaj · Vojvode Pere Krece 21, Banja Luka · <a href="${WEB()}" style="color:#888">${WEB().replace(/^https?:\/\//, '')}</a></p>
</div></body></html>`
  return { subject, html, text }
}

/* ───────────────────────── u aplikaciji ───────────────────────── */

export interface WebOrderRow {
  id: string
  number: string
  at: string
  name: string
  phone: string
  email: string
  city: string
  address: string
  delivery: string
  payment: string
  message: string
  lines: WebOrderLine[]
  total: number
  status: string
  handledBy: string
  note: string
  orderId: string | null
  orderNumber: string | null
  emailSent: boolean
}

export async function listWebOrders(): Promise<WebOrderRow[]> {
  const rows = await db.select().from(t.webOrders).orderBy(desc(t.webOrders.at)).limit(300)
  const oids = rows.map((r) => r.orderId).filter((x): x is number => !!x)
  const nums = oids.length ? await db.select({ id: t.orders.id, number: t.orders.number }).from(t.orders).where(inArray(t.orders.id, oids)) : []
  return rows.map((r) => {
    let lines: WebOrderLine[] = []
    try { lines = JSON.parse(r.lines) } catch { /* prazno */ }
    return {
      id: String(r.id), number: webOrderNumber(r.id), at: r.at.toISOString(), name: r.name, phone: r.phone, email: r.email, city: r.city,
      address: r.address, delivery: r.delivery, payment: r.payment, message: r.message, lines, total: r.total, status: r.status,
      handledBy: r.handledBy, note: r.note, orderId: r.orderId ? String(r.orderId) : null,
      orderNumber: nums.find((n) => n.id === r.orderId)?.number ?? null, emailSent: r.emailSent,
    }
  })
}

export async function setWebOrderStatus(user: SessionUser, input: { id: string; status: string; note?: string; orderId?: string | null }) {
  const status = (input.status in WEB_ORDER_STATUS ? input.status : 'nova') as WebOrderStatus
  const [old] = await db.select().from(t.webOrders).where(eq(t.webOrders.id, Number(input.id)))
  if (!old) throw new Error('Web narudžba nije pronađena.')
  const orderId = input.orderId ? Number(input.orderId) : undefined
  await db
    .update(t.webOrders)
    .set({
      status,
      handledBy: user.name,
      ...(input.note !== undefined ? { note: input.note.trim().slice(0, 1000) } : {}),
      ...(orderId && Number.isInteger(orderId) ? { orderId } : {}),
    })
    .where(eq(t.webOrders.id, old.id))
}

