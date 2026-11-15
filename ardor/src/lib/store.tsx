import { useRouter } from '@tanstack/react-router'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  addPaymentFn,
  adjustStockFn,
  adjustStockManyFn,
  archiveProductFn,
  clearTransactionsFn,
  createOrderFn,
  createReceiptFn,
  deactivateEmployeeFn,
  saveEmployeeFn,
  saveProductFn,
  saveSupplierFn,
  setDeliveryStatusFn,
  setOrderStatusFn,
} from '../server/api'
import type {
  CreateOrderInput,
  EmployeeInput,
  ProductInput,
  ReceiptInput,
  SupplierInput,
} from '../server/logic'
import type {
  Customer,
  DeliveryStatus,
  Employee,
  OrderStatus,
  PaymentMethod,
  Product,
  Snapshot,
  Supplier,
} from './types'

/**
 * Podaci iz Netlify Database (učitani u root loaderu) + akcije koje pozivaju
 * serverske funkcije i zatim osvježavaju podatke.
 */
type Without<T> = Omit<T, 'actorId'>

interface Store extends Snapshot {
  currentMonth: string
  salesPeople: Employee[]
  drivers: Employee[]
  employeeById: (id: string | null) => Employee
  customerById: (id: string) => Customer
  productById: (id: string) => Product
  supplierById: (id: string | null) => Supplier | undefined
  /** Zaposlenik koji trenutno radi u aplikaciji (bira se u bočnoj traci). */
  me: Employee | null
  setMe: (id: string) => void
  busy: boolean
  error: string | null
  clearError: () => void
  /** Kratka poruka o uspjehu (prikazuje se dolje desno). */
  toast: { id: number; text: string } | null
  notify: (text: string) => void
  dismissToast: () => void
  addOrder: (o: Without<CreateOrderInput>) => Promise<{ id: string } | null>
  setOrderStatus: (id: string, status: OrderStatus) => Promise<void>
  setDeliveryStatus: (id: string, status: DeliveryStatus) => Promise<void>
  addPayment: (
    id: string,
    amount: number,
    method?: PaymentMethod,
  ) => Promise<void>
  addReceipt: (
    r: Without<ReceiptInput>,
  ) => Promise<{ id: string; number: string } | null>
  saveProduct: (p: Without<ProductInput>) => Promise<{ id: string } | null>
  archiveProduct: (id: string) => Promise<void>
  adjustStock: (
    productId: string,
    counted: number,
    note: string,
  ) => Promise<void>
  adjustStockMany: (
    lines: { productId: string; counted: number }[],
    note: string,
  ) => Promise<{ changed: number } | null>
  saveSupplier: (s: SupplierInput) => Promise<{ id: string } | null>
  saveEmployee: (e: EmployeeInput) => Promise<{ id: string } | null>
  deactivateEmployee: (id: string) => Promise<void>
  clearTransactions: () => Promise<void>
}

const Ctx = createContext<Store | null>(null)
const ME_KEY = 'ardor.me'

const unknownEmployee: Employee = {
  id: '',
  name: 'Nepoznato',
  role: 'Prodavač',
  initials: '?',
  color: '#8a7563',
  monthlyTarget: 0,
  commissionRate: 0,
  phone: '',
}
const unknownCustomer: Customer = {
  id: '',
  name: 'Nepoznat kupac',
  phone: '',
  email: '',
  city: '',
  address: '',
}
const unknownProduct: Product = {
  id: '',
  sku: '—',
  name: 'Arhiviran artikal',
  category: 'Dekor i rasvjeta',
  price: 0,
  purchasePrice: 0,
  avgCost: 0,
  stock: 0,
  minStock: 0,
  supplierId: null,
  supplier: '—',
  leadTimeDays: 0,
}

export function StoreProvider({
  data,
  children,
}: {
  data: Snapshot
  children: ReactNode
}) {
  const router = useRouter()
  const [meId, setMeId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const notify = useCallback(
    (text: string) => setToast({ id: Date.now(), text }),
    [],
  )

  useEffect(() => {
    setMeId(window.localStorage.getItem(ME_KEY))
  }, [])

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, ok?: string): Promise<T | null> => {
      setBusy(true)
      setError(null)
      try {
        const res = await fn()
        await router.invalidate()
        if (ok) notify(ok)
        return res
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Greška pri spremanju.')
        return null
      } finally {
        setBusy(false)
      }
    },
    [router, notify],
  )

  const value = useMemo<Store>(() => {
    const emp = new Map(data.employees.map((e) => [e.id, e]))
    const cus = new Map(data.customers.map((c) => [c.id, c]))
    const pro = new Map(data.products.map((p) => [p.id, p]))
    const sup = new Map(data.suppliers.map((s) => [s.id, s]))
    const salesPeople = data.employees.filter(
      (e) => e.role !== 'Dostava i montaža',
    )
    const me = (meId && emp.get(meId)) || data.employees[0] || null
    const actorId = me?.id ?? null
    return {
      ...data,
      currentMonth: data.today.slice(0, 7),
      salesPeople,
      drivers: data.employees.filter((e) => e.role === 'Dostava i montaža'),
      employeeById: (id) => (id && emp.get(id)) || unknownEmployee,
      customerById: (id) => cus.get(id) ?? unknownCustomer,
      productById: (id) => pro.get(id) ?? { ...unknownProduct, id },
      supplierById: (id) => (id ? sup.get(id) : undefined),
      me,
      setMe(id) {
        window.localStorage.setItem(ME_KEY, id)
        setMeId(id)
      },
      busy,
      error,
      clearError: () => setError(null),
      toast,
      notify,
      dismissToast: () => setToast(null),
      addOrder: (o) =>
        run(
          () => createOrderFn({ data: { ...o, actorId } }),
          'Narudžba je spremljena.',
        ),
      setOrderStatus: async (id, status) =>
        void (await run(
          () => setOrderStatusFn({ data: { id, status, actorId } }),
          'Status narudžbe je promijenjen.',
        )),
      setDeliveryStatus: async (id, status) =>
        void (await run(
          () => setDeliveryStatusFn({ data: { id, status, actorId } }),
          'Status dostave je promijenjen.',
        )),
      addPayment: async (id, amount, method) =>
        void (await run(
          () =>
            addPaymentFn({
              data: { id, amount, method: method ?? null, actorId },
            }),
          'Uplata je evidentirana.',
        )),
      addReceipt: (r) =>
        run(
          () => createReceiptFn({ data: { ...r, actorId } }),
          'Primka je spremljena, roba je na zalihi.',
        ),
      saveProduct: (p) =>
        run(
          () => saveProductFn({ data: { ...p, actorId } }),
          'Artikal je spremljen.',
        ),
      archiveProduct: async (id) =>
        void (await run(
          () => archiveProductFn({ data: { id } }),
          'Artikal je arhiviran.',
        )),
      adjustStock: async (productId, counted, note) =>
        void (await run(
          () => adjustStockFn({ data: { productId, counted, note, actorId } }),
          'Stanje je ispravljeno.',
        )),
      adjustStockMany: (lines, note) =>
        run(
          () => adjustStockManyFn({ data: { lines, note, actorId } }),
          'Inventura je knjižena.',
        ),
      saveSupplier: (s) =>
        run(() => saveSupplierFn({ data: s }), 'Dobavljač je spremljen.'),
      saveEmployee: (e) =>
        run(() => saveEmployeeFn({ data: e }), 'Zaposlenik je spremljen.'),
      deactivateEmployee: async (id) =>
        void (await run(
          () => deactivateEmployeeFn({ data: { id } }),
          'Zaposlenik je deaktiviran.',
        )),
      clearTransactions: async () =>
        void (await run(
          () => clearTransactionsFn({ data: { confirm: 'OBRIŠI' } }),
          'Primjerni promet je obrisan.',
        )),
    }
  }, [data, meId, busy, error, toast, notify, run])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore must be used inside StoreProvider')
  return s
}
