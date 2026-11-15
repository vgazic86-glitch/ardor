/** Troškovi i postavke obračuna zarade. Zaštićeno upravljačkom lozinkom. */
import { and, desc, eq, gte, like, lte, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'
import {
  DEFAULT_FINANCE_SETTINGS,
  type Expense,
  type FinanceSettings,
} from '../lib/types'
import {
  meta,
  readFile,
  requireAdmin,
  setMeta,
  storeFile,
  getHr,
  type HrData,
} from './hr'

const r2 = (v: number) => Math.round(v * 100) / 100
const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sarajevo' }).format(
    new Date(),
  )

export interface FinanceData {
  expenses: Expense[]
  settings: FinanceSettings
  hr: HrData
}

async function settings(): Promise<FinanceSettings> {
  try {
    const raw = await meta('finance_settings')
    return { ...DEFAULT_FINANCE_SETTINGS, ...(raw ? JSON.parse(raw) : {}) }
  } catch {
    return DEFAULT_FINANCE_SETTINGS
  }
}

export async function getFinance(token: string): Promise<FinanceData> {
  await requireAdmin(token)
  await ensureExpensesSeeded()
  const rows = await db
    .select({
      e: t.expenses,
      fid: t.files.id,
      fname: t.files.name,
      fmime: t.files.mime,
      fsize: t.files.size,
    })
    .from(t.expenses)
    .leftJoin(t.files, eq(t.expenses.fileId, t.files.id))
    .orderBy(desc(t.expenses.date), desc(t.expenses.id))
  return {
    expenses: rows.map((r) => ({
      id: String(r.e.id),
      date: r.e.date,
      category: r.e.category,
      description: r.e.description,
      supplier: r.e.supplier,
      documentNumber: r.e.documentNumber,
      net: r.e.net,
      vat: r.e.vat,
      paymentMethod: r.e.paymentMethod,
      recurring: r.e.recurring,
      file: r.fid
        ? {
            id: String(r.fid),
            name: r.fname ?? '',
            mime: r.fmime ?? '',
            size: r.fsize ?? 0,
          }
        : null,
    })),
    settings: await settings(),
    hr: await getHr(token),
  }
}

export interface ExpenseInput {
  token: string
  actorId: string | null
  id: string | null
  date: string
  category: string
  description: string
  supplier: string
  documentNumber: string
  net: number
  vat: number
  paymentMethod: string
  recurring: boolean
  file: { name: string; mime: string; dataB64: string } | null
}

export async function saveExpense(input: ExpenseInput) {
  await requireAdmin(input.token)
  if (!input.date) throw new Error('Unesite datum troška.')
  if (!input.category) throw new Error('Odaberite kategoriju.')
  if (!(input.net > 0)) throw new Error('Unesite iznos troška bez PDV-a.')
  if (input.vat < 0) throw new Error('PDV ne može biti negativan.')
  const fileId = input.file
    ? await storeFile(input.file.name, input.file.mime, input.file.dataB64)
    : undefined
  const values = {
    date: input.date,
    category: input.category,
    description: input.description.trim(),
    supplier: input.supplier.trim(),
    documentNumber: input.documentNumber.trim(),
    net: r2(input.net),
    vat: r2(input.vat),
    paymentMethod: input.paymentMethod,
    recurring: input.recurring,
    ...(fileId ? { fileId } : {}),
  }
  if (input.id)
    await db
      .update(t.expenses)
      .set(values)
      .where(eq(t.expenses.id, Number(input.id)))
  else
    await db.insert(t.expenses).values({
      ...values,
      createdBy: input.actorId ? Number(input.actorId) : null,
    })
}

export async function deleteExpense(token: string, id: string) {
  await requireAdmin(token)
  const [row] = await db
    .delete(t.expenses)
    .where(eq(t.expenses.id, Number(id)))
    .returning()
  if (row?.fileId) await db.delete(t.files).where(eq(t.files.id, row.fileId))
}

export async function downloadExpenseFile(token: string, id: string) {
  await requireAdmin(token)
  const [row] = await db
    .select()
    .from(t.expenses)
    .where(eq(t.expenses.id, Number(id)))
  if (!row?.fileId) throw new Error('Trošak nema priložen račun.')
  return readFile(row.fileId)
}

const monthBounds = (key: string) => {
  const [y, m] = key.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return {
    from: `${key}-01`,
    to: `${key}-${String(last).padStart(2, '0')}`,
    last,
  }
}

/** Prenosi ponavljajuće (fiksne) troškove iz jednog mjeseca u drugi, bez duplikata. */
export async function copyRecurring(
  token: string,
  fromMonth: string,
  toMonth: string,
  actorId: string | null,
) {
  await requireAdmin(token)
  if (!/^\d{4}-\d{2}$/.test(fromMonth) || !/^\d{4}-\d{2}$/.test(toMonth))
    throw new Error('Neispravan mjesec.')
  const a = monthBounds(fromMonth)
  const b = monthBounds(toMonth)
  const src = await db
    .select()
    .from(t.expenses)
    .where(
      and(
        eq(t.expenses.recurring, true),
        gte(t.expenses.date, a.from),
        lte(t.expenses.date, a.to),
      ),
    )
  const existing = await db
    .select()
    .from(t.expenses)
    .where(and(gte(t.expenses.date, b.from), lte(t.expenses.date, b.to)))
  const key = (e: {
    category: string
    description: string
    supplier: string
  }) => `${e.category}|${e.description}|${e.supplier}`
  const have = new Set(existing.map(key))
  const add = src.filter((e) => !have.has(key(e)))
  if (add.length)
    await db.insert(t.expenses).values(
      add.map((e) => ({
        date: `${toMonth}-${String(Math.min(Number(e.date.slice(8)), b.last)).padStart(2, '0')}`,
        category: e.category,
        description: e.description,
        supplier: e.supplier,
        documentNumber: '',
        net: e.net,
        vat: e.vat,
        paymentMethod: e.paymentMethod,
        recurring: true,
        createdBy: actorId ? Number(actorId) : null,
      })),
    )
  return { copied: add.length, skipped: src.length - add.length }
}

export async function saveFinanceSettings(token: string, s: FinanceSettings) {
  await requireAdmin(token)
  const clean: FinanceSettings = {
    includePayroll: !!s.includePayroll,
    employerContribPct: Math.max(
      0,
      Math.min(1, Number(s.employerContribPct) || 0),
    ),
    profitTaxPct: Math.max(0, Math.min(1, Number(s.profitTaxPct) || 0)),
  }
  await setMeta('finance_settings', JSON.stringify(clean))
}

/** Primjerni fiksni troškovi za zadnjih 12 mjeseci (samo dok baza ima primjerne podatke). */
async function ensureExpensesSeeded() {
  if ((await meta('expenses_seeded')) || (await meta('cleared'))) return
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(t.expenses)
  if (!n) {
    const now = today()
    let [y, m] = now.slice(0, 7).split('-').map(Number)
    const months: string[] = []
    for (let i = 0; i < 12; i++) {
      months.unshift(`${y}-${String(m).padStart(2, '0')}`)
      m -= 1
      if (!m) {
        m = 12
        y -= 1
      }
    }
    const plan: [string, string, string, number, number, number][] = [
      // kategorija, opis, dobavljač, iznos bez PDV-a, dan, varijacija
      [
        'Zakup prostora',
        'Zakup salona i skladišta (primjer)',
        'Nekretnine d.o.o.',
        1500,
        1,
        0,
      ],
      [
        'Režije (struja, voda, grijanje)',
        'Struja, voda, grijanje (primjer)',
        'Elektroprivreda',
        340,
        10,
        120,
      ],
      [
        'Telefon i internet',
        'Telefon i internet (primjer)',
        'Telekom',
        85,
        12,
        0,
      ],
      [
        'Gorivo',
        'Gorivo za dostavna vozila (primjer)',
        'Benzinska pumpa',
        420,
        20,
        140,
      ],
      [
        'Marketing i reklama',
        'Društvene mreže i lokalni oglasi (primjer)',
        'Agencija',
        300,
        5,
        150,
      ],
      [
        'Knjigovodstvo i pravne usluge',
        'Knjigovodstvene usluge (primjer)',
        'Knjigovodstveni servis',
        250,
        3,
        0,
      ],
      [
        'Bankarske naknade',
        'Vođenje računa i POS (primjer)',
        'Banka',
        45,
        28,
        15,
      ],
    ]
    const rows = months
      .filter((mk) => `${mk}-01` <= now)
      .flatMap((mk, i) =>
        plan
          .map(([category, description, supplier, base, day, vary]) => {
            const date = `${mk}-${String(day).padStart(2, '0')}`
            const net = r2(
              base +
                (vary
                  ? (((i * 37 + day * 11) % 100) / 100) * vary - vary / 2
                  : 0),
            )
            return {
              date,
              category,
              description,
              supplier,
              documentNumber: '',
              net,
              vat: r2(net * 0.17),
              paymentMethod: 'Virman',
              recurring: true,
            }
          })
          .filter((r) => r.date <= now),
      )
    if (rows.length) await db.insert(t.expenses).values(rows)
  }
  await setMeta('expenses_seeded', today())
}

/** Briše primjerne troškove (poziva se uz brisanje primjernog prometa). */
export async function clearDemoExpenses() {
  await db.delete(t.expenses).where(like(t.expenses.description, '%(primjer)%'))
}
