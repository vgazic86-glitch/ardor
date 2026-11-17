/**
 * Odjava pri zatvaranju prozora aplikacije (Vladimir, 17. 11. 2026.).
 * Kad se zatvara ZADNJA otvorena kartica, preglednik javi serveru „zatvaram” (sendBeacon).
 * Server prijavu poništi ako se u 20 s ništa ne javi — zato osvježavanje (F5) ne odjavljuje.
 * Više kartica: svaka se svakih 5 s upisuje u localStorage; odjava se šalje samo ako drugih nema.
 */
import { useEffect } from 'react'

const KEY = 'ardor.kartice'
const FRESH_MS = 12_000

type Tabs = Record<string, number>

function read(): Tabs {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Tabs
  } catch {
    return {}
  }
}
function write(t: Tabs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(t))
  } catch {
    /* privatni prozor: tada se ponaša kao jedna kartica */
  }
}

/** Ima li drugih živih kartica osim ove (čista funkcija — testira se). */
export function otherTabsOpen(tabs: Tabs, self: string, now: number) {
  return Object.entries(tabs).some(([id, ts]) => id !== self && now - ts < FRESH_MS)
}

export function useCloseLogout(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const self = Math.random().toString(36).slice(2)
    const beat = () => {
      const now = Date.now()
      const tabs = read()
      for (const [id, ts] of Object.entries(tabs)) if (now - ts > FRESH_MS) delete tabs[id]
      tabs[self] = now
      write(tabs)
    }
    beat()
    const timer = setInterval(beat, 5_000)
    const onHide = () => {
      const tabs = read()
      delete tabs[self]
      write(tabs)
      if (!otherTabsOpen(tabs, self, Date.now())) navigator.sendBeacon?.('/api/zatvaranje')
    }
    // Povratak na stranicu iz predmemorije preglednika (Natrag): opet se upiši.
    const onShow = (e: PageTransitionEvent) => e.persisted && beat()
    window.addEventListener('pagehide', onHide)
    window.addEventListener('pageshow', onShow)
    return () => {
      clearInterval(timer)
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('pageshow', onShow)
      const tabs = read()
      delete tabs[self]
      write(tabs)
    }
  }, [enabled])
}
