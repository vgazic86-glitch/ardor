import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const DAYS = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub']
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

interface Day {
  date: string
  code: number
  min: number
  max: number
  rain: number
  mm: number
  wind: number
}

interface Weather {
  temp: number
  code: number
  min: number
  max: number
  rain: number
  days: Day[]
  at: number
}

/** WMO kod vremena → ikona i opis. */
function describe(code: number) {
  if (code === 0) return { Icon: Sun, text: 'Vedro' }
  if (code <= 2) return { Icon: CloudSun, text: 'Djelimično oblačno' }
  if (code === 3) return { Icon: Cloud, text: 'Oblačno' }
  if (code <= 48) return { Icon: CloudFog, text: 'Magla' }
  if (code <= 57) return { Icon: CloudDrizzle, text: 'Rosulja' }
  if (code <= 67 || (code >= 80 && code <= 82)) return { Icon: CloudRain, text: 'Kiša' }
  if (code <= 77 || code === 85 || code === 86) return { Icon: CloudSnow, text: 'Snijeg' }
  return { Icon: CloudLightning, text: 'Grmljavina' }
}

const URL =
  'https://api.open-meteo.com/v1/forecast?latitude=44.7722&longitude=17.191&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,precipitation_sum,wind_speed_10m_max&timezone=Europe%2FSarajevo&forecast_days=7'

function useWeather() {
  const [w, setW] = useState<Weather | null>(null)
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const cached = sessionStorage.getItem('ardor.vrijeme7')
        if (cached) {
          const c = JSON.parse(cached) as Weather
          if (c.days?.length && Date.now() - c.at < 30 * 60_000) return alive && setW(c)
        }
      } catch {
        /* nije važno */
      }
      try {
        const r = await fetch(URL).then((x) => x.json())
        const next: Weather = {
          temp: Math.round(r.current.temperature_2m),
          code: r.current.weather_code,
          min: Math.round(r.daily.temperature_2m_min[0]),
          max: Math.round(r.daily.temperature_2m_max[0]),
          rain: r.daily.precipitation_probability_max?.[0] ?? 0,
          days: (r.daily.time as string[]).map((date, i) => ({
            date,
            code: r.daily.weather_code[i],
            min: Math.round(r.daily.temperature_2m_min[i]),
            max: Math.round(r.daily.temperature_2m_max[i]),
            rain: r.daily.precipitation_probability_max?.[i] ?? 0,
            mm: Math.round((r.daily.precipitation_sum?.[i] ?? 0) * 10) / 10,
            wind: Math.round(r.daily.wind_speed_10m_max?.[i] ?? 0),
          })),
          at: Date.now(),
        }
        if (alive) setW(next)
        try {
          sessionStorage.setItem('ardor.vrijeme7', JSON.stringify(next))
        } catch {
          /* nije važno */
        }
      } catch {
        /* bez prognoze ako nema mreže */
      }
    }
    load()
    const id = setInterval(load, 30 * 60_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])
  return w
}

/** Datum, sat (uživo) i dnevna prognoza za Banju Luku u gornjoj traci. */
export function HeaderClock() {
  const [now, setNow] = useState<Date | null>(null)
  const w = useWeather()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const off = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', off)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', off)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])
  if (!now) return <div className="mr-2 hidden h-9 w-56 xl:block" />
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Sarajevo', weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  )
  const wd = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day))).getUTCDay()
  const d = w ? describe(w.code) : null
  return (
    <div className="mr-1 hidden items-center gap-3 xl:flex">
      <div className="text-right leading-tight">
        <div className="font-display text-lg font-semibold tabular text-walnut-900">
          {parts.hour}:{parts.minute}
        </div>
        <div className="text-[11px] font-semibold text-walnut-600">
          {DAYS[wd]}, {parts.day}. {MONTHS[Number(parts.month) - 1]} {parts.year}.
        </div>
      </div>
      {w && d && (
        <div className="relative" ref={box}>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex items-center gap-2 rounded-xl border border-walnut-200/80 bg-linen/80 py-1.5 pl-2 pr-3 hover:border-copper-300"
            title={`${d.text} · Banja Luka — klik za prognozu za 7 dana`}
          >
            <d.Icon className="size-6 text-copper-500" />
            <div className="text-left leading-tight">
              <div className="text-sm font-semibold tabular text-walnut-900">{w.temp}°C</div>
              <div className="text-[10.5px] text-walnut-500">
                BL · {w.min}°/{w.max}°{w.rain >= 30 ? ` · ☂ ${w.rain}%` : ''}
              </div>
            </div>
          </button>
          {open && <Week w={w} />}
        </div>
      )}
    </div>
  )
}

/** Prognoza za 7 dana (padajući okvir ispod gumba s vremenom). */
function Week({ w }: { w: Weather }) {
  const lo = Math.min(...w.days.map((x) => x.min))
  const hi = Math.max(...w.days.map((x) => x.max))
  const span = Math.max(1, hi - lo)
  return (
    <div className="toast-in absolute right-0 top-full z-50 mt-2 w-[340px] rounded-2xl border border-walnut-200 bg-paper p-4 shadow-2xl">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="font-display text-lg font-semibold">Banja Luka · 7 dana</div>
        <div className="text-[11px] text-walnut-500">Open-Meteo</div>
      </div>
      <ul className="space-y-1.5">
        {w.days.map((x, i) => {
          const dd = describe(x.code)
          const wd = new Date(`${x.date}T12:00:00Z`).getUTCDay()
          return (
            <li key={x.date} className={`grid grid-cols-[52px_26px_1fr_auto] items-center gap-2 rounded-lg px-1.5 py-1 text-sm ${i === 0 ? 'bg-linen' : ''}`} title={`${dd.text}${x.mm ? ` · ${String(x.mm).replace('.', ',')} mm` : ''} · vjetar do ${x.wind} km/h`}>
              <div className="leading-tight">
                <div className="font-semibold">{i === 0 ? 'Danas' : DAYS[wd]}</div>
                <div className="text-[10.5px] text-walnut-500">
                  {Number(x.date.slice(8))}.{Number(x.date.slice(5, 7))}.
                </div>
              </div>
              <dd.Icon className="size-5 text-copper-500" />
              <div className="flex items-center gap-2">
                <span className="w-7 text-right tabular text-walnut-500">{x.min}°</span>
                <span className="relative h-1.5 flex-1 rounded-full bg-walnut-100">
                  <span
                    className="absolute inset-y-0 rounded-full bg-gradient-to-r from-sky-400 to-copper-500"
                    style={{ left: `${((x.min - lo) / span) * 100}%`, right: `${100 - ((x.max - lo) / span) * 100}%` }}
                  />
                </span>
                <span className="w-7 tabular font-semibold">{x.max}°</span>
              </div>
              <div className={`w-12 text-right text-[11px] tabular ${x.rain >= 50 ? 'font-semibold text-sky-700' : 'text-walnut-500'}`}>{x.rain ? `☂ ${x.rain}%` : ''}</div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
