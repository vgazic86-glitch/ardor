import {
  type AnyPgColumn,
  boolean,
  bytea,
  date,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

const money = (name: string) =>
  numeric(name, { precision: 12, scale: 2, mode: 'number' })

export const employees = pgTable('employees', {
  id: serial().primaryKey(),
  name: text().notNull(),
  role: text().notNull(),
  initials: text().notNull(),
  color: text().notNull().default('#7c4a2d'),
  monthlyTarget: money('monthly_target').notNull().default(0),
  commissionRate: numeric('commission_rate', {
    precision: 6,
    scale: 4,
    mode: 'number',
  })
    .notNull()
    .default(0),
  phone: text().notNull().default(''),
  active: boolean().notNull().default(true),
})

export const suppliers = pgTable('suppliers', {
  id: serial().primaryKey(),
  name: text().notNull(),
  phone: text().notNull().default(''),
  email: text().notNull().default(''),
  leadTimeDays: integer('lead_time_days').notNull().default(14),
})

export const products = pgTable('products', {
  id: serial().primaryKey(),
  sku: text().notNull().unique(),
  name: text().notNull(),
  category: text().notNull(),
  price: money('price').notNull(),
  purchasePrice: money('purchase_price').notNull().default(0),
  minStock: integer('min_stock').notNull().default(0),
  supplierId: integer('supplier_id').references(() => suppliers.id, {
    onDelete: 'set null',
  }),
  /** Slika artikla (do 1200 px) i sličica za popise (240 px). */
  imageId: integer('image_id').references((): AnyPgColumn => files.id, {
    onDelete: 'set null',
  }),
  thumbId: integer('thumb_id').references((): AnyPgColumn => files.id, {
    onDelete: 'set null',
  }),
  active: boolean().notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

export const customers = pgTable('customers', {
  id: serial().primaryKey(),
  name: text().notNull(),
  phone: text().notNull().default(''),
  email: text().notNull().default(''),
  city: text().notNull().default(''),
  address: text().notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
})

export const orders = pgTable(
  'orders',
  {
    id: serial().primaryKey(),
    number: text().notNull().unique(),
    date: date({ mode: 'string' }).notNull(),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id),
    status: text().notNull(),
    paymentMethod: text('payment_method').notNull(),
    note: text().notNull().default(''),
    issuedAt: date('issued_at', { mode: 'string' }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('orders_date_idx').on(t.date),
    index('orders_employee_idx').on(t.employeeId),
  ],
)

export const orderItems = pgTable(
  'order_items',
  {
    id: serial().primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    qty: integer().notNull(),
    unitPrice: money('unit_price').notNull(),
    discountPct: numeric('discount_pct', {
      precision: 5,
      scale: 2,
      mode: 'number',
    })
      .notNull()
      .default(0),
  },
  (t) => [index('order_items_order_idx').on(t.orderId)],
)

export const payments = pgTable(
  'payments',
  {
    id: serial().primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    date: date({ mode: 'string' }).notNull(),
    amount: money('amount').notNull(),
    method: text().notNull(),
    employeeId: integer('employee_id').references(() => employees.id),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [index('payments_order_idx').on(t.orderId)],
)

export const deliveries = pgTable('deliveries', {
  id: serial().primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .unique()
    .references(() => orders.id, { onDelete: 'cascade' }),
  date: date({ mode: 'string' }).notNull(),
  slot: text().notNull(),
  address: text().notNull(),
  city: text().notNull(),
  driverId: integer('driver_id')
    .notNull()
    .references(() => employees.id),
  assembly: boolean().notNull().default(false),
  status: text().notNull().default('zakazana'),
})

/** Prijem robe (primka / ulazni dokument dobavljača). */
export const receipts = pgTable('receipts', {
  id: serial().primaryKey(),
  number: text().notNull().unique(),
  date: date({ mode: 'string' }).notNull(),
  supplierId: integer('supplier_id').references(() => suppliers.id, {
    onDelete: 'set null',
  }),
  documentNumber: text('document_number').notNull().default(''),
  note: text().notNull().default(''),
  employeeId: integer('employee_id').references(() => employees.id),
  createdAt: timestamp('created_at').defaultNow(),
})

/** Svako kretanje robe: početno stanje, prijem, izlaz kupcu, povrat, korekcija (inventura). */
export const stockMovements = pgTable(
  'stock_movements',
  {
    id: serial().primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    date: date({ mode: 'string' }).notNull(),
    type: text().notNull(),
    qty: integer().notNull(),
    unitCost: money('unit_cost').notNull().default(0),
    receiptId: integer('receipt_id').references(() => receipts.id, {
      onDelete: 'cascade',
    }),
    orderId: integer('order_id').references(() => orders.id, {
      onDelete: 'cascade',
    }),
    employeeId: integer('employee_id').references(() => employees.id),
    note: text().notNull().default(''),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('stock_movements_product_idx').on(t.productId),
    index('stock_movements_order_idx').on(t.orderId),
  ],
)

export const appMeta = pgTable('app_meta', {
  key: text().primaryKey(),
  value: text().notNull().default(''),
})

/** Učitane datoteke (PDF, slike, Word…). Sadržaj se čuva u bazi. */
export const files = pgTable('files', {
  id: serial().primaryKey(),
  name: text().notNull(),
  mime: text().notNull().default('application/octet-stream'),
  size: integer().notNull().default(0),
  data: bytea().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

/** Opći dokumenti salona: kodeks, standardi, priručnici (tekst u Markdownu ili učitana datoteka). */
export const documents = pgTable('documents', {
  id: serial().primaryKey(),
  slug: text().notNull().unique(),
  title: text().notNull(),
  category: text().notNull(),
  summary: text().notNull().default(''),
  body: text().notNull().default(''),
  fileId: integer('file_id').references(() => files.id, {
    onDelete: 'set null',
  }),
  version: text().notNull().default('1.0'),
  sortOrder: integer('sort_order').notNull().default(100),
  archived: boolean().notNull().default(false),
  updatedBy: integer('updated_by').references(() => employees.id),
  updatedAt: timestamp('updated_at').defaultNow(),
})

/** Kadrovski dokumenti zaposlenika: ugovori o radu, aneksi, rješenja… (zaštićeno lozinkom). */
export const employeeFiles = pgTable(
  'employee_files',
  {
    id: serial().primaryKey(),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id),
    category: text().notNull(),
    title: text().notNull(),
    validFrom: date('valid_from', { mode: 'string' }),
    validUntil: date('valid_until', { mode: 'string' }),
    note: text().notNull().default(''),
    fileId: integer('file_id').references(() => files.id, {
      onDelete: 'set null',
    }),
    uploadedBy: integer('uploaded_by').references(() => employees.id),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [index('employee_files_employee_idx').on(t.employeeId)],
)

/** Plaća zaposlenika od određenog datuma (historija se čuva). */
export const salaries = pgTable(
  'salaries',
  {
    id: serial().primaryKey(),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id),
    validFrom: date('valid_from', { mode: 'string' }).notNull(),
    gross: money('gross').notNull(),
    net: money('net').notNull(),
    meal: money('meal').notNull().default(0),
    transport: money('transport').notNull().default(0),
    note: text().notNull().default(''),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [index('salaries_employee_idx').on(t.employeeId)],
)

/** Mjesečni bonus: fiksni dio (plaća) + varijabilni dio (prijedlog i odobreni iznos). */
export const bonuses = pgTable(
  'bonuses',
  {
    id: serial().primaryKey(),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id),
    month: text().notNull(),
    fixedGross: money('fixed_gross').notNull().default(0),
    proposed: money('proposed').notNull().default(0),
    approved: money('approved'),
    status: text().notNull().default('prijedlog'),
    basis: text().notNull().default(''),
    note: text().notNull().default(''),
    decidedBy: integer('decided_by').references(() => employees.id),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [uniqueIndex('bonuses_employee_month_idx').on(t.employeeId, t.month)],
)

/** Troškovi poslovanja (zakup, režije, gorivo, marketing…). Iznos je bez PDV-a; PDV se vodi zasebno. */
export const expenses = pgTable(
  'expenses',
  {
    id: serial().primaryKey(),
    date: date({ mode: 'string' }).notNull(),
    category: text().notNull(),
    description: text().notNull().default(''),
    supplier: text().notNull().default(''),
    documentNumber: text('document_number').notNull().default(''),
    net: money('net').notNull(),
    vat: money('vat').notNull().default(0),
    paymentMethod: text('payment_method').notNull().default('Virman'),
    recurring: boolean().notNull().default(false),
    fileId: integer('file_id').references(() => files.id, {
      onDelete: 'set null',
    }),
    createdBy: integer('created_by').references(() => employees.id),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [index('expenses_date_idx').on(t.date)],
)
