import { createFileRoute } from '@tanstack/react-router'
import { createInquiry } from '../server/web'
import { ipOf, json, originOk, preflight } from '../server/webHttp'

/** POST /api/web/upit — obrazac s web stranice (ponuda / posjet / mjerenje, do 5 fotografija). */
export const Route = createFileRoute('/api/web/upit')({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflight(request),
      POST: async ({ request }) => {
        if (!originOk(request)) return json(request, { ok: false, error: 'Nedozvoljen izvor.' }, 403)
        const len = Number(request.headers.get('content-length') ?? 0)
        if (len > 20 * 1024 * 1024) return json(request, { ok: false, error: 'Upit je prevelik — pošalji manje fotografija.' }, 413)
        try {
          const form = await request.formData()
          const r = await createInquiry(form, ipOf(request))
          return 'error' in r && r.error ? json(request, { ok: false, error: r.error }, r.status) : json(request, { ok: true })
        } catch (e) {
          console.error('Web upit', e)
          return json(request, { ok: false, error: 'Upit nije spremljen. Nazovi nas na 051 433 750.' }, 500)
        }
      },
    },
  },
})
