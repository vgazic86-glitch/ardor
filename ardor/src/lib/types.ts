/** Domenski tipovi aplikacije — odgovaraju tablicama u `db/schema.ts`. */

export type Role = 'Prodavač' | 'Voditelj salona' | 'Dostava i montaža'

export const ROLES: Role[] = [
  'Voditelj salona',
  'Prodavač',
  'Dostava i montaža',
]

export interface Employee {
  id: string
  name: string
  role: Role
  initials: string
  color: string
  monthlyTarget: number
  commissionRate: number
  phone: string
}

export const CATEGORIES = [
  'Sjedeće garniture',
  'Kuhinje',
  'Spavaće sobe',
  'Blagovaonice',
  'Uredski namještaj',
  'Dekor i rasvjeta',
] as const

export type Category = (typeof CATEGORIES)[number]

export interface Supplier {
  id: string
  name: string
  phone: string
  email: string
  leadTimeDays: number
}

export interface Product {
  id: string
  sku: string
  name: string
  category: Category
  /** Maloprodajna cijena s PDV-om. */
  price: number
  /** Zadnja nabavna cijena (bez PDV-a). */
  purchasePrice: number
  /** Prosječna nabavna cijena iz ulaza (ponderisana). */
  avgCost: number
  /** Fizičko stanje u salonu/skladištu (zbir svih kretanja). */
  stock: number
  minStock: number
  supplierId: string | null
  supplier: string
  leadTimeDays: number
}

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  city: string
  address: string
}

export type OrderStatus =
  'ponuda' | 'potvrđena' | 'u_izradi' | 'spremna' | 'isporučena' | 'otkazana'

export type DeliveryStatus = 'zakazana' | 'u_putu' | 'dostavljeno' | 'odgođena'

export type PaymentMethod = 'Gotovina' | 'Kartica' | 'Virman' | 'Rate'
export const PAYMENT_METHODS: PaymentMethod[] = [
  'Gotovina',
  'Kartica',
  'Virman',
  'Rate',
]

export type Slot = '08–12' | '12–16' | '16–20'
export const SLOTS: Slot[] = ['08–12', '12–16', '16–20']

export interface OrderItem {
  productId: string
  qty: number
  unitPrice: number
  discountPct: number
}

export interface Delivery {
  date: string
  slot: Slot
  address: string
  city: string
  driverId: string
  assembly: boolean
  status: DeliveryStatus
}

export interface Payment {
  id: string
  date: string
  amount: number
  method: PaymentMethod
  employeeId: string | null
}

export interface Order {
  id: string
  number: string
  date: string
  customerId: string
  employeeId: string
  items: OrderItem[]
  status: OrderStatus
  paymentMethod: PaymentMethod
  paid: number
  payments: Payment[]
  delivery: Delivery | null
  note: string
  /** Datum kada je roba izašla iz salona (skinuta sa zaliha), ili null. */
  issuedAt: string | null
}

export type MovementType =
  'pocetno' | 'primka' | 'izlaz' | 'povrat' | 'korekcija'

export interface StockMovement {
  id: string
  productId: string
  date: string
  type: MovementType
  /** Pozitivno = ulaz, negativno = izlaz. */
  qty: number
  unitCost: number
  receiptId: string | null
  orderId: string | null
  employeeId: string | null
  note: string
}

export interface ReceiptLine {
  productId: string
  qty: number
  unitCost: number
}

export interface Receipt {
  id: string
  number: string
  date: string
  supplierId: string | null
  documentNumber: string
  note: string
  employeeId: string | null
  lines: ReceiptLine[]
}

export interface Snapshot {
  today: string
  employees: Employee[]
  suppliers: Supplier[]
  products: Product[]
  customers: Customer[]
  orders: Order[]
  receipts: Receipt[]
  movements: StockMovement[]
}

export function itemsTotal(items: OrderItem[]) {
  return items.reduce(
    (sum, it) => sum + it.qty * it.unitPrice * (1 - it.discountPct / 100),
    0,
  )
}
