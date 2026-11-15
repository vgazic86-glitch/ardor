/**
 * Početno punjenje baze primjernim podacima (samo jednom, kad je baza prazna).
 * Voditelj ih može obrisati u Postavkama i krenuti s pravim unosom.
 */
import { sql } from 'drizzle-orm'
import type { Tx } from './index.js'
import * as t from './schema.js'

const employeeSeed = [
  { id: 1, name: 'Amra Hadžić', role: 'Voditelj salona', initials: 'AH', color: '#7c4a2d', monthlyTarget: 28000, commissionRate: 0.03, phone: '061 223 410' },
  { id: 2, name: 'Marko Jurić', role: 'Prodavač', initials: 'MJ', color: '#4f6b4a', monthlyTarget: 22000, commissionRate: 0.04, phone: '062 118 905' },
  { id: 3, name: 'Lejla Kovač', role: 'Prodavač', initials: 'LK', color: '#b07a3b', monthlyTarget: 22000, commissionRate: 0.04, phone: '061 774 032' },
  { id: 4, name: 'Ivan Petrović', role: 'Prodavač', initials: 'IP', color: '#3f5c78', monthlyTarget: 18000, commissionRate: 0.04, phone: '063 502 671' },
  { id: 5, name: 'Dino Mehić', role: 'Dostava i montaža', initials: 'DM', color: '#6b5b73', monthlyTarget: 0, commissionRate: 0, phone: '061 960 118' },
  { id: 6, name: 'Saša Babić', role: 'Dostava i montaža', initials: 'SB', color: '#8a6d4f', monthlyTarget: 0, commissionRate: 0, phone: '062 431 287' },
]

const supplierSeed = [
  { id: 1, name: 'Tapetarija Lux', phone: '033 456 120', email: 'narudzbe@tapetarija-lux.ba', leadTimeDays: 21 },
  { id: 2, name: 'Stolarija Hrast', phone: '032 441 870', email: 'prodaja@stolarija-hrast.ba', leadTimeDays: 30 },
  { id: 3, name: 'Drvoprerada Bosna', phone: '033 612 044', email: 'info@drvoprerada.ba', leadTimeDays: 21 },
  { id: 4, name: 'Dream Line', phone: '035 300 210', email: 'b2b@dreamline.ba', leadTimeDays: 7 },
  { id: 5, name: 'Office Pro', phone: '033 718 556', email: 'office@officepro.ba', leadTimeDays: 10 },
  { id: 6, name: 'Lumen d.o.o.', phone: '036 551 090', email: 'lumen@lumen.ba', leadTimeDays: 10 },
]

// stock = ciljno današnje stanje
const productSeed = [
  { id: 1, sku: 'SG-101', name: 'Kutna garnitura Oslo', category: 'Sjedeće garniture', price: 2890, stock: 4, minStock: 2, supplierId: 1 },
  { id: 2, sku: 'SG-114', name: 'Trosjed Milano, baršun', category: 'Sjedeće garniture', price: 1640, stock: 1, minStock: 2, supplierId: 1 },
  { id: 3, sku: 'SG-120', name: 'Fotelja Bergen', category: 'Sjedeće garniture', price: 620, stock: 9, minStock: 4, supplierId: 1 },
  { id: 4, sku: 'KU-200', name: 'Kuhinja Ardor Linea 3,2 m', category: 'Kuhinje', price: 5980, stock: 0, minStock: 0, supplierId: 2 },
  { id: 5, sku: 'KU-210', name: 'Kuhinjski otok Natura', category: 'Kuhinje', price: 2450, stock: 2, minStock: 1, supplierId: 2 },
  { id: 6, sku: 'SP-300', name: 'Bračni krevet Luna 160×200', category: 'Spavaće sobe', price: 1290, stock: 6, minStock: 3, supplierId: 3 },
  { id: 7, sku: 'SP-305', name: 'Ormar klizni Nova 250 cm', category: 'Spavaće sobe', price: 1860, stock: 2, minStock: 2, supplierId: 3 },
  { id: 8, sku: 'SP-312', name: 'Madrac Comfort Plus 160×200', category: 'Spavaće sobe', price: 740, stock: 12, minStock: 5, supplierId: 4 },
  { id: 9, sku: 'BL-400', name: 'Trpezarijski stol Hrast 200', category: 'Blagovaonice', price: 1480, stock: 3, minStock: 2, supplierId: 2 },
  { id: 10, sku: 'BL-410', name: 'Stolica Vera (komad)', category: 'Blagovaonice', price: 185, stock: 22, minStock: 12, supplierId: 2 },
  { id: 11, sku: 'UR-500', name: 'Radni stol Focus', category: 'Uredski namještaj', price: 540, stock: 5, minStock: 3, supplierId: 5 },
  { id: 12, sku: 'UR-510', name: 'Ergonomska stolica Flex', category: 'Uredski namještaj', price: 390, stock: 2, minStock: 4, supplierId: 5 },
  { id: 13, sku: 'DK-600', name: 'Podna lampa Arc', category: 'Dekor i rasvjeta', price: 260, stock: 8, minStock: 3, supplierId: 6 },
  { id: 14, sku: 'DK-610', name: 'Tepih Berber 200×300', category: 'Dekor i rasvjeta', price: 480, stock: 0, minStock: 2, supplierId: 6 },
].map((p) => ({ ...p, purchasePrice: Math.round((p.price / 1.17) * 0.58) }))

const cities = ['Sarajevo', 'Zenica', 'Visoko', 'Kakanj', 'Ilidža', 'Vogošća', 'Tuzla', 'Mostar']
const streets = ['Zmaja od Bosne', 'Titova', 'Ferhadija', 'Branilaca', 'Hamdije Kreševljakovića', 'Safeta Hadžića', 'Džemala Bijedića', 'Obala Kulina bana', 'Mehmeda Spahe', 'Alipašina']
const firstNames = ['Emina', 'Haris', 'Selma', 'Nedim', 'Ana', 'Tarik', 'Maja', 'Kenan', 'Jasmina', 'Adnan', 'Nina', 'Edin', 'Sara', 'Mirza', 'Ivana', 'Damir', 'Lana', 'Faruk', 'Merima', 'Josip']
const lastNames = ['Begić', 'Delić', 'Hodžić', 'Marić', 'Kapetanović', 'Šehić', 'Novak', 'Omerović', 'Ramić', 'Tomić', 'Halilović', 'Knežević']

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

export function addDays(iso: string, days: number) {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function seedDemo(tx: Tx, today: string) {
  const rand = rng(20261113)
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)]
  const salesIds = [1, 2, 3, 4]
  const driverIds = [5, 6]
  const assemblyCats = ['Kuhinje', 'Spavaće sobe', 'Sjedeće garniture']

  const customers = Array.from({ length: 48 }, (_, i) => {
    const first = pick(firstNames)
    const last = pick(lastNames)
    return {
      id: i + 1,
      name: `${first} ${last}`,
      phone: `06${1 + Math.floor(rand() * 3)} ${100 + Math.floor(rand() * 899)} ${100 + Math.floor(rand() * 899)}`,
      email: `${first}.${last}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace('đ', 'd') + '@mail.ba',
      city: pick(cities),
      address: `${pick(streets)} ${1 + Math.floor(rand() * 120)}`,
    }
  })

  const orders: (typeof t.orders.$inferInsert)[] = []
  const items: (typeof t.orderItems.$inferInsert)[] = []
  const pays: (typeof t.payments.$inferInsert)[] = []
  const dels: (typeof t.deliveries.$inferInsert)[] = []
  const moves: (typeof t.stockMovements.$inferInsert)[] = []
  const issuedQty = new Map<number, number>()
  const cost = (pid: number) => productSeed.find((p) => p.id === pid)!.purchasePrice

  const seasonal = [1.25, 0.7, 0.8, 1.0, 1.05, 0.95, 0.85, 0.8, 1.1, 1.2, 1.3, 1.0]
  let n = 1
  for (let back = 364; back >= 0; back--) {
    const date = addDays(today, -back)
    const month = Number(date.slice(5, 7)) - 1
    const weekday = new Date(date + 'T12:00:00Z').getUTCDay()
    if (weekday === 0) continue
    const expected = 0.55 * seasonal[month] * (weekday === 6 ? 1.8 : 1)
    const count = rand() < expected ? (rand() < 0.25 ? 2 : 1) : 0
    for (let k = 0; k < count; k++) {
      const seller = salesIds[Math.floor(Math.pow(rand(), 1.15) * salesIds.length)]
      const lines = 1 + Math.floor(rand() * 3)
      const its: { productId: number; qty: number; unitPrice: number; discountPct: number }[] = []
      for (let l = 0; l < lines; l++) {
        const p = pick(productSeed)
        if (its.some((i) => i.productId === p.id)) continue
        its.push({ productId: p.id, qty: p.id === 10 ? 4 + Math.floor(rand() * 3) * 2 : 1, unitPrice: p.price, discountPct: rand() < 0.3 ? pick([5, 10, 15]) : 0 })
      }
      const age = back
      let status: string
      if (rand() < 0.04) status = 'otkazana'
      else if (age > 40) status = 'isporučena'
      else if (age > 25) status = rand() < 0.7 ? 'isporučena' : 'spremna'
      else if (age > 10) status = pick(['u_izradi', 'spremna', 'potvrđena', 'isporučena'])
      else status = pick(['ponuda', 'potvrđena', 'potvrđena', 'u_izradi'])

      const total = its.reduce((s, i) => s + i.qty * i.unitPrice * (1 - i.discountPct / 100), 0)
      const customer = pick(customers)
      const paymentMethod = pick(['Gotovina', 'Kartica', 'Kartica', 'Virman', 'Rate'])
      const paid =
        status === 'isporučena' ? total : status === 'ponuda' || status === 'otkazana' ? 0 : Math.round(total * pick([0.3, 0.5, 0.5, 1]))

      const needsDelivery = status !== 'ponuda' && status !== 'otkazana' && rand() < 0.85
      let issuedAt: string | null = null
      if (needsDelivery) {
        const offset = 7 + Math.floor(rand() * 28)
        let dDate = addDays(date, offset)
        if (status !== 'isporučena' && dDate < today) dDate = addDays(today, Math.floor(rand() * 12))
        if (status === 'isporučena' && dDate > today) dDate = today
        const dStatus =
          status === 'isporučena' ? 'dostavljeno' : dDate === today ? (rand() < 0.5 ? 'u_putu' : 'zakazana') : rand() < 0.08 ? 'odgođena' : 'zakazana'
        dels.push({
          orderId: n,
          date: dDate,
          slot: pick(['08–12', '12–16', '16–20']),
          address: customer.address,
          city: customer.city,
          driverId: pick(driverIds),
          assembly: its.some((i) => assemblyCats.includes(productSeed.find((p) => p.id === i.productId)!.category)),
          status: dStatus,
        })
        if (dStatus === 'dostavljeno' || dStatus === 'u_putu') issuedAt = dDate
      } else if (status === 'isporučena') {
        issuedAt = addDays(date, Math.min(age, 3))
      }

      if (issuedAt) {
        for (const i of its) {
          moves.push({ productId: i.productId, date: issuedAt, type: 'izlaz', qty: -i.qty, unitCost: cost(i.productId), orderId: n, employeeId: seller })
          issuedQty.set(i.productId, (issuedQty.get(i.productId) ?? 0) + i.qty)
        }
      }
      if (paid > 0) pays.push({ orderId: n, date, amount: Math.round(paid * 100) / 100, method: paymentMethod, employeeId: seller })

      orders.push({
        id: n,
        number: `ARD-${date.slice(2, 4)}-${String(n).padStart(4, '0')}`,
        date,
        customerId: customer.id,
        employeeId: seller,
        status,
        paymentMethod,
        note:
          rand() < 0.2
            ? pick(['Kupac traži dostavu poslije 17h.', 'Boja tkanine: maslinasta.', 'Stari namještaj odnijeti.', 'Treći sprat, bez lifta.', 'Kontaktirati prije dolaska.'])
            : '',
        issuedAt,
      })
      for (const i of its) items.push({ orderId: n, ...i })
      n++
    }
  }

  // Prijemi robe u zadnja tri mjeseca
  const receipts: (typeof t.receipts.$inferInsert)[] = []
  const receivedQty = new Map<number, number>()
  let r = 1
  for (const back of [84, 63, 41, 26, 12, 4]) {
    const date = addDays(today, -back)
    const supplierId = supplierSeed[r % supplierSeed.length].id
    receipts.push({ id: r, number: `PR-${date.slice(2, 4)}-${String(r).padStart(4, '0')}`, date, supplierId, documentNumber: `RN ${1000 + r * 37}/${date.slice(2, 4)}`, employeeId: 1 })
    for (const p of productSeed.filter((p) => p.supplierId === supplierId)) {
      const qty = p.id === 10 ? 12 : 2
      moves.push({ productId: p.id, date, type: 'primka', qty, unitCost: p.purchasePrice, receiptId: r, employeeId: 1, note: '' })
      receivedQty.set(p.id, (receivedQty.get(p.id) ?? 0) + qty)
    }
    r++
  }

  // Početno stanje tako da današnje stanje odgovara ciljanom
  const opening = addDays(today, -365)
  for (const p of productSeed) {
    const qty = p.stock + (issuedQty.get(p.id) ?? 0) - (receivedQty.get(p.id) ?? 0)
    if (qty > 0) moves.push({ productId: p.id, date: opening, type: 'pocetno', qty, unitCost: p.purchasePrice, note: 'Početno stanje' })
    else if (qty < 0) moves.push({ productId: p.id, date: opening, type: 'korekcija', qty, unitCost: p.purchasePrice, note: 'Usklađivanje' })
  }

  await tx.insert(t.employees).values(employeeSeed)
  await tx.insert(t.suppliers).values(supplierSeed)
  await tx.insert(t.products).values(productSeed.map(({ stock: _s, ...p }) => p))
  await tx.insert(t.customers).values(customers)
  const chunk = async <T,>(rows: T[], fn: (part: T[]) => Promise<unknown>) => {
    for (let i = 0; i < rows.length; i += 400) await fn(rows.slice(i, i + 400))
  }
  await chunk(orders, (p) => tx.insert(t.orders).values(p))
  await chunk(items, (p) => tx.insert(t.orderItems).values(p))
  await chunk(pays, (p) => tx.insert(t.payments).values(p))
  await chunk(dels, (p) => tx.insert(t.deliveries).values(p))
  if (receipts.length) await tx.insert(t.receipts).values(receipts)
  await chunk(moves, (p) => tx.insert(t.stockMovements).values(p))

  for (const table of ['employees', 'suppliers', 'products', 'customers', 'orders', 'receipts']) {
    await tx.execute(sql.raw(`select setval(pg_get_serial_sequence('${table}', 'id'), coalesce((select max(id) from ${table}), 0) + 1, false)`))
  }
}
