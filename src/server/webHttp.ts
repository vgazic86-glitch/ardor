/** Pomoćne funkcije za javne rute web stranice: CORS, IP posjetitelja, javna adresa aplikacije. */
import { allowedOrigin } from '../lib/web'

export function corsHeaders(request: Request): Record<string, string> {
  const o = allowedOrigin(request.headers.get('origin'), process.env.WEB_ORIGINS ?? '')
  return o
    ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' }
    : { Vary: 'Origin' }
}

export function preflight(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) })
}

export function json(request: Request, body: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...corsHeaders(request), ...extra } })
}

/** Javni POST smije doći samo s naše web stranice (zaštita od tuđih stranica koje bi slale u naše ime). */
export function originOk(request: Request) {
  const o = request.headers.get('origin')
  return !o || !!allowedOrigin(o, process.env.WEB_ORIGINS ?? '')
}

export function ipOf(request: Request) {
  const f = request.headers.get('x-forwarded-for') ?? ''
  return (f.split(',')[0] || request.headers.get('x-real-ip') || '').trim().slice(0, 60)
}

/** Javna adresa aplikacije (za slike u katalogu). Na Renderu iza proxyja: APP_URL ili x-forwarded-*. */
export function publicOrigin(request: Request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '')
  const u = new URL(request.url)
  const proto = request.headers.get('x-forwarded-proto') ?? u.protocol.replace(':', '')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? u.host
  return `${proto}://${host}`
}
