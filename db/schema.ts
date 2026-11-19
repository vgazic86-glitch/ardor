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

/** Kategorije artikala (uređuje uprava i admin; artikal ih bira s popisa). */
export const productCategories = pgTable('product_categories', {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
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
  /** Varijante koje kupac bira (npr. „Štof: siva, bež” — jedna grupa po redu). */
  options: text().notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
})

export const customers = pgTable('customers', {
  id: serial().primaryKey(),
  name: text().notNull(),
  phone: text().notNull().default(''),
  email: text().notNull().default(''),
  city: text().notNull().default(''),
  address: text().notNull().default(''),
  /** Interna napomena o kupcu (želje, dogovori). */
  note: text().notNull().default(''),
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
    /** Rok plaćanja ostatka, ako nije dan isporuke (null = dospijeva na dan isporuke). */
    dueDate: date('due_date', { mode: 'string' }),
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
    /** Odabrana varijanta (npr. „Štof: siva · Noge: hrast”). */
    variant: text().notNull().default(''),
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

/** Plan rata (način plaćanja „Rate” — salon kreditira kupca). Plaćenost se računa iz uplata. */
export const installments = pgTable(
  'installments',
  {
    id: serial().primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    seq: integer().notNull(),
    dueDate: date('due_date', { mode: 'string' }).notNull(),
    amount: money('amount').notNull(),
  },
  (t) => [index('installments_order_idx').on(t.orderId)],
)

/** Poslani podsjetnici kupcu za uplatu (ko, kada, kojim kanalom). */
export const paymentReminders = pgTable(
  'payment_reminders',
  {
    id: serial().primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    at: timestamp().notNull(),
    userName: text('user_name').notNull().default(''),
    channel: text().notNull(),
  },
  (t) => [index('payment_reminders_order_idx').on(t.orderId)],
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
  /** PDV s računa dobavljača; null = 17 % od nabavne vrijednosti. */
  vat: money('vat'),
  /** Dokument dobavljača (PDF ili slika) priložen uz primku. */
  fileId: integer('file_id').references((): AnyPgColumn => files.id, { onDelete: 'set null' }),
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
    /** Gdje je roba: salon (prodaja se skida odavde) ili skladište. */
    location: text().notNull().default('salon'),
    /** Interna primka (premještaj skladište ↔ salon), ako je kretanje dio nje. */
    transferId: integer('transfer_id').references((): AnyPgColumn => transfers.id, {
      onDelete: 'cascade',
    }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('stock_movements_product_idx').on(t.productId),
    index('stock_movements_order_idx').on(t.orderId),
  ],
)

/** Interne primke: premještaj robe između skladišta i salona (zapis toka robe). */
export const transfers = pgTable('transfers', {
  id: serial().primaryKey(),
  number: text().notNull().unique(),
  date: date({ mode: 'string' }).notNull(),
  fromLocation: text('from_location').notNull(),
  toLocation: text('to_location').notNull(),
  employeeId: integer('employee_id').references(() => employees.id),
  note: text().notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
})

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
  /** Koje uloge vide dokument (npr. 'trgovac,voditelj'); prazno = svi. Admin i uprava uvijek vide sve. */
  roles: text().notNull().default(''),
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

/** Korisnici aplikacije (prijava). Lozinka se postavlja pri prvoj prijavi uz jednokratni aktivacijski kod. */
export const users = pgTable('users', {
  id: serial().primaryKey(),
  username: text().notNull().unique(),
  name: text().notNull(),
  /** admin | uprava | trgovac */
  role: text().notNull().default('uprava'),
  /** Za trgovce: zaposlenik na kojeg se upisuju njihove prodaje. */
  employeeId: integer('employee_id').references(() => employees.id),
  /** Pristup plaćama, ugovorima, troškovima i zaradi. */
  hrAccess: boolean('hr_access').notNull().default(false),
  /** Kontakt koji se ispisuje na narudžbama dobavljačima. */
  phone: text().notNull().default(''),
  email: text().notNull().default(''),
  passwordHash: text('password_hash'),
  activationCode: text('activation_code'),
  active: boolean().notNull().default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

/** Narudžbe salona prema dobavljačima. Status: nacrt → zakljucena → zaprimljena (ili otkazana). */
export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    id: serial().primaryKey(),
    number: text().notNull().unique(),
    date: date({ mode: 'string' }).notNull(),
    supplierId: integer('supplier_id')
      .notNull()
      .references(() => suppliers.id),
    status: text().notNull().default('nacrt'),
    note: text().notNull().default(''),
    /** Željeni rok isporuke (neobavezno). */
    deliveryBy: date('delivery_by', { mode: 'string' }),
    createdBy: integer('created_by').references(() => users.id),
    createdByName: text('created_by_name').notNull().default(''),
    closedAt: timestamp('closed_at'),
    receiptId: integer('receipt_id').references(() => receipts.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [index('purchase_orders_supplier_idx').on(t.supplierId)],
)

export const purchaseOrderItems = pgTable(
  'purchase_order_items',
  {
    id: serial().primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    position: integer().notNull().default(0),
    /** Artikl iz kataloga; prazno za stavku koje još nema u katalogu. */
    productId: integer('product_id').references(() => products.id, {
      onDelete: 'set null',
    }),
    code: text().notNull().default(''),
    name: text().notNull(),
    qty: integer().notNull(),
    unit: text().notNull().default('kom'),
    /** Očekivana nabavna cijena bez PDV-a (neobavezno). */
    price: money('price'),
    note: text().notNull().default(''),
  },
  (t) => [index('purchase_order_items_order_idx').on(t.orderId)],
)

/** Kartica dobavljača: ručna zaduženja (računi) i uplate. Primke se računaju automatski. */
export const supplierLedger = pgTable(
  'supplier_ledger',
  {
    id: serial().primaryKey(),
    supplierId: integer('supplier_id')
      .notNull()
      .references(() => suppliers.id),
    date: date({ mode: 'string' }).notNull(),
    /** uplata | zaduzenje | odobrenje | pocetno */
    kind: text().notNull(),
    amount: money('amount').notNull(),
    /** Od toga PDV (za račune i odobrenja; ulazni PDV). */
    vat: money('vat').notNull().default(0),
    document: text().notNull().default(''),
    note: text().notNull().default(''),
    createdByName: text('created_by_name').notNull().default(''),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [index('supplier_ledger_supplier_idx').on(t.supplierId)],
)

/** Evidencija radnog vremena: jedan zapis po zaposleniku i danu. */
export const workTime = pgTable(
  'work_time',
  {
    id: serial().primaryKey(),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id),
    date: date({ mode: 'string' }).notNull(),
    /** rad | godisnji | bolovanje | slobodan | praznik */
    kind: text().notNull().default('rad'),
    start: text().notNull().default(''),
    end: text().notNull().default(''),
    breakMin: integer('break_min').notNull().default(0),
    note: text().notNull().default(''),
    updatedByName: text('updated_by_name').notNull().default(''),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [uniqueIndex('work_time_employee_date_idx').on(t.employeeId, t.date)],
)

/** Plan prometa (cilj) po zaposleniku za pojedini mjesec. Bez zapisa vrijedi osnovni cilj zaposlenika. */
export const employeeTargets = pgTable(
  'employee_targets',
  {
    id: serial().primaryKey(),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id),
    /** YYYY-MM */
    month: text().notNull(),
    target: money('target').notNull(),
  },
  (t) => [uniqueIndex('employee_targets_employee_month_idx').on(t.employeeId, t.month)],
)

/** Radni zadaci: uprava zadaje svima, voditelj salona trgovcima. */
export const tasks = pgTable(
  'tasks',
  {
    id: serial().primaryKey(),
    title: text().notNull(),
    description: text().notNull().default(''),
    assigneeId: integer('assignee_id')
      .notNull()
      .references(() => users.id),
    createdById: integer('created_by_id').references(() => users.id),
    createdByName: text('created_by_name').notNull().default(''),
    dueDate: date('due_date', { mode: 'string' }),
    /** normalno | hitno */
    priority: text().notNull().default('normalno'),
    /** otvoren | u_toku | zavrsen */
    status: text().notNull().default('otvoren'),
    doneNote: text('done_note').notNull().default(''),
    doneAt: timestamp('done_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [index('tasks_assignee_idx').on(t.assigneeId, t.status)],
)

/** Prijave (sesije) po uređaju: za „online” prikaz i automatsku odjavu kad se aplikacija zatvori. */
export const sessions = pgTable(
  'sessions',
  {
    id: text().primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
    userAgent: text('user_agent').notNull().default(''),
    /** Prozor aplikacije je javio da se zatvara; ako se ne javi ponovo u par sekundi (osvježavanje), sesija prestaje. */
    closingAt: timestamp('closing_at'),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
)

/** Dnevnik izmjena i prijava: ko je, kada i šta uradio. */
export const auditLog = pgTable(
  'audit_log',
  {
    id: serial().primaryKey(),
    at: timestamp().notNull(),
    userId: integer('user_id'),
    userName: text('user_name').notNull().default(''),
    entity: text().notNull(),
    action: text().notNull(),
    detail: text().notNull().default(''),
    /** Za prijave: korisničko ime koje je upisano. */
    subject: text().notNull().default(''),
    ip: text().notNull().default(''),
    ok: boolean().notNull().default(true),
  },
  (t) => [index('audit_at_idx').on(t.at), index('audit_subject_idx').on(t.subject, t.at)],
)

/** Obavijesti u zvonu (po korisniku): voditelj dobiva događaje iz salona, svi dobivaju objave. */
export const notifications = pgTable(
  'notifications',
  {
    id: serial().primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    at: timestamp().notNull(),
    title: text().notNull(),
    text: text().notNull().default(''),
    readAt: timestamp('read_at'),
  },
  (t) => [index('notifications_user_idx').on(t.userId, t.at)],
)

/** Smjene trgovaca po danu: otvaranje ili zatvaranje salona. */
export const shifts = pgTable(
  'shifts',
  {
    id: serial().primaryKey(),
    date: date({ mode: 'string' }).notNull(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** otvaranje | zatvaranje */
    shift: text().notNull(),
  },
  (t) => [uniqueIndex('shifts_day_user_uq').on(t.date, t.userId)],
)

/** Oglasna ploča: objave uprave i voditelja salona. */
export const announcements = pgTable('announcements', {
  id: serial().primaryKey(),
  title: text().notNull(),
  body: text().notNull().default(''),
  authorId: integer('author_id').references(() => users.id, { onDelete: 'set null' }),
  authorName: text('author_name').notNull().default(''),
  createdAt: timestamp('created_at').notNull(),
})

/** Tko je potvrdio da je objavu pročitao. */
export const announcementReads = pgTable(
  'announcement_reads',
  {
    announcementId: integer('announcement_id')
      .notNull()
      .references(() => announcements.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at').notNull(),
  },
  (t) => [uniqueIndex('announcement_reads_uq').on(t.announcementId, t.userId)],
)

/** Reklamacije kupaca: oštećenja, greške, servis. Status: prijavljena → u_obradi → kod_dobavljaca → rijesena | odbijena. */
export const complaints = pgTable(
  'complaints',
  {
    id: serial().primaryKey(),
    number: text().notNull().unique(),
    date: date({ mode: 'string' }).notNull(),
    customerId: integer('customer_id').references(() => customers.id),
    orderId: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),
    productId: integer('product_id').references(() => products.id),
    supplierId: integer('supplier_id').references(() => suppliers.id),
    /** ostecenje | greska | nedostaje | montaza | ostalo */
    kind: text().notNull().default('ostecenje'),
    description: text().notNull(),
    status: text().notNull().default('prijavljena'),
    /** popravak | zamjena | povrat_novca | odbijena | drugo */
    resolution: text().notNull().default(''),
    resolutionNote: text('resolution_note').notNull().default(''),
    dueDate: date('due_date', { mode: 'string' }),
    assigneeId: integer('assignee_id').references(() => users.id),
    createdById: integer('created_by_id').references(() => users.id),
    createdByName: text('created_by_name').notNull().default(''),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    closedAt: timestamp('closed_at'),
  },
  (t) => [index('complaints_status_idx').on(t.status)],
)

export const complaintPhotos = pgTable(
  'complaint_photos',
  {
    id: serial().primaryKey(),
    complaintId: integer('complaint_id')
      .notNull()
      .references(() => complaints.id, { onDelete: 'cascade' }),
    imageId: integer('image_id').notNull().references(() => files.id),
    thumbId: integer('thumb_id').notNull().references(() => files.id),
  },
  (t) => [index('complaint_photos_idx').on(t.complaintId)],
)

/** Historija promjena maloprodajne cijene artikla. */
export const priceChanges = pgTable(
  'price_changes',
  {
    id: serial().primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    oldPrice: money('old_price').notNull(),
    newPrice: money('new_price').notNull(),
    at: timestamp().notNull(),
    userName: text('user_name').notNull().default(''),
  },
  (t) => [index('price_changes_at_idx').on(t.at)],
)
