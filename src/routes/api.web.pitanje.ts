import { createFileRoute } from '@tanstack/react-router'
import { answerQuestion } from '../server/web'
import { ipOf, json, originOk, preflight } from '../server/webHttp'

/** POST /api/web/pitanje — pomoćnik za materijale na webu (AI, samo teme namještaja). */
export const Route = createFileRoute('/api/web/pitanje')({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflight(request),
      POST: async ({ request }) => {
        if (!originOk(request)) return json(request, { error: 'Nedozvoljen izvor.' }, 403)
        const body = await request.json().catch(() => null)
        const { status, ...rest } = await answerQuestion(body, ipOf(request))
        return json(request, rest, status)
      },
    },
  },
})
