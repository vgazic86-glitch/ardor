import { createFileRoute } from '@tanstack/react-router'
import { publicContent } from '../server/webCms'
import { json, preflight, publicOrigin } from '../server/webHttp'

/** GET /api/web/sadrzaj — tekstovi weba (zadani + izmjene iz aplikacije) i objavljeni članci. Čita ga web pri izgradnji. */
export const Route = createFileRoute('/api/web/sadrzaj')({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflight(request),
      GET: async ({ request }) => {
        try {
          return json(request, { ...(await publicContent(publicOrigin(request))), updatedAt: new Date().toISOString() }, 200, { 'Cache-Control': 'public, max-age=60' })
        } catch (e) {
          console.error('Web sadržaj', e)
          return json(request, { error: 'Sadržaj trenutno nije dostupan.' }, 500)
        }
      },
    },
  },
})
