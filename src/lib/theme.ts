/** Svijetli / tamni način. Izbor se pamti u pregledniku (po uređaju), klasa `.dark` je na <html>. */
import { useEffect, useState } from 'react'

const KEY = 'ardor.tema'
const EVENT = 'ardor-tema'

export type Theme = 'svijetli' | 'tamni'

/** Skripta u <head> koja postavi temu prije iscrtavanja (bez bljeska svijetle stranice). */
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem('${KEY}')==='tamni')document.documentElement.classList.add('dark')}catch(e){}`

export function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'svijetli'
  return document.documentElement.classList.contains('dark') ? 'tamni' : 'svijetli'
}

export function setTheme(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'tamni')
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* privatni prozor — vrijedi do zatvaranja */
  }
  window.dispatchEvent(new Event(EVENT))
}

/** Trenutna tema; komponenta se ponovo iscrta kad se tema promijeni (npr. grafikoni). */
export function useTheme(): Theme {
  const [t, setT] = useState<Theme>('svijetli')
  useEffect(() => {
    setT(currentTheme())
    const on = () => setT(currentTheme())
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  return t
}
