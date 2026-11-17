import { createFileRoute } from '@tanstack/react-router'
import { sendWeekly, tokenOk } from '../server/weekly'

/**
 * POST /api/izvjestaj-sedmicni — zove ga GitHub Action (.github/workflows/sedmicni-izvjestaj.yml)
 * ponedjeljkom ujutro, s `Authorization: Bearer <IZVJESTAJ_TOKEN>`. Šalje najviše jednom po sedmici.
 */
export const Route = createFileRoute('/api/izvjestaj-sedmicni')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!process.env.IZVJESTAJ_TOKEN)
          return Response.json({ ok: false, error: 'IZVJESTAJ_TOKEN nije postavljen na serveru.' }, { status: 503 })
        if (!tokenOk(request.headers.get('authorization')))
          return Response.json({ ok: false, error: 'Neispravan token.' }, { status: 401 })
        try {
          return Response.json({ ok: true, ...(await sendWeekly({ scheduled: true })) })
        } catch (e) {
          return Response.json({ ok: false, error: e instanceof Error ? e.message : 'Greška.' }, { status: 500 })
        }
      },
    },
  },
})
