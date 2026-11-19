/**
 * Odjava pri zatvaranju prozora aplikacije (Vladimir, 17. 11. 2026.; dopuna 19. 11.).
 * 1) Kad se zatvara ZADNJA otvorena kartica, preglednik javi serveru „zatvaram” (sendBeacon).
 *    Server prijavu poništi ako se u 20 s ništa ne javi — zato osvježavanje (F5) ne odjavljuje.
 * 2) Kad se aplikacija otvori kao NOVA kartica (nije osvježavanje i nijedna druga kartica nije živa),
 *    prijava se poništava — tako se odjava vidi i kad se prozor ponovo otvori odmah.
 * Više kartica: svaka se svakih 5 s upisuje u localStorage.
 */
import { useEffect } from 'react'

const KEY = 'ardor.kartice'
const FRESH_MS = 12_000
/** sessionStorage: ova kartica je već bila u aplikaciji (osvježavanje ili prijava u ovoj kartici). */
const TAB_KEY = 'ardor.kartica-started'

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

/** Je li ovo nova kartica bez ijedne žive (tada se prijava poništava) — čista funkcija, testira se. */
export function isFreshStart(reloaded: boolean, tabs: Tabs, self: string, now: number) {
  return !reloaded && !otherTabsOpen(tabs, self, now)
}

/** Poziva se nakon uspješne prijave: ova kartica je sada „pokrenuta”, pa osvježavanje ne odjavljuje. */
export function markTabStarted() {
  try {
    sessionStorage.setItem(TAB_KEY, '1')
  } catch {
    /* bez sessionStorage-a: ostaje samo vremenska zaštita na poslužitelju */
  }
}

export function useCloseLogout(enabled: boolean, onFreshStart?: () => void) {
  useEffect(() => {
    if (!enabled) return
    const self = Math.random().toString(36).slice(2)
    let reloaded = false
    try {
      reloaded = sessionStorage.getItem(TAB_KEY) === '1'
    } catch {
      reloaded = true // bez sessionStorage-a ne diramo prijavu na ovom mjestu
    }
    if (isFreshStart(reloaded, read(), self, Date.now())) onFreshStart?.()
    // Ova kartica je sada „pokrenuta”: osvježavanje (F5) i ponovno učitavanje je neće odjaviti.
    markTabStarted()
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
    // onFreshStart se namjerno ne prati: provjera se radi samo pri pokretanju kartice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])
}
