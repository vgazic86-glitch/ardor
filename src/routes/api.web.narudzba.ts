import { createFileRoute } from '@tanstack/react-router'
import { createWebOrder } from '../server/webOrders'
import { ipOf, json, originOk, preflight } from '../server/webHttp'

/** POST /api/web/narudzba — košarica s web stranice (JSON; plaćanje pouzećem, predračunom, u salonu ili na rate). */
export const Route = createFileRoute('/api/web/narudzba')({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflight(request),
      POST: async ({ request }) => {
        if (!originOk(request)) return json(request, { ok: false, error: 'Nedozvoljen izvor.' }, 403)
        if (Number(request.headers.get('content-length') ?? 0) > 64 * 1024) return json(request, { ok: false, error: 'Narudžba je prevelika.' }, 413)
        try {
          const body = await request.json().catch(() => null)
          const r = await createWebOrder(body, ipOf(request))
          return 'error' in r && r.error ? json(request, { ok: false, error: r.error }, r.status) : json(request, { ok: true, number: 'number' in r ? r.number : '' })
        } catch (e) {
          console.error('Web narudžba', e)
          return json(request, { ok: false, error: 'Narudžba nije spremljena. Nazovi nas na 066 277 222.' }, 500)
        }
      },
    },
  },
})
