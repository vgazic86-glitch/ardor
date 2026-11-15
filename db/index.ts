import { drizzle as netlifyDrizzle } from 'drizzle-orm/netlify-db'
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema.js'

/**
 * Na Netlifyju baza dolazi iz NETLIFY_DB_URL (Netlify Database).
 * Na drugim poslužiteljima (npr. Render) koristi se standardni DATABASE_URL.
 */
function create() {
  const url = process.env.DATABASE_URL
  if (url) {
    const ssl = /sslmode=require|\.render\.com|neon\.tech/.test(url) && !/sslmode=disable/.test(url) ? { rejectUnauthorized: false } : undefined
    return pgDrizzle({ client: new pg.Pool({ connectionString: url, ssl, max: 5 }), schema }) as unknown as ReturnType<typeof netlifyDrizzle<typeof schema>>
  }
  return netlifyDrizzle({ schema })
}

export const db = create()
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
