import { createServerFn } from '@tanstack/react-start'
import type { DeliveryStatus, OrderStatus, PaymentMethod } from '../lib/types'
import * as logic from './logic'
import * as hr from './hr'
import type { BonusPolicy } from '../lib/bonus'

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

/* ───────── upravljačka lozinka, dokumenti, kadrovska ───────── */

export const adminStatusFn = createServerFn({ method: 'GET' }).handler(() =>
  hr.adminStatus(),
)

export const adminSetupFn = createServerFn({ method: 'POST' })
  .validator(pass<{ password: string }>())
  .handler(({ data }) => hr.adminSetup(data.password))

export const adminLoginFn = createServerFn({ method: 'POST' })
  .validator(pass<{ password: string }>())
  .handler(({ data }) => hr.adminLogin(data.password))

export const adminChangeFn = createServerFn({ method: 'POST' })
  .validator(
    pass<{ token: string; oldPassword: string; newPassword: string }>(),
  )
  .handler(({ data }) =>
    hr.adminChange(data.token, data.oldPassword, data.newPassword),
  )

export const saveDocumentFn = createServerFn({ method: 'POST' })
  .validator(pass<hr.DocumentInput>())
  .handler(({ data }) => hr.saveDocument(data))

export const archiveDocumentFn = createServerFn({ method: 'POST' })
  .validator(pass<{ token: string; id: string }>())
  .handler(({ data }) => hr.archiveDocument(data.token, data.id))

export const downloadDocumentFileFn = createServerFn({ method: 'POST' })
  .validator(pass<{ id: string }>())
  .handler(({ data }) => hr.downloadDocumentFile(data.id))

export const getHrFn = createServerFn({ method: 'POST' })
  .validator(pass<{ token: string }>())
  .handler(({ data }) => hr.getHr(data.token))

export const addEmployeeFileFn = createServerFn({ method: 'POST' })
  .validator(pass<hr.EmployeeFileInput>())
  .handler(({ data }) => hr.addEmployeeFile(data))

export const deleteEmployeeFileFn = createServerFn({ method: 'POST' })
  .validator(pass<{ token: string; id: string }>())
  .handler(({ data }) => hr.deleteEmployeeFile(data.token, data.id))

export const downloadEmployeeFileFn = createServerFn({ method: 'POST' })
  .validator(pass<{ token: string; id: string }>())
  .handler(({ data }) => hr.downloadEmployeeFile(data.token, data.id))

export const saveSalaryFn = createServerFn({ method: 'POST' })
  .validator(pass<hr.SalaryInput>())
  .handler(({ data }) => hr.saveSalary(data))

export const deleteSalaryFn = createServerFn({ method: 'POST' })
  .validator(pass<{ token: string; id: string }>())
  .handler(({ data }) => hr.deleteSalary(data.token, data.id))

export const saveBonusesFn = createServerFn({ method: 'POST' })
  .validator(
    pass<{
      token: string
      month: string
      rows: hr.BonusRowInput[]
      actorId: string | null
    }>(),
  )
  .handler(({ data }) =>
    hr.saveBonuses(data.token, data.month, data.rows, data.actorId),
  )

export const savePolicyFn = createServerFn({ method: 'POST' })
  .validator(pass<{ token: string; policy: BonusPolicy }>())
  .handler(({ data }) => hr.savePolicy(data.token, data.policy))
