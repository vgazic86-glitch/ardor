import { createFileRoute } from '@tanstack/react-router'
import { currentUser } from '../server/auth'
import { readInquiryPhoto } from '../server/web'

/** GET /api/web-upit-foto/:id — fotografija priložena uz web upit (samo prijavljeni, bez uloge Dostava). */
export const Route = createFileRoute('/api/web-upit-foto/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const u = await currentUser()
        if (!u || u.role === 'dostava') return new Response('Potrebna je prijava.', { status: 401 })
        const f = await readInquiryPhoto(Number(params.id))
        if (!f) return new Response('Fotografija nije pronađena.', { status: 404 })
        const body = new Uint8Array(f.data as Uint8Array)
        return new Response(body, { headers: { 'Content-Type': f.mime, 'Content-Length': String(body.length), 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff' } })
      },
    },
  },
})
