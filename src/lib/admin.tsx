import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  adminChangeFn,
  adminLoginFn,
  adminSetupFn,
  adminStatusFn,
} from '../server/api'

/**
 * Upravljačka lozinka: štiti kadrovski dio (plaće, ugovori, bonusi) i uređivanje dokumenata.
 * Lozinka se nikad ne čuva u pregledniku — samo vremenski ograničen token (12 h).
 */
interface Admin {
  token: string | null
  status: { configured: boolean; fromEnv: boolean } | null
  login: (password: string) => Promise<void>
  setup: (password: string) => Promise<void>
  change: (oldPassword: string, newPassword: string) => Promise<void>
  logout: () => void
  /** Pozvati kad server javi da je prijava istekla. */
  expire: () => void
}

const Ctx = createContext<Admin | null>(null)
const KEY = 'ardor.admin'

function readToken() {
  try {
    const t = window.sessionStorage.getItem(KEY)
    if (t && Number(t.split('.')[0]) > Date.now()) return t
  } catch {
    /* preglednik ne dozvoljava sessionStorage */
  }
  return null
}
function writeToken(t: string | null) {
  try {
    if (t) window.sessionStorage.setItem(KEY, t)
    else window.sessionStorage.removeItem(KEY)
  } catch {
    /* ignoriši */
  }
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<Admin['status']>(null)

  useEffect(() => {
    setToken(readToken())
    adminStatusFn()
      .then(setStatus)
      .catch(() => setStatus({ configured: false, fromEnv: false }))
  }, [])

  const apply = useCallback((t: string | null) => {
    writeToken(t)
    setToken(t)
  }, [])

  const value = useMemo<Admin>(
    () => ({
      token,
      status,
      async login(password) {
        const r = await adminLoginFn({ data: { password } })
        apply(r.token)
      },
      async setup(password) {
        const r = await adminSetupFn({ data: { password } })
        apply(r.token)
        setStatus({ configured: true, fromEnv: false })
      },
      async change(oldPassword, newPassword) {
        if (!token) throw new Error('Niste prijavljeni.')
        const r = await adminChangeFn({
          data: { token, oldPassword, newPassword },
        })
        apply(r.token)
      },
      logout: () => apply(null),
      expire: () => apply(null),
    }),
    [token, status, apply],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAdmin() {
  const a = useContext(Ctx)
  if (!a) throw new Error('useAdmin must be used inside AdminProvider')
  return a
}

/** Da li greška znači da je prijava istekla / nevažeća. */
export const isAuthError = (e: unknown) =>
  e instanceof Error && /prijav|lozink/i.test(e.message)
