// Primjenjuje SQL migracije iz netlify/database/migrations na DATABASE_URL (za Render i sl.).
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'

const url = process.env.DATABASE_URL
if (!url) {
  console.log('[migrate] DATABASE_URL nije postavljen — preskačem.')
  process.exit(0)
}
const ssl = /sslmode=require|\.render\.com|neon\.tech/.test(url) && !/sslmode=disable/.test(url) ? { rejectUnauthorized: false } : undefined
const client = new pg.Client({ connectionString: url, ssl })
await client.connect()
await client.query('create table if not exists _ardor_migrations (name text primary key, applied_at timestamptz default now())')
const dir = 'netlify/database/migrations'
const done = new Set((await client.query('select name from _ardor_migrations')).rows.map((r) => r.name))
for (const name of readdirSync(dir).sort()) {
  if (done.has(name)) continue
  const sql = readFileSync(join(dir, name, 'migration.sql'), 'utf8')
  console.log(`[migrate] primjenjujem ${name}`)
  await client.query('begin')
  try {
    for (const stmt of sql.split('--> statement-breakpoint')) if (stmt.trim()) await client.query(stmt)
    await client.query('insert into _ardor_migrations(name) values ($1)', [name])
    await client.query('commit')
  } catch (e) {
    await client.query('rollback')
    throw e
  }
}
await client.end()
console.log('[migrate] baza je ažurna.')
