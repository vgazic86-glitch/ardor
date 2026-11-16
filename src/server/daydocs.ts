/** Dnevni dokumenti: zaključak pazara i plan dostava (skladište, dostavljači, potvrde o preuzimanju za kupce). */
import type { Order, Snapshot } from '../lib/types'
import { itemsTotal } from '../lib/types'
import { isFull, type SessionUser } from './auth'
import { Letter, type Col } from './letter'
import { loadSnapshot } from './logic'
import { getCompany } from './ops'

const DAYS = ['nedjelja', 'ponedjeljak', 'utorak', 'srijeda', 'četvrtak', 'petak', 'subota']
const dateBa = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}.`
}
const dayName = (iso: string) => DAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()]
const km = (v: number) => {
  const [i, d] = Math.abs(v).toFixed(2).split('.')
  return `${v < 0 ? '-' : ''}${i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${d} KM`
}
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)
const out = (name: string, bytes: Uint8Array) => ({ name, data: Buffer.from(bytes).toString('base64') })

function canCashUp(user: SessionUser) {
  if (!(isFull(user.role) || user.role === 'voditelj')) throw new Error('Dnevni zaključak rade uprava i voditelj salona.')
}
function canDeliveries(user: SessionUser) {
  if (user.role === 'trgovac') throw new Error('Plan dostava štampa voditelj, skladište ili uprava.')
}

/* ───────────────────────── dnevni zaključak ───────────────────────── */

export async function cashUpPdf(user: SessionUser, day: string) {
  canCashUp(user)
  if (!isDate(day)) throw new Error('Neispravan datum.')
  const s = await loadSnapshot()
  const company = await getCompany()
  const emp = new Map(s.employees.map((e) => [e.id, e.name]))
  const cus = new Map(s.customers.map((c) => [c.id, c.name]))
  const pays = s.orders
    .flatMap((o) => o.payments.map((p) => ({ p, o })))
    .filter((x) => x.p.date === day)
    .sort((a, b) => a.p.method.localeCompare(b.p.method) || a.o.number.localeCompare(b.o.number))
  const methods = ['Gotovina', 'Kartica', 'Virman', 'Rate'] as const
  const sum = (m?: string) => pays.filter((x) => !m || x.p.method === m).reduce((a, x) => a + x.p.amount, 0)
  const sold = s.orders.filter((o) => o.date === day && o.status !== 'ponuda' && o.status !== 'otkazana')
  const offers = s.orders.filter((o) => o.date === day && o.status === 'ponuda')
  const issued = s.orders.filter((o) => o.issuedAt === day)

  const L = await Letter.create(company, `Dnevni zaključak ${dateBa(day)}`)
  L.newPage({ title: 'DNEVNI ZAKLJUČAK', number: dateBa(day), meta: [`${dayName(day).charAt(0).toUpperCase()}${dayName(day).slice(1)}`, `Pripremio/la: ${user.name}`] })
  L.tiles([
    { label: 'Ukupno uplaćeno', value: km(sum()), hint: `${pays.length} uplata` },
    ...methods.map((m) => ({ label: m, value: km(sum(m)), hint: `${pays.filter((x) => x.p.method === m).length} uplata` })),
  ])

  L.heading('Uplate dana', 'avansi i naplate po narudžbama')
  if (!pays.length) L.paragraph('Za ovaj dan nema evidentiranih uplata.', 9, undefined)
  else {
    const cols: Col[] = [
      { key: 'rb', label: 'R.br.', w: 30 },
      { key: 'method', label: 'Način', w: 62, bold: true },
      { key: 'order', label: 'Narudžba', w: 80 },
      { key: 'customer', label: 'Kupac', w: 0 },
      { key: 'by', label: 'Primio/la', w: 92 },
      { key: 'amount', label: 'Iznos', w: 80, align: 'r', bold: true },
    ]
    L.table(
      cols,
      pays.map(({ p, o }, i) => ({
        rb: `${i + 1}.`,
        method: p.method,
        order: o.number,
        customer: cus.get(o.customerId) ?? '',
        by: p.employeeId ? (emp.get(p.employeeId) ?? '') : '—',
        amount: km(p.amount),
      })),
      { footer: { customer: 'Ukupno', amount: km(sum()) } },
    )
  }

  L.heading('Promet dana')
  L.table(
    [
      { key: 'k', label: 'Stavka', w: 0 },
      { key: 'n', label: 'Broj', w: 70, align: 'r' },
      { key: 'v', label: 'Vrijednost', w: 110, align: 'r' },
    ],
    [
      { k: 'Nove narudžbe (zaključene prodaje)', n: String(sold.length), v: km(sold.reduce((a, o) => a + itemsTotal(o.items), 0)) },
      { k: 'Nove ponude', n: String(offers.length), v: km(offers.reduce((a, o) => a + itemsTotal(o.items), 0)) },
      { k: 'Roba izašla iz salona', n: String(issued.length), v: km(issued.reduce((a, o) => a + itemsTotal(o.items), 0)) },
    ],
  )

  L.heading('Predaja gotovine')
  L.boxes(
    [
      { title: 'GOTOVINA PO EVIDENCIJI', lines: [km(sum('Gotovina')), `${pays.filter((x) => x.p.method === 'Gotovina').length} gotovinskih uplata`] },
      { title: 'PREBROJANO U KASI', lines: ['________________ KM', 'razlika: ________________ KM'] },
    ],
    56,
  )
  L.fillLines(['Broj fiskalnog izvještaja (Z)', 'Napomena'])
  L.signatures(['Predao/la (ime i potpis)', 'Primio/la (ime i potpis)'])
  return out(`Dnevni zakljucak ${day}.pdf`, await L.save())
}

/* ───────────────────────── plan dostava ───────────────────────── */

interface Stop {
  o: Order
  customer: Snapshot['customers'][number] | undefined
  driver: string
  driverName: string
  due: number
}

function stopsFor(s: Snapshot, day: string): Stop[] {
  const emp = new Map(s.employees.map((e) => [e.id, e.name]))
  const cus = new Map(s.customers.map((c) => [c.id, c]))
  return s.orders
    .filter((o) => o.delivery && o.delivery.date === day && o.status !== 'otkazana' && o.delivery.status !== 'dostavljeno')
    .map((o) => ({
      o,
      customer: cus.get(o.customerId),
      driver: o.delivery!.driverId,
      driverName: emp.get(o.delivery!.driverId) ?? 'Bez vozača',
      due: Math.max(0, itemsTotal(o.items) - o.paid),
    }))
    .sort((a, b) => a.driverName.localeCompare(b.driverName, 'bs') || a.o.delivery!.slot.localeCompare(b.o.delivery!.slot) || a.o.delivery!.city.localeCompare(b.o.delivery!.city, 'bs'))
}

export type DeliveryDoc = 'skladiste' | 'dostavljaci' | 'potvrde'

export async function deliveryPlanPdf(user: SessionUser, day: string, kind: DeliveryDoc) {
  canDeliveries(user)
  if (!isDate(day)) throw new Error('Neispravan datum.')
  const s = await loadSnapshot()
  const company = await getCompany()
  const stops = stopsFor(s, day)
  if (!stops.length) throw new Error(`Za ${dateBa(day)} nema zakazanih dostava.`)
  const prod = new Map(s.products.map((p) => [p.id, p]))
  const drivers = [...new Set(stops.map((x) => x.driver))]
  const meta = [`${dayName(day).charAt(0).toUpperCase()}${dayName(day).slice(1)}, ${dateBa(day)}`, `${stops.length} dostava · ${drivers.length} ${drivers.length === 1 ? 'vozač' : 'vozača'}`]
  const itemLines = (o: Order) => o.items.map((i) => `${i.qty} × ${prod.get(i.productId)?.name ?? 'artikal'}`)

  if (kind === 'skladiste') {
    const L = await Letter.create(company, `Plan dostava – skladište ${dateBa(day)}`)
    L.newPage({ title: 'PLAN DOSTAVA – SKLADIŠTE', number: dateBa(day), meta })
    const pieces = stops.reduce((a, x) => a + x.o.items.reduce((b, i) => b + i.qty, 0), 0)
    L.tiles([
      { label: 'Dostava', value: String(stops.length), hint: dayName(day) },
      { label: 'Vozača', value: String(drivers.length) },
      { label: 'Komada za utovar', value: String(pieces) },
      { label: 'S montažom', value: String(stops.filter((x) => x.o.delivery!.assembly).length) },
    ])
    // zbirna lista za pripremu
    const pick = new Map<string, { qty: number; by: Map<string, number> }>()
    for (const st of stops)
      for (const i of st.o.items) {
        const e = pick.get(i.productId) ?? { qty: 0, by: new Map() }
        e.qty += i.qty
        e.by.set(st.driverName, (e.by.get(st.driverName) ?? 0) + i.qty)
        pick.set(i.productId, e)
      }
    L.heading('1. Zbirno za pripremu', 'svi artikli za taj dan')
    L.table(
      [
        { key: 'sku', label: 'Šifra', w: 64 },
        { key: 'name', label: 'Artikal', w: 0 },
        { key: 'qty', label: 'Kom.', w: 40, align: 'r', bold: true },
        { key: 'stock', label: 'Na stanju', w: 54, align: 'r' },
        { key: 'by', label: 'Po vozaču', w: 120 },
        { key: 'ok', label: 'Spremno', w: 46, check: true },
      ],
      [...pick.entries()]
        .map(([pid, e]) => ({ p: prod.get(pid), e }))
        .sort((a, b) => (a.p?.name ?? '').localeCompare(b.p?.name ?? '', 'bs'))
        .map(({ p, e }) => ({
          sku: p?.sku ?? '',
          name: p?.name ?? '',
          qty: String(e.qty),
          stock: p ? (p.stock < e.qty ? [String(p.stock), `fali ${e.qty - Math.max(0, p.stock)}`] : String(p.stock)) : '',
          by: [...e.by.entries()].map(([d, q]) => `${d.split(' ')[0]} ${q}`).join(', '),
          ok: '',
        })),
      { minRow: 12 },
    )
    L.heading('2. Utovar po vozilu', 'redoslijed dostave')
    for (const d of drivers) {
      const mine = stops.filter((x) => x.driver === d)
      L.ensure(80)
      L.paragraph(`${mine[0].driverName} — ${mine.length} ${mine.length === 1 ? 'dostava' : 'dostave'}`, 10, undefined, L.B)
      L.space(2)
      L.table(
        [
          { key: 'n', label: '#', w: 22 },
          { key: 'slot', label: 'Termin', w: 50 },
          { key: 'order', label: 'Narudžba / kupac', w: 150 },
          { key: 'items', label: 'Artikli za utovar', w: 0 },
          { key: 'm', label: 'Mont.', w: 36, align: 'c' },
          { key: 'ok', label: 'Utovar.', w: 44, check: true },
        ],
        mine.map((x, i) => ({
          n: `${i + 1}.`,
          slot: x.o.delivery!.slot,
          order: [x.o.number, `${x.customer?.name ?? ''}, ${x.o.delivery!.city}`],
          items: itemLines(x.o).join('\n'),
          m: x.o.delivery!.assembly ? 'DA' : '—',
          ok: '',
        })),
      )
    }
    L.checklist(['Roba provjerena i bez oštećenja', 'Okovi, vijci i upute spakovani', 'Alat za montažu u vozilu', 'Dokumenti (potvrde) predani vozačima'])
    L.signatures(['Pripremio/la (skladište)', 'Preuzeo/la (dostava)', 'Odobrio/la (voditelj)'])
    return out(`Plan dostava ${day} - skladiste.pdf`, await L.save())
  }

  if (kind === 'dostavljaci') {
    const L = await Letter.create(company, `Nalog za dostavu ${dateBa(day)}`)
    for (const d of drivers) {
      const mine = stops.filter((x) => x.driver === d)
      const name = mine[0].driverName
      L.newPage({ title: 'NALOG ZA DOSTAVU', number: dateBa(day), meta: [`Vozač: ${name}`, `${dayName(day)}`, `${mine.length} ${mine.length === 1 ? 'dostava' : 'dostave'}`], continued: `Nalog za dostavu – ${name} (nastavak)` })
      const due = mine.reduce((a, x) => a + x.due, 0)
      L.tiles([
        { label: 'Dostava', value: String(mine.length), hint: name },
        { label: 'Komada', value: String(mine.reduce((a, x) => a + x.o.items.reduce((b, i) => b + i.qty, 0), 0)) },
        { label: 'S montažom', value: String(mine.filter((x) => x.o.delivery!.assembly).length) },
        { label: 'Za naplatu', value: km(due), hint: 'ukupno kod kupaca' },
      ])
      L.table(
        [
          { key: 'n', label: '#', w: 20 },
          { key: 'slot', label: 'Termin', w: 46 },
          { key: 'who', label: 'Kupac, adresa, telefon', w: 165 },
          { key: 'items', label: 'Roba', w: 0 },
          { key: 'm', label: 'Mont.', w: 34, align: 'c' },
          { key: 'due', label: 'Naplatiti', w: 66, align: 'r', bold: true },
          { key: 'ok', label: 'Isp.', w: 30, check: true },
        ],
        mine.map((x, i) => ({
          n: `${i + 1}.`,
          slot: x.o.delivery!.slot,
          who: [x.customer?.name ?? '', `${x.o.delivery!.address}, ${x.o.delivery!.city}`, x.customer?.phone ? `Tel: ${x.customer.phone}` : '', `Narudžba ${x.o.number}`].filter(Boolean),
          items: [itemLines(x.o).join('\n'), x.o.note ? `Napomena: ${x.o.note}` : ''].filter(Boolean).join('\n'),
          m: x.o.delivery!.assembly ? 'DA' : '—',
          due: x.due > 0.5 ? km(x.due) : '—',
          ok: '',
        })),
        { footer: { who: 'Ukupno za naplatu', due: km(due) }, minRow: 30 },
      )
      L.fillLines(['Vozilo / registracija', 'Polazak iz skladišta (vrijeme)', 'Povratak (vrijeme)', 'Naplaćeno ukupno (KM)'])
      L.note('UPUTE', 'Kupca nazvati 30 minuta prije dolaska. Kod svake dostave kupac potpisuje potvrdu o preuzimanju. Naplaćeni novac i potpisane potvrde predati u salonu isti dan.')
      L.signatures(['Vozač/dostavljač', 'Voditelj skladišta'])
    }
    return out(`Nalog za dostavu ${day}.pdf`, await L.save())
  }

  // potvrde o preuzimanju — jedna stranica po kupcu
  const L = await Letter.create(company, `Potvrde o preuzimanju ${dateBa(day)}`)
  for (const x of stops) {
    const d = x.o.delivery!
    L.newPage({ title: 'POTVRDA O PREUZIMANJU ROBE', number: x.o.number, meta: [`Datum dostave: ${dateBa(day)}`, `Termin: ${d.slot}`], continued: `Potvrda o preuzimanju – ${x.o.number} (nastavak)` })
    L.boxes([
      { title: 'KUPAC', lines: [x.customer?.name ?? '', [x.customer?.address, x.customer?.city].filter(Boolean).join(', '), x.customer?.phone ? `Tel: ${x.customer.phone}` : ''] },
      { title: 'MJESTO ISPORUKE', lines: [`${d.address}, ${d.city}`, `Dostavljač: ${x.driverName}`, d.assembly ? 'Uključena montaža' : 'Bez montaže'] },
    ])
    L.table(
      [
        { key: 'n', label: 'R.br.', w: 32 },
        { key: 'sku', label: 'Šifra', w: 70 },
        { key: 'name', label: 'Artikal', w: 0 },
        { key: 'qty', label: 'Količina', w: 56, align: 'r', bold: true },
        { key: 'ok', label: 'Ispravno', w: 54, check: true },
      ],
      x.o.items.map((i, k) => ({ n: `${k + 1}.`, sku: prod.get(i.productId)?.sku ?? '', name: prod.get(i.productId)?.name ?? '', qty: `${i.qty} kom`, ok: '' })),
      { minRow: 14 },
    )
    L.heading('Stanje pri preuzimanju')
    L.checklist(['Roba preuzeta u ispravnom stanju', 'Bez vidljivih oštećenja', ...(d.assembly ? ['Montaža izvršena', 'Prostor očišćen, ambalaža odnesena'] : ['Ambalaža odnesena / ostavljena po dogovoru'])], 2)
    L.heading('Naplata')
    L.boxes(
      [
        { title: 'ZA NAPLATU PRI PREUZIMANJU', lines: [x.due > 0.5 ? km(x.due) : 'Ništa — plaćeno u cijelosti', x.due > 0.5 ? `od ukupno ${km(itemsTotal(x.o.items))}` : ''] },
        { title: 'NAPLAĆENO', lines: ['________________ KM', 'gotovina  /  kartica  /  ostalo'] },
      ],
      54,
    )
    L.fillLines(['Vrijeme preuzimanja', 'Primjedbe kupca'], 2)
    L.paragraph('Potpisom kupac potvrđuje da je robu preuzeo u navedenim količinama i stanju. Eventualne skrivene nedostatke kupac prijavljuje salonu u roku od 8 dana.', 8, undefined)
    L.signatures(['Dostavljač (potpis)', 'Kupac (čitko ime, prezime i potpis)'])
  }
  return out(`Potvrde o preuzimanju ${day}.pdf`, await L.save())
}

