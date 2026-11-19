import { asc, eq, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'

/** Kategorije artikala: dodavanje i brisanje (artikl ih bira s popisa). */

export const CATEGORY_MAX = 60

export function cleanCategoryName(raw: string) {
  return raw.replace(/\s+/g, ' ').trim()
}

export async function listCategories(): Promise<string[]> {
  const rows = await db.select({ name: t.productCategories.name }).from(t.productCategories).orderBy(asc(t.productCategories.name))
  return rows.map((r) => r.name)
}

export async function addCategory(raw: string) {
  const name = cleanCategoryName(raw)
  if (!name) throw new Error('Upišite naziv kategorije.')
  if (name.length > CATEGORY_MAX) throw new Error(`Naziv kategorije može imati najviše ${CATEGORY_MAX} znakova.`)
  await db.insert(t.productCategories).values({ name }).onConflictDoNothing()
  return name
}

/** Brisanje samo ako nijedan artikal nije u toj kategoriji (da artikli ne ostanu bez kategorije). */
export async function deleteCategory(name: string) {
  const [c] = await db.select().from(t.productCategories).where(eq(t.productCategories.name, name))
  if (!c) throw new Error('Kategorija ne postoji.')
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(t.products)
    .where(eq(t.products.category, c.name))
  if (n > 0) throw new Error(`Kategoriju „${c.name}” koristi ${n} artikala. Najprije ih premjestite u drugu kategoriju, pa tada obrišite ovu.`)
  await db.delete(t.productCategories).where(eq(t.productCategories.id, c.id))
  return c.name
}
