import { ClipboardCheck, FileSignature, Printer, Truck, Warehouse } from 'lucide-react'
import { useState } from 'react'
import { openDownload } from '../lib/files'
import { date, weekday } from '../lib/format'
import { useStore } from '../lib/store'
import { cashUpPdfFn, deliveryPlanPdfFn } from '../server/api'
import { Avatar, Button, Card } from './ui'

export const nextWorkday = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`)
  do d.setUTCDate(d.getUTCDate() + 1)
  while (d.getUTCDay() === 0)
  return d.toISOString().slice(0, 10)
}

function usePdf() {
  const { notify } = useStore()
  const [busy, setBusy] = useState<string | null>(null)
  const run = async (key: string, fn: () => Promise<{ name: string; data: string }>) => {
    setBusy(key)
    try {
      const f = await fn()
      openDownload({ name: f.name, mime: 'application/pdf', dataB64: f.data })
    } catch (e) {
      notify(e instanceof Error ? e.message : 'PDF nije izrađen.')
    } finally {
      setBusy(null)
    }
  }
  return { busy, run }
}

/** Dugme za PDF dnevnog zaključka. */
export function CashUpButton({ day }: { day: string }) {
  const { busy, run } = usePdf()
  return (
    <Button variant="copper" disabled={!!busy} onClick={() => run('z', () => cashUpPdfFn({ data: { day } }))}>
      <Printer className="size-4" /> {busy ? 'Pripremam…' : 'Ispis zaključka (PDF)'}
    </Button>
  )
}

/** Plan dostava za dan: pregled po vozaču i tri obrasca za štampu. */
export function DeliveryPrintCard({ day, title, compact = false }: { day: string; title?: string; compact?: boolean }) {
  const { orders, employees, customerById } = useStore()
  const { busy, run } = usePdf()
  const list = orders
    .filter((o) => o.delivery && o.delivery.date === day && o.status !== 'otkazana' && o.delivery.status !== 'dostavljeno')
    .sort((a, b) => a.delivery!.slot.localeCompare(b.delivery!.slot))
  const drivers = [...new Set(list.map((o) => o.delivery!.driverId))]
  const docs = [
    { kind: 'skladiste' as const, label: 'Skladište', hint: 'priprema i utovar', icon: Warehouse },
    { kind: 'dostavljaci' as const, label: 'Dostavljači', hint: 'nalog po vozaču', icon: Truck },
    { kind: 'potvrde' as const, label: 'Potvrde za kupce', hint: 'kupac potpisuje', icon: FileSignature },
  ]
  return (
    <Card
      className="no-print"
      title={
        <span className="flex items-center gap-2">
          <ClipboardCheck className="size-5 text-copper-600" /> {title ?? 'Plan dostava'}
        </span>
      }
      subtitle={`${weekday(day)}, ${date(day)} · ${list.length} ${list.length === 1 ? 'dostava' : 'dostava'}`}
    >
      {list.length === 0 ? (
        <p className="text-sm text-walnut-500">Za taj dan nema zakazanih dostava.</p>
      ) : (
        <>
          <div className="mb-4 space-y-2">
            {drivers.map((d) => {
              const e = employees.find((x) => x.id === d)
              const mine = list.filter((o) => o.delivery!.driverId === d)
              return (
                <div key={d} className="flex items-start gap-3 rounded-xl border border-walnut-200/70 bg-white px-3 py-2.5">
                  {e && <Avatar employee={e} size="sm" />}
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="font-semibold">{e?.name ?? 'Bez vozača'}</div>
                    <div className="truncate text-xs text-walnut-500">
                      {mine.map((o) => `${o.delivery!.slot} ${customerById(o.customerId).name} (${o.delivery!.city})`).join(' · ')}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-walnut-600">{mine.length}</span>
                </div>
              )
            })}
          </div>
          <div className={`grid gap-2 ${compact ? '' : 'sm:grid-cols-3'}`}>
            {docs.map(({ kind, label, hint, icon: Icon }) => (
              <button
                key={kind}
                disabled={!!busy}
                onClick={() => run(kind, () => deliveryPlanPdfFn({ data: { day, kind } }))}
                className="flex items-center gap-3 rounded-xl border border-walnut-200 bg-linen px-3 py-2.5 text-left transition-colors hover:border-copper-300 hover:bg-copper-50 disabled:opacity-50"
              >
                <Icon className="size-5 shrink-0 text-copper-600" />
                <span>
                  <span className="block text-sm font-semibold">{busy === kind ? 'Pripremam…' : label}</span>
                  <span className="block text-xs text-walnut-500">{hint}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
