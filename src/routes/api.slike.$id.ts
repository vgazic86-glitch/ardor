import { createFileRoute } from '@tanstack/react-router'
import { readProductImage } from '../server/images'

/** Javna adresa za slike artikala: /api/slike/:id (samo slike povezane s artiklom). */
export const Route = createFileRoute('/api/slike/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const f = await readProductImage(Number(params.id))
        if (!f) return new Response('Slika nije pronađena.', { status: 404 })
        const body = new Uint8Array(f.data as Uint8Array)
        return new Response(body, {
          headers: {
            'Content-Type': f.mime,
            'Content-Length': String(body.length),
            // Svaka nova slika dobija novi id, pa se smije dugo čuvati u pregledniku.
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff',
          },
        })
      },
    },
  },
})
