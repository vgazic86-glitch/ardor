/** Učitavanje podataka koji nisu dio glavnog snimka (narudžbe dobavljačima, kartice, radno vrijeme). */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from './store'

export function useRemote<T>(load: () => Promise<T>, deps: unknown[]) {
  const { notify } = useStore()
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const loader = useRef(load)
  loader.current = load

  const reload = useCallback(async () => {
    try {
      setData(await loader.current())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Greška pri učitavanju.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    reload()
  }, [reload])

  /** Izvrši radnju, osvježi podatke i javi poruku. Vraća rezultat (ili true) ili null uz grešku. */
  const run = useCallback(
    async <R,>(fn: () => Promise<R>, ok?: string): Promise<R | null> => {
      setBusy(true)
      setError(null)
      try {
        const r = await fn()
        await reload()
        if (ok) notify(ok)
        // radnje bez povratne vrijednosti vraćaju true, da se uspjeh može provjeriti
        return (r === undefined ? true : r) as R
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Radnja nije uspjela.')
        return null
      } finally {
        setBusy(false)
      }
    },
    [reload, notify],
  )

  return { data, error, busy, reload, run, clearError: () => setError(null) }
}
