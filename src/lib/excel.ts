/** Izvoz izvještaja u Excel (.xlsx) za knjigovodstvo. Učitava se tek na klik. */
import type { Cell, Row, Sheet } from 'write-excel-file/browser'
import { CURRENCY, orderStatusLabel, VAT_RATE } from './format'
import type { Debt, Group, Period, SaleRow, SupplierRow } from './reports'
import { receiptNet, receiptVat } from './reports'
import type {
  Customer,
  Employee,
  Order,
  Payment,
  Product,
  Receipt,
  Supplier,
} from './types'

const head = (labels: string[]): Row =>
  labels.map(
    (value) =>
      ({
        value,
        fontWeight: 'bold',
        backgroundColor: '#EFE7DD',
        borderStyle: 'thin',
        borderColor: '#C9B8A8',
      }) as Cell,
  )
const num = (v: number): Cell => ({
  value: Math.round(v * 100) / 100,
  type: Number,
  format: '#,##0.00',
})
const int = (v: number): Cell => ({ value: v, type: Number, format: '0' })
const day = (iso: string | null): Cell =>
  iso
    ? { value: new Date(iso + 'T00:00:00Z'), type: Date, format: 'dd.mm.yyyy' }
    : null
const pct = (v: number): Cell => ({ value: v, type: Number, format: '0.0%' })
const bold = (v: string): Cell => ({ value: v, fontWeight: 'bold' })

export interface ExportInput {
  period: Period
  title: string
  sales: SaleRow[]
  vat: {
    outBase: number
    outVat: number
    inBase: number
    inVat: number
    otherBase?: number
    otherVat?: number
    due: number
    receipts: Receipt[]
  }
  payments: (Payment & { order: Order })[]
  byCategory: Group[]
  bySeller: Group[]
  bySupplier: SupplierRow[]
  debts: Debt[]
  advances: number
  products: Product[]
  customerById: (id: string) => Customer
  employeeById: (id: string | null) => Employee
  supplierById: (id: string | null) => Supplier | undefined
  productById: (id: string) => Product
}

export async function exportReport(x: ExportInput) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const s = (
    rows: {
      net: number
      cogs: number
      margin: number
      gross?: number
      vat?: number
    }[],
    k: 'net' | 'cogs' | 'margin',
  ) => rows.reduce((a, r) => a + r[k], 0)
  const gross = x.sales.reduce((a, r) => a + r.gross, 0)
  const net = s(x.sales, 'net')
  const cogs = s(x.sales, 'cogs')
  const paid = x.payments.reduce((a, p) => a + p.amount, 0)
  const stock = x.products.reduce(
    (a, p) => a + Math.max(0, p.stock) * p.avgCost,
    0,
  )

  const summary: Row[] = [
    [{ value: `Ardor — ${x.title}`, fontWeight: 'bold', fontSize: 14 }],
    [`Period: ${x.period.from} – ${x.period.to}`],
    [
      `Iznosi u ${CURRENCY}. PDV ${Math.round(VAT_RATE * 100)}%. Prihod po realizaciji (datum izlaza robe iz salona).`,
    ],
    [],
    head(['Stavka', 'Iznos']),
    [bold('Prihod s PDV-om'), num(gross)],
    ['Prihod bez PDV-a (osnovica)', num(net)],
    ['Izlazni PDV', num(gross - net)],
    ['Nabavna vrijednost prodane robe', num(cogs)],
    [bold('Bruto marža'), num(net - cogs)],
    ['Marža %', pct(net ? (net - cogs) / net : 0)],
    [],
    ['Ulazni PDV (primke)', num(x.vat.inVat)],
    [bold('PDV obaveza (izlazni − ulazni)'), num(x.vat.due)],
    [],
    ['Naplaćeno u periodu', num(paid)],
    [
      'Potraživanja od kupaca (danas)',
      num(x.debts.reduce((a, d) => a + d.due, 0)),
    ],
    ['Primljeni avansi (roba nije isporučena)', num(x.advances)],
    ['Vrijednost zaliha po nabavnoj (danas)', num(stock)],
  ]

  const sales: Row[] = [
    head([
      'Broj',
      'Datum narudžbe',
      'Datum izlaza',
      'Kupac',
      'Prodavač',
      'Status',
      'Iznos s PDV-om',
      'Osnovica',
      'PDV',
      'Nabavna vrijednost',
      'Marža',
      'Marža %',
      'Plaćeno',
    ]),
    ...x.sales.map((r) => [
      r.order.number,
      day(r.order.date),
      day(r.order.issuedAt),
      x.customerById(r.order.customerId).name,
      x.employeeById(r.order.employeeId).name,
      orderStatusLabel[r.order.status],
      num(r.gross),
      num(r.net),
      num(r.vat),
      num(r.cogs),
      num(r.margin),
      pct(r.net ? r.margin / r.net : 0),
      num(r.order.paid),
    ]),
    [
      bold('Ukupno'),
      null,
      null,
      null,
      null,
      null,
      num(gross),
      num(net),
      num(gross - net),
      num(cogs),
      num(net - cogs),
      pct(net ? (net - cogs) / net : 0),
      null,
    ],
  ]

  const items: Row[] = [
    head([
      'Broj',
      'Datum izlaza',
      'Šifra',
      'Artikal',
      'Kategorija',
      'Količina',
      'Cijena',
      'Popust %',
      'Iznos s PDV-om',
    ]),
    ...x.sales.flatMap((r) =>
      r.order.items.map((i) => {
        const p = x.productById(i.productId)
        return [
          r.order.number,
          day(r.order.issuedAt),
          p.sku,
          p.name,
          p.category,
          int(i.qty),
          num(i.unitPrice),
          num(i.discountPct),
          num(i.qty * i.unitPrice * (1 - i.discountPct / 100)),
        ]
      }),
    ),
  ]

  const payments: Row[] = [
    head([
      'Datum',
      'Narudžba',
      'Kupac',
      'Način plaćanja',
      'Iznos',
      'Evidentirao',
    ]),
    ...x.payments.map((p) => [
      day(p.date),
      p.order.number,
      x.customerById(p.order.customerId).name,
      p.method,
      num(p.amount),
      p.employeeId ? x.employeeById(p.employeeId).name : '',
    ]),
    [bold('Ukupno'), null, null, null, num(paid), null],
  ]

  const receipts: Row[] = [
    head([
      'Primka',
      'Datum',
      'Dobavljač',
      'Dokument dobavljača',
      'Osnovica',
      'PDV',
      'Ukupno',
    ]),
    ...x.vat.receipts.map((r) => {
      const n = receiptNet(r)
      const v = receiptVat(r)
      return [
        r.number,
        day(r.date),
        x.supplierById(r.supplierId)?.name ?? '',
        r.documentNumber,
        num(n),
        num(v),
        num(n + v),
      ]
    }),
    [
      bold('Ukupno'),
      null,
      null,
      null,
      num(x.vat.inBase),
      num(x.vat.inVat),
      num(x.vat.inBase + x.vat.inVat),
    ],
  ]

  const vat: Row[] = [
    head(['', 'Osnovica', 'PDV']),
    ['Izlazni (prodaja)', num(x.vat.outBase), num(x.vat.outVat)],
    ['Ulazni (primke)', num(x.vat.inBase), num(x.vat.inVat)],
    ['Ulazni (troškovi i računi dobavljača)', num(x.vat.otherBase ?? 0), num(x.vat.otherVat ?? 0)],
    [bold('Obaveza'), null, num(x.vat.due)],
  ]

  const groups = (title: string, g: Group[], qtyLabel: string): Row[] => [
    head([
      title,
      qtyLabel,
      'Prihod bez PDV-a',
      'Nabavna vrijednost',
      'Marža',
      'Marža %',
    ]),
    ...g.map((r) => [
      r.label,
      int(r.qty),
      num(r.net),
      num(r.cogs),
      num(r.margin),
      pct(r.net ? r.margin / r.net : 0),
    ]),
  ]

  const debts: Row[] = [
    head([
      'Kupac',
      'Telefon',
      'Grad',
      'Narudžbi',
      'Ukupno narudžbi',
      'Dug',
      'Od toga dospjelo',
      'Najstarija',
      'Dana',
    ]),
    ...x.debts.map((d) => [
      d.customer.name,
      d.customer.phone,
      d.customer.city,
      int(d.orders.length),
      num(d.total),
      num(d.due),
      num(d.issuedDue),
      day(d.oldest),
      int(d.days),
    ]),
  ]

  const stockRows: Row[] = [
    head([
      'Šifra',
      'Artikal',
      'Kategorija',
      'Dobavljač',
      'Količina',
      'Prosj. nabavna',
      'Vrijednost',
      'MPC',
    ]),
    ...x.products.map((p) => [
      p.sku,
      p.name,
      p.category,
      p.supplier,
      int(p.stock),
      num(p.avgCost),
      num(Math.max(0, p.stock) * p.avgCost),
      num(p.price),
    ]),
    [bold('Ukupno'), null, null, null, null, null, num(stock), null],
  ]

  const sheets: Sheet<unknown>[] = [
    {
      sheet: 'Sažetak',
      data: summary,
      columns: [{ width: 44 }, { width: 18 }],
    },
    {
      sheet: 'Realizacija',
      data: sales,
      columns: [12, 13, 13, 26, 20, 12, 15, 14, 12, 16, 14, 10, 14].map(
        (width) => ({ width }),
      ),
      stickyRowsCount: 1,
    },
    {
      sheet: 'Stavke prodaje',
      data: items,
      columns: [12, 13, 11, 34, 20, 9, 12, 9, 15].map((width) => ({ width })),
      stickyRowsCount: 1,
    },
    {
      sheet: 'Uplate',
      data: payments,
      columns: [12, 12, 26, 16, 14, 20].map((width) => ({ width })),
      stickyRowsCount: 1,
    },
    {
      sheet: 'Primke',
      data: receipts,
      columns: [12, 12, 24, 20, 14, 12, 14].map((width) => ({ width })),
      stickyRowsCount: 1,
    },
    {
      sheet: 'PDV',
      data: vat,
      columns: [22, 16, 16].map((width) => ({ width })),
    },
    {
      sheet: 'Marža po kategoriji',
      data: groups('Kategorija', x.byCategory, 'Komada'),
      columns: [24, 10, 18, 18, 16, 10].map((width) => ({ width })),
    },
    {
      sheet: 'Marža po prodavaču',
      data: groups('Prodavač', x.bySeller, 'Narudžbi'),
      columns: [24, 10, 18, 18, 16, 10].map((width) => ({ width })),
    },
    {
      sheet: 'Po dobavljačima',
      data: [
        head([
          'Dobavljač',
          'Prodano kom.',
          'Prihod bez PDV-a',
          'Nabavna prodanog',
          'Marža',
          'Marža %',
          'Nabava u periodu',
          'Primki',
        ]),
        ...x.bySupplier.map((r) => [
          r.label,
          int(r.qty),
          num(r.net),
          num(r.cogs),
          num(r.margin),
          pct(r.net ? r.margin / r.net : 0),
          num(r.purchased),
          int(r.receipts),
        ]),
      ],
      columns: [26, 12, 18, 18, 16, 10, 18, 8].map((width) => ({ width })),
      stickyRowsCount: 1,
    },
    {
      sheet: 'Dugovanja',
      data: debts,
      columns: [26, 16, 14, 10, 16, 14, 16, 12, 8].map((width) => ({ width })),
      stickyRowsCount: 1,
    },
    {
      sheet: 'Zalihe',
      data: stockRows,
      columns: [11, 34, 20, 20, 10, 14, 14, 12].map((width) => ({ width })),
      stickyRowsCount: 1,
    },
  ]

  await writeXlsxFile(sheets as never, {
    fontFamily: 'Calibri',
    fontSize: 11,
  }).toFile(`ardor-izvjestaj-${x.period.from}-${x.period.to}.xlsx`)
}

/** Jednostavan izvoz jedne ili više tablica (kartica dobavljača, radno vrijeme…). */
export type SimpleCell = string | number | { date: string } | { bold: string } | null
export async function exportTables(
  fileName: string,
  tables: { sheet: string; header: string[]; rows: SimpleCell[][]; widths?: number[]; title?: string }[],
) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const cell = (v: SimpleCell): Cell => {
    if (v == null || v === '') return null
    if (typeof v === 'number') return num(v)
    if (typeof v === 'string') return { value: v }
    if ('date' in v) return day(v.date)
    return bold(v.bold)
  }
  const sheets = tables.map((t) => ({
    sheet: t.sheet.slice(0, 31),
    data: [
      ...(t.title ? [[{ value: t.title, fontWeight: 'bold', fontSize: 13 } as Cell], []] : []),
      head(t.header),
      ...t.rows.map((r) => r.map(cell)),
    ],
    columns: (t.widths ?? t.header.map(() => 16)).map((width) => ({ width })),
  }))
  await writeXlsxFile(sheets as never, { fontFamily: 'Calibri', fontSize: 11 }).toFile(fileName)
}
