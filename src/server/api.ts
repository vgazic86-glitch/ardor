import { createMiddleware, createServerFn } from '@tanstack/react-start'
import type { DeliveryStatus, OrderStatus, PaymentMethod } from '../lib/types'
import * as logic from './logic'
import * as hr from './hr'
import * as images from './images'
import * as finance from './finance'
import * as auth from './auth'
import * as ops from './ops'
import * as tasks from './tasks'
import * as sales from './sales'
import * as daydocs from './daydocs'
import type { CompanyInfo, FinanceSettings, PurchaseStatus, TaskStatus } from '../lib/types'
import type { BonusPolicy } from '../lib/bonus'

/** Svi pozivi osim prijave zahtijevaju prijavljenog korisnika. */
const authed = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const user = await auth.requireUser()
  return next({ context: { user } })
})

/** Operativni poslovi (primke, nabava, kartice, artikli, inventura): sve osim trgovaca. */
const operations = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const user = await auth.requireOperations()
  return next({ context: { user } })
})

/** Radnje samo za upravu i administratora (puni uvid u poslovanje). */
const manager = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const user = await auth.requireManager()
  return next({ context: { user } })
})

const pass =
  <T>() =>
  (d: T) =>
    d

/** Podaci za aplikaciju — samo za prijavljene; inače samo informacija da treba prijava. */
export const getSnapshot = createServerFn({ method: 'GET' }).handler(async () => {
  await auth.ensureUsers()
  const user = await auth.currentUser()
  if (!user) return { user: null, data: null, openTasks: 0 }
  const data = await logic.loadSnapshot()
  const openTasks = await tasks.openTaskCount(user)
  if (user.role === 'trgovac') return { user, openTasks, data: logic.forTrader(data, user.employeeId) }
  // Operativa: nabavne cijene i primke vidi, tuđi promet ne.
  if (user.role === 'operativa') return { user, openTasks, data: logic.forTrader(data, user.employeeId, true) }
  return { user, openTasks, data }
})

export const createOrderFn = createServerFn({ method: 'POST' })
  .middleware([authed])
  .validator(pass<logic.CreateOrderInput>())
  .handler(({ data, context }) => {
    const u = context.user
    if (u.role !== 'trgovac' && u.role !== 'operativa') return logic.createOrder(data)
    if (!u.employeeId) throw new Error('Vaš račun nije povezan sa zaposlenikom.')
    // Trgovac prodaje u svoje ime i daje najviše 10 % popusta (Priručnik za prodavače).
    return logic.createOrder({
      ...data,
      employeeId: u.employeeId,
      actorId: u.employeeId,
      items: data.items.map((i) => ({ ...i, discountPct: Math.min(10, Math.max(0, i.discountPct)) })),
    })
  })

export const setOrderStatusFn = createServerFn({ method: 'POST' }).middleware([authed])
  .validator(
    pass<{ id: string; status: OrderStatus; actorId: string | null }>(),
  )
  .handler(({ data }) =>
    logic.setOrderStatus(data.id, data.status, data.actorId),
  )

export const setDeliveryStatusFn = createServerFn({ method: 'POST' }).middleware([authed])
  .validator(
    pass<{ id: string; status: DeliveryStatus; actorId: string | null }>(),
  )
  .handler(({ data }) =>
    logic.setDeliveryStatus(data.id, data.status, data.actorId),
  )

export const addPaymentFn = createServerFn({ method: 'POST' }).middleware([authed])
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

export const createReceiptFn = createServerFn({ method: 'POST' }).middleware([operations])
  .validator(pass<logic.ReceiptInput>())
  .handler(({ data }) => logic.createReceipt(data))

export const saveProductFn = createServerFn({ method: 'POST' }).middleware([operations])
  .validator(pass<logic.ProductInput>())
  .handler(({ data }) => logic.saveProduct(data))

export const archiveProductFn = createServerFn({ method: 'POST' }).middleware([operations])
  .validator(pass<{ id: string }>())
  .handler(({ data }) => logic.archiveProduct(data.id))

export const adjustStockFn = createServerFn({ method: 'POST' }).middleware([operations])
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

export const adjustStockManyFn = createServerFn({ method: 'POST' }).middleware([operations])
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

export const saveSupplierFn = createServerFn({ method: 'POST' }).middleware([operations])
  .validator(pass<logic.SupplierInput>())
  .handler(({ data }) => logic.saveSupplier(data))

export const saveEmployeeFn = createServerFn({ method: 'POST' }).middleware([manager])
  .validator(pass<logic.EmployeeInput>())
  .handler(({ data }) => logic.saveEmployee(data))

export const deactivateEmployeeFn = createServerFn({ method: 'POST' }).middleware([manager])
  .validator(pass<{ id: string }>())
  .handler(({ data }) => logic.deactivateEmployee(data.id))

export const clearTransactionsFn = createServerFn({ method: 'POST' }).middleware([manager])
  .validator(pass<{ confirm: 'OBRIŠI' }>())
  .handler(({ data }) => {
    if (data.confirm !== 'OBRIŠI') throw new Error('Potvrda nije ispravna.')
    return logic.clearTransactions()
  })

/* ───────── upravljačka lozinka, dokumenti, kadrovska ───────── */

export const adminStatusFn = createServerFn({ method: 'GET' }).middleware([authed]).handler(() =>
  hr.adminStatus(),
)

export const adminSetupFn = createServerFn({ method: 'POST' }).middleware([manager])
  .validator(pass<{ password: string }>())
  .handler(({ data }) => hr.adminSetup(data.password))

export const adminLoginFn = createServerFn({ method: 'POST' }).middleware([manager])
  .validator(pass<{ password: string }>())
  .handler(({ data }) => hr.adminLogin(data.password))

export const adminChangeFn = createServerFn({ method: 'POST' }).middleware([manager])
  .validator(
    pass<{ token: string; oldPassword: string; newPassword: string }>(),
  )
  .handler(({ data }) =>
    hr.adminChange(data.token, data.oldPassword, data.newPassword),
  )

export const saveDocumentFn = createServerFn({ method: 'POST' }).middleware([manager])
  .validator(pass<hr.DocumentInput>())
  .handler(({ data }) => hr.saveDocument(data))

export const archiveDocumentFn = createServerFn({ method: 'POST' }).middleware([manager])
  .validator(pass<{ token: string; id: string }>())
  .handler(({ data }) => hr.archiveDocument(data.token, data.id))

export const downloadDocumentFileFn = createServerFn({ method: 'POST' }).middleware([authed])
  .validator(pass<{ id: string }>())
  .handler(({ data }) => hr.downloadDocumentFile(data.id))

export const getHrFn = createServerFn({ method: 'POST' }).middleware([authed])
  .validator(pass<{ token: string }>())
  .handler(({ data }) => hr.getHr(data.token))

export const addEmployeeFileFn = createServerFn({ method: 'POST' }).middleware([authed])
  .validator(pass<hr.EmployeeFileInput>())
  .handler(({ data }) => hr.addEmployeeFile(data))

export const deleteEmployeeFileFn = createServerFn({ method: 'POST' }).middleware([authed])
  .validator(pass<{ token: string; id: string }>())
  .handler(({ data }) => hr.deleteEmployeeFile(data.token, data.id))

export const downloadEmployeeFileFn = createServerFn({ method: 'POST' }).middleware([authed])
  .validator(pass<{ token: string; id: string }>())
  .handler(({ data }) => hr.downloadEmployeeFile(data.token, data.id))

export const saveSalaryFn = createServerFn({ method: 'POST' }).middleware([authed])
  .validator(pass<hr.SalaryInput>())
  .handler(({ data }) => hr.saveSalary(data))

export const deleteSalaryFn = createServerFn({ method: 'POST' }).middleware([authed])
  .validator(pass<{ token: string; id: string }>())
  .handler(({ data }) => hr.deleteSalary(data.token, data.id))

export const saveBonusesFn = createServerFn({ method: 'POST' }).middleware([authed])
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

export const savePolicyFn = createServerFn({ method: 'POST' }).middleware([authed])
  .validator(pass<{ token: string; policy: BonusPolicy }>())
  .handler(({ data }) => hr.savePolicy(data.token, data.policy))

export const setProductImageFn = createServerFn({ method: 'POST' }).middleware([operations])
  .validator(
    pass<{ productId: string; image: images.ProductImageUpload | null }>(),
  )
  .handler(({ data }) => images.setProductImage(data.productId, data.image))

/* ───────── troškovi i obračun zarade ───────── */

export const getFinanceFn = createServerFn({ method: 'POST' }).middleware([authed])
  .validator(pass<{ token: string }>())
  .handler(({ data }) => finance.getFinance(data.token))

export const saveExpenseFn = createServerFn({ method: 'POST' }).middleware([authed])
  .validator(pass<finance.ExpenseInput>())
  .handler(({ data }) => finance.saveExpense(data))

export const deleteExpenseFn = createServerFn({ method: 'POST' }).middleware([authed])
  .validator(pass<{ token: string; id: string }>())
  .handler(({ data }) => finance.deleteExpense(data.token, data.id))

export const downloadExpenseFileFn = createServerFn({ method: 'POST' }).middleware([authed])
  .validator(pass<{ token: string; id: string }>())
  .handler(({ data }) => finance.downloadExpenseFile(data.token, data.id))

export const copyRecurringFn = createServerFn({ method: 'POST' }).middleware([authed])
  .validator(
    pass<{
      token: string
      fromMonth: string
      toMonth: string
      actorId: string | null
    }>(),
  )
  .handler(({ data }) =>
    finance.copyRecurring(
      data.token,
      data.fromMonth,
      data.toMonth,
      data.actorId,
    ),
  )

export const saveFinanceSettingsFn = createServerFn({ method: 'POST' }).middleware([authed])
  .validator(pass<{ token: string; settings: FinanceSettings }>())
  .handler(({ data }) => finance.saveFinanceSettings(data.token, data.settings))

/* ───────── prijava i korisnici ───────── */

export const loginFn = createServerFn({ method: 'POST' })
  .validator(pass<{ username: string; password: string }>())
  .handler(({ data }) => auth.login(data.username, data.password))

export const activateFn = createServerFn({ method: 'POST' })
  .validator(pass<{ username: string; code: string; password: string }>())
  .handler(({ data }) => auth.activate(data.username, data.code, data.password))

export const logoutFn = createServerFn({ method: 'POST' }).handler(() => auth.logout())

export const changePasswordFn = createServerFn({ method: 'POST' })
  .middleware([authed])
  .validator(pass<{ oldPassword: string; newPassword: string }>())
  .handler(({ data }) => auth.changePassword(data.oldPassword, data.newPassword))

export const listUsersFn = createServerFn({ method: 'POST' })
  .middleware([authed])
  .handler(() => auth.listUsers())

export const saveUserFn = createServerFn({ method: 'POST' })
  .middleware([authed])
  .validator(pass<auth.UserInput>())
  .handler(({ data }) => auth.saveUser(data))

export const resetUserFn = createServerFn({ method: 'POST' })
  .middleware([authed])
  .validator(pass<{ id: string }>())
  .handler(({ data }) => auth.resetUser(data.id))

/* ───────────── podaci o firmi, narudžbe dobavljačima, kartice, radno vrijeme ───────────── */

export const getCompanyFn = createServerFn({ method: 'POST' })
  .middleware([operations])
  .handler(() => ops.getCompany())

export const saveCompanyFn = createServerFn({ method: 'POST' })
  .middleware([manager])
  .validator(pass<CompanyInfo>())
  .handler(({ data }) => ops.saveCompany(data))

export const listPurchaseOrdersFn = createServerFn({ method: 'POST' })
  .middleware([operations])
  .handler(() => ops.listPurchaseOrders())

export const savePurchaseOrderFn = createServerFn({ method: 'POST' })
  .middleware([operations])
  .validator(pass<ops.PurchaseInput>())
  .handler(({ data, context }) => ops.savePurchaseOrder(context.user, data))

export const setPurchaseStatusFn = createServerFn({ method: 'POST' })
  .middleware([operations])
  .validator(pass<{ id: string; status: PurchaseStatus }>())
  .handler(({ data }) => ops.setPurchaseStatus(data.id, data.status))

export const deletePurchaseOrderFn = createServerFn({ method: 'POST' })
  .middleware([operations])
  .validator(pass<{ id: string }>())
  .handler(({ data }) => ops.deletePurchaseOrder(data.id))

export const linkPurchaseReceiptFn = createServerFn({ method: 'POST' })
  .middleware([operations])
  .validator(pass<{ id: string; receiptId: string }>())
  .handler(({ data }) => ops.linkPurchaseReceipt(data.id, data.receiptId))

export const purchaseOrderPdfFn = createServerFn({ method: 'POST' })
  .middleware([operations])
  .validator(pass<{ id: string }>())
  .handler(({ data }) => ops.purchaseOrderPdf(data.id))

export const listLedgerFn = createServerFn({ method: 'POST' })
  .middleware([operations])
  .handler(() => ops.listLedger())

export const saveLedgerEntryFn = createServerFn({ method: 'POST' })
  .middleware([operations])
  .validator(pass<ops.LedgerInput>())
  .handler(({ data, context }) => ops.saveLedgerEntry(context.user, data))

export const deleteLedgerEntryFn = createServerFn({ method: 'POST' })
  .middleware([operations])
  .validator(pass<{ id: string }>())
  .handler(({ data }) => ops.deleteLedgerEntry(data.id))

export const listWorkTimeFn = createServerFn({ method: 'POST' })
  .middleware([authed])
  .validator(pass<{ month: string }>())
  .handler(({ data, context }) => ops.listWorkTime(context.user, data.month))

export const saveWorkDayFn = createServerFn({ method: 'POST' })
  .middleware([authed])
  .validator(pass<ops.WorkDayInput>())
  .handler(({ data, context }) => ops.saveWorkDay(context.user, data))

export const clockFn = createServerFn({ method: 'POST' })
  .middleware([authed])
  .validator(pass<{ action: 'dolazak' | 'odlazak'; employeeId?: string | null }>())
  .handler(({ data, context }) => ops.clock(context.user, data.action, data.employeeId))

export const saveTargetsFn = createServerFn({ method: 'POST' })
  .middleware([manager])
  .validator(pass<{ month: string; rows: { employeeId: string; target: number | null }[] }>())
  .handler(({ data }) => logic.saveTargets(data.month, data.rows))

export const saveWorkRangeFn = createServerFn({ method: 'POST' })
  .middleware([authed])
  .validator(pass<ops.WorkRangeInput>())
  .handler(({ data, context }) => ops.saveWorkRange(context.user, data))

export const listTasksFn = createServerFn({ method: 'POST' })
  .middleware([authed])
  .handler(({ context }) => tasks.listTasks(context.user))

export const saveTaskFn = createServerFn({ method: 'POST' })
  .middleware([authed])
  .validator(pass<tasks.TaskInput>())
  .handler(({ data, context }) => tasks.saveTask(context.user, data))

export const setTaskStatusFn = createServerFn({ method: 'POST' })
  .middleware([authed])
  .validator(pass<{ id: string; status: TaskStatus; note: string }>())
  .handler(({ data, context }) => tasks.setTaskStatus(context.user, data.id, data.status, data.note))

export const deleteTaskFn = createServerFn({ method: 'POST' })
  .middleware([authed])
  .validator(pass<{ id: string }>())
  .handler(({ data, context }) => tasks.deleteTask(context.user, data.id))

export const saveCustomerFn = createServerFn({ method: 'POST' })
  .middleware([authed])
  .validator(pass<sales.CustomerInput>())
  .handler(({ data }) => sales.saveCustomer(data))

export const customerDocPdfFn = createServerFn({ method: 'POST' })
  .middleware([authed])
  .validator(pass<{ orderId: string; kind: sales.CustomerDocKind }>())
  .handler(({ data, context }) => sales.customerDocPdf(context.user, data.orderId, data.kind))

export const exportAllFn = createServerFn({ method: 'POST' })
  .middleware([manager])
  .handler(() => sales.exportAll())

export const cashUpPdfFn = createServerFn({ method: 'POST' })
  .middleware([authed])
  .validator(pass<{ day: string }>())
  .handler(({ data, context }) => daydocs.cashUpPdf(context.user, data.day))

export const deliveryPlanPdfFn = createServerFn({ method: 'POST' })
  .middleware([authed])
  .validator(pass<{ day: string; kind: daydocs.DeliveryDoc }>())
  .handler(({ data, context }) => daydocs.deliveryPlanPdf(context.user, data.day, data.kind))
