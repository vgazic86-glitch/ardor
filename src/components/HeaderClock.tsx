import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

const DAYS = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub']
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

interface Weather {
  temp: number
  code: number
  min: number
  max: number
  rain: number
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
  'https://api.open-meteo.com/v1/forecast?latitude=44.7722&longitude=17.191&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=Europe%2FSarajevo&forecast_days=1'

function useWeather() {
  const [w, setW] = useState<Weather | null>(null)
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const cached = sessionStorage.getItem('ardor.vrijeme')
        if (cached) {
          const c = JSON.parse(cached) as Weather
          if (Date.now() - c.at < 30 * 60_000) return alive && setW(c)
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
          at: Date.now(),
        }
        if (alive) setW(next)
        try {
          sessionStorage.setItem('ardor.vrijeme', JSON.stringify(next))
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
        <div className="flex items-center gap-2 rounded-xl border border-walnut-200/80 bg-linen/80 py-1.5 pl-2 pr-3" title={`${d.text} · Banja Luka · danas ${w.min}° do ${w.max}°${w.rain ? ` · kiša ${w.rain} %` : ''}`}>
          <d.Icon className="size-6 text-copper-500" />
          <div className="leading-tight">
            <div className="text-sm font-semibold tabular text-walnut-900">{w.temp}°C</div>
            <div className="text-[10.5px] text-walnut-500">
              BL · {w.min}°/{w.max}°{w.rain >= 30 ? ` · ☂ ${w.rain}%` : ''}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
