import { createFileRoute } from '@tanstack/react-router'
import { currentUser } from '../server/auth'
import { readWebMedia } from '../server/webCms'

/** GET /api/web/mediji/:id — fotografija naslovnice ili članka (javno samo ono što je objavljeno). */
export const Route = createFileRoute('/api/web/mediji/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const f = await readWebMedia(Number(params.id), !!(await currentUser().catch(() => null)))
        if (!f) return new Response('Fotografija nije pronađena.', { status: 404 })
        const body = new Uint8Array(f.data as Uint8Array)
        return new Response(body, {
          headers: {
            'Content-Type': f.mime,
            'Content-Length': String(body.length),
            // Nova fotografija = novi id, pa se smije dugo čuvati.
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff',
            'Access-Control-Allow-Origin': '*',
          },
        })
      },
    },
  },
})
