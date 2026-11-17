import { createFileRoute } from '@tanstack/react-router'
import { markClosing } from '../server/auth'

/**
 * POST /api/zatvaranje — šalje ga preglednik (navigator.sendBeacon) kad se zatvara zadnji prozor aplikacije.
 * Prijava prestaje ako se ista sesija ne javi u 20 s (vidi auth.CLOSE_GRACE_MS); osvježavanje ne odjavljuje.
 */
export const Route = createFileRoute('/api/zatvaranje')({
  server: {
    handlers: {
      POST: async () => {
        await markClosing()
        return new Response(null, { status: 204 })
      },
    },
  },
})
