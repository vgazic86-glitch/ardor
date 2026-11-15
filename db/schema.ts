import { boolean, date, index, integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

const money = (name: string) => numeric(name, { precision: 12, scale: 2, mode: 'number' })

export const employees = pgTable('employees', {
  id: serial().primaryKey(),
  name: text().notNull(),
  role: text().notNull(),
  initials: text().notNull(),
  color: text().notNull().default('#7c4a2d'),
  monthlyTarget: money('monthly_target').notNull().default(0),
  commissionRate: numeric('commission_rate', { precision: 6, scale: 4, mode: 'number' }).notNull().default(0),
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
  supplierId: integer('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
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
    customerId: integer('customer_id').notNull().references(() => customers.id),
    employeeId: integer('employee_id').notNull().references(() => employees.id),
    status: text().notNull(),
    paymentMethod: text('payment_method').notNull(),
    note: text().notNull().default(''),
    issuedAt: date('issued_at', { mode: 'string' }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [index('orders_date_idx').on(t.date), index('orders_employee_idx').on(t.employeeId)],
)

export const orderItems = pgTable(
  'order_items',
  {
    id: serial().primaryKey(),
    orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    productId: integer('product_id').notNull().references(() => products.id),
    qty: integer().notNull(),
    unitPrice: money('unit_price').notNull(),
    discountPct: numeric('discount_pct', { precision: 5, scale: 2, mode: 'number' }).notNull().default(0),
  },
  (t) => [index('order_items_order_idx').on(t.orderId)],
)

export const payments = pgTable(
  'payments',
  {
    id: serial().primaryKey(),
    orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
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
  orderId: integer('order_id').notNull().unique().references(() => orders.id, { onDelete: 'cascade' }),
  date: date({ mode: 'string' }).notNull(),
  slot: text().notNull(),
  address: text().notNull(),
  city: text().notNull(),
  driverId: integer('driver_id').notNull().references(() => employees.id),
  assembly: boolean().notNull().default(false),
  status: text().notNull().default('zakazana'),
})

/** Prijem robe (primka / ulazni dokument dobavljača). */
export const receipts = pgTable('receipts', {
  id: serial().primaryKey(),
  number: text().notNull().unique(),
  date: date({ mode: 'string' }).notNull(),
  supplierId: integer('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
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
    productId: integer('product_id').notNull().references(() => products.id),
    date: date({ mode: 'string' }).notNull(),
    type: text().notNull(),
    qty: integer().notNull(),
    unitCost: money('unit_cost').notNull().default(0),
    receiptId: integer('receipt_id').references(() => receipts.id, { onDelete: 'cascade' }),
    orderId: integer('order_id').references(() => orders.id, { onDelete: 'cascade' }),
    employeeId: integer('employee_id').references(() => employees.id),
    note: text().notNull().default(''),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [index('stock_movements_product_idx').on(t.productId), index('stock_movements_order_idx').on(t.orderId)],
)

export const appMeta = pgTable('app_meta', {
  key: text().primaryKey(),
  value: text().notNull().default(''),
})
