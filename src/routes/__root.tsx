import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import { LoginPage } from '../components/LoginPage'
import { areaOf, canSee } from '../lib/access'
import { AppShell } from '../components/AppShell'
import { getSnapshot } from '../server/api'
import { StoreProvider } from '../lib/store'
import { AdminProvider } from '../lib/admin'

import '../styles.css'

const siteName = 'ARDOR namještaj — prodaja, zalihe i knjigovodstvo'
const siteDescription =
  'Interna aplikacija ARDOR namještaj: prodaja po zaposleniku, prijem robe i zalihe, dostave, uplate i knjigovodstveni pregled na jednom mjestu.'

export const Route = createRootRoute({
  loader: () => getSnapshot(),
  staleTime: 30_000,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: siteName },
      { name: 'description', content: siteDescription },
      { property: 'og:title', content: siteName },
      { property: 'og:description', content: siteDescription },
      { property: 'og:type', content: 'website' },
    ],
    links: [
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-lg p-10 text-center">
      <h1 className="font-display text-2xl font-semibold">
        Podaci se trenutno ne mogu učitati
      </h1>
      <p className="mt-2 text-sm text-walnut-700">
        {error instanceof Error ? error.message : String(error)}
      </p>
    </div>
  ),
})

function RootComponent() {
  const { user, data } = Route.useLoaderData()
  const path = useRouterState({ select: (s) => s.location.pathname })
  if (!user || !data) return <LoginPage />
  const area = areaOf(path)
  return (
    <StoreProvider data={data} user={user}>
      <AdminProvider sessionHr={user.hrAccess}>
        <AppShell>{area && !canSee(user, area) ? <NoAccess /> : <Outlet />}</AppShell>
      </AdminProvider>
    </StoreProvider>
  )
}

function NoAccess() {
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <h1 className="font-display text-2xl font-bold">Nemate pristup ovom dijelu</h1>
      <p className="mt-2 text-sm text-walnut-600">Ako vam treba, obratite se administratoru.</p>
      <Link to="/" className="mt-5 inline-block font-semibold text-copper-600 hover:underline">
        Na početnu
      </Link>
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bs">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
