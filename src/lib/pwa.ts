/** Instalacija aplikacije na mobitel/računar (PWA). */
import { useEffect, useState } from 'react'

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: PromptEvent | null = null
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as PromptEvent
    listeners.forEach((l) => l())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((l) => l())
  })
}

export function registerServiceWorker() {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
}

/** Može li se aplikacija instalirati (Android/Chrome/Edge) i je li to iPhone (ručno: Dijeli → Dodaj na početni zaslon). */
export function useInstall() {
  const [, force] = useState(0)
  const [standalone, setStandalone] = useState(false)
  const [ios, setIos] = useState(false)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    setStandalone(window.matchMedia('(display-mode: standalone)').matches)
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent))
    return () => {
      listeners.delete(l)
    }
  }, [])
  return {
    canInstall: !!deferred && !standalone,
    iosHint: ios && !standalone,
    install: async () => {
      if (!deferred) return
      await deferred.prompt()
      deferred = null
      force((n) => n + 1)
    },
  }
}
