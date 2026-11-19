import { createFileRoute } from '@tanstack/react-router'
import { advise } from '../server/web'
import { ipOf, json, originOk, preflight } from '../server/webHttp'

/** POST /api/web/savjetnik — AI prijedlog za AI prostornog savjetnika na webu (bez osobnih podataka). */
export const Route = createFileRoute('/api/web/savjetnik')({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflight(request),
      POST: async ({ request }) => {
        if (!originOk(request)) return json(request, { error: 'Nedozvoljen izvor.' }, 403)
        const body = await request.json().catch(() => null)
        const { status, ...rest } = await advise(body, ipOf(request))
        return json(request, rest, status)
      },
    },
  },
})
