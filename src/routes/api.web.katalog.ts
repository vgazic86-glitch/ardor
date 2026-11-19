import { createFileRoute } from '@tanstack/react-router'
import { publicCatalog } from '../server/web'
import { json, preflight, publicOrigin } from '../server/webHttp'

/** GET /api/web/katalog — artikli označeni „na webu” (javno; bez nabavnih cijena i količina). Čita ga web pri izgradnji. */
export const Route = createFileRoute('/api/web/katalog')({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflight(request),
      GET: async ({ request }) => {
        try {
          const products = await publicCatalog(publicOrigin(request))
          return json(request, { products, updatedAt: new Date().toISOString() }, 200, { 'Cache-Control': 'public, max-age=300' })
        } catch (e) {
          console.error('Web katalog', e)
          return json(request, { products: [], error: 'Katalog trenutno nije dostupan.' }, 500)
        }
      },
    },
  },
})
