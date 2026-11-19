import { createFileRoute } from '@tanstack/react-router'
import { readWebImage } from '../server/web'

/** GET /api/web/slike/:id — javna slika artikla, samo ako je artikal vidljiv na webu. */
export const Route = createFileRoute('/api/web/slike/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const f = await readWebImage(Number(params.id))
        if (!f) return new Response('Slika nije pronađena.', { status: 404 })
        const body = new Uint8Array(f.data as Uint8Array)
        return new Response(body, {
          headers: {
            'Content-Type': f.mime,
            'Content-Length': String(body.length),
            // Nova slika artikla = novi id, pa se smije dugo čuvati.
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff',
            'Access-Control-Allow-Origin': '*',
          },
        })
      },
    },
  },
})
