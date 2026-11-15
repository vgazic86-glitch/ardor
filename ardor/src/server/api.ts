import { createServerFn } from '@tanstack/react-start'
import type { DeliveryStatus, OrderStatus, PaymentMethod } from '../lib/types'
import * as logic from './logic'

const pass =
  <T>() =>
  (d: T) =>
    d

export const getSnapshot = createServerFn({ method: 'GET' }).handler(() =>
  logic.loadSnapshot(),
)

export const createOrderFn = createServerFn({ method: 'POST' })
  .validator(pass<logic.CreateOrderInput>())
  .handler(({ data }) => logic.createOrder(data))

export const setOrderStatusFn = createServerFn({ method: 'POST' })
  .validator(
    pass<{ id: string; status: OrderStatus; actorId: string | null }>(),
  )
  .handler(({ data }) =>
    logic.setOrderStatus(data.id, data.status, data.actorId),
  )

export const setDeliveryStatusFn = createServerFn({ method: 'POST' })
  .validator(
    pass<{ id: string; status: DeliveryStatus; actorId: string | null }>(),
  )
  .handler(({ data }) =>
    logic.setDeliveryStatus(data.id, data.status, data.actorId),
  )

export const addPaymentFn = createServerFn({ method: 'POST' })
  .validator(
    pass<{
      id: string
      amount: number
      method: PaymentMethod | null
      actorId: string | null
    }>(),
  )
  .handler(({ data }) =>
    logic.addPayment(data.id, data.amount, data.method, data.actorId),
  )

export const createReceiptFn = createServerFn({ method: 'POST' })
  .validator(pass<logic.ReceiptInput>())
  .handler(({ data }) => logic.createReceipt(data))

export const saveProductFn = createServerFn({ method: 'POST' })
  .validator(pass<logic.ProductInput>())
  .handler(({ data }) => logic.saveProduct(data))

export const archiveProductFn = createServerFn({ method: 'POST' })
  .validator(pass<{ id: string }>())
  .handler(({ data }) => logic.archiveProduct(data.id))

export const adjustStockFn = createServerFn({ method: 'POST' })
  .validator(
    pass<{
      productId: string
      counted: number
      note: string
      actorId: string | null
    }>(),
  )
  .handler(({ data }) =>
    logic.adjustStock(data.productId, data.counted, data.note, data.actorId),
  )

export const adjustStockManyFn = createServerFn({ method: 'POST' })
  .validator(
    pass<{
      lines: { productId: string; counted: number }[]
      note: string
      actorId: string | null
    }>(),
  )
  .handler(({ data }) =>
    logic.adjustStockMany(data.lines, data.note, data.actorId),
  )

export const saveSupplierFn = createServerFn({ method: 'POST' })
  .validator(pass<logic.SupplierInput>())
  .handler(({ data }) => logic.saveSupplier(data))

export const saveEmployeeFn = createServerFn({ method: 'POST' })
  .validator(pass<logic.EmployeeInput>())
  .handler(({ data }) => logic.saveEmployee(data))

export const deactivateEmployeeFn = createServerFn({ method: 'POST' })
  .validator(pass<{ id: string }>())
  .handler(({ data }) => logic.deactivateEmployee(data.id))

export const clearTransactionsFn = createServerFn({ method: 'POST' })
  .validator(pass<{ confirm: 'OBRIŠI' }>())
  .handler(({ data }) => {
    if (data.confirm !== 'OBRIŠI') throw new Error('Potvrda nije ispravna.')
    return logic.clearTransactions()
  })
