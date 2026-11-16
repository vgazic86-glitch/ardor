import { createFileRoute } from '@tanstack/react-router'
import { Banknote, ChevronLeft, ChevronRight, CreditCard, Landmark, Receipt, Wallet } from 'lucide-react'
import { useState } from 'react'
import { CashUpButton, DeliveryPrintCard, nextWorkday } from '../components/DayPrints'
import { Button, Card, EmptyState, Field, inputCls, PageHeader, Stat } from '../components/ui'
import { date, money2, weekday } from '../lib/format'
import { isRevenue, orderTotal } from '../lib/stats'
import { useStore } from '../lib/store'
import type { PaymentMethod } from '../lib/types'

export const Route = createFileRoute('/pazar')({ component: CashUpPage })

const METHODS: { m: PaymentMethod; icon: typeof Banknote }[] = [
  { m: 'Gotovina', icon: Banknote },
  { m: 'Kartica', icon: CreditCard },
  { m: 'Virman', icon: Landmark },
  { m: 'Rate', icon: Receipt },
]

const shift = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Dnevni zaključak: sve uplate dana po načinu plaćanja, za predaju pazara. */
function CashUpPage() {
  const { orders, today, customerById, employeeById, user } = useStore()
  const [day, setDay] = useState(today)
  const pays = orders
    .flatMap((o) => o.payments.map((p) => ({ p, o })))
    .filter((x) => x.p.date === day)
    .sort((a, b) => a.p.method.localeCompare(b.p.method) || a.o.number.localeCompare(b.o.number))
  const sum = (m?: PaymentMethod) => pays.filter((x) => !m || x.p.method === m).reduce((s, x) => s + x.p.amount, 0)
  const sold = orders.filter((o) => o.date === day && isRevenue(o))
  const offers = orders.filter((o) => o.date === day && o.status === 'ponuda')
  const issued = orders.filter((o) => o.issuedAt === day)

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Prodaja"
        title="Dnevni pazar"
        description="Sve uplate jednog dana po načinu plaćanja — za predaju gotovine i kontrolu kartica. Fiskalni izvještaj i dalje izdaje fiskalni uređaj."
        actions={
          <CashUpButton day={day} />
        }
      />

      <div className="no-print mb-5 flex flex-wrap items-end gap-2">
        <Button variant="outline" aria-label="Prethodni dan" onClick={() => setDay((d) => shift(d, -1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <Field label="Dan">
          <input type="date" className={inputCls} value={day} max={today} onChange={(e) => setDay(e.target.value || today)} />
        </Field>
        <Button variant="outline" aria-label="Sljedeći dan" disabled={day >= today} onClick={() => setDay((d) => shift(d, 1))}>
          <ChevronRight className="size-4" />
        </Button>
        {day !== today && (
          <Button variant="ghost" onClick={() => setDay(today)}>
            Danas
          </Button>
        )}
      </div>

      <h2 className="mb-3 font-display text-xl font-semibold capitalize">
        {weekday(day)}, {date(day)}
      </h2>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat tone="accent" icon={Wallet} label="Ukupno uplaćeno" value={money2(sum())} hint={`${pays.length} uplata`} />
        {METHODS.map(({ m, icon }) => (
          <Stat key={m} icon={icon} label={m} value={money2(sum(m))} hint={`${pays.filter((x) => x.p.method === m).length} uplata`} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card flush title="Uplate" subtitle="avansi i naplate po narudžbama">
          {pays.length === 0 ? (
            <EmptyState icon={Wallet} title="Nema uplata za ovaj dan" />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Način</th>
                  <th>Narudžba</th>
                  <th>Kupac</th>
                  <th>Primio/la</th>
                  <th className="text-right">Iznos</th>
                </tr>
              </thead>
              <tbody>
                {pays.map(({ p, o }) => (
                  <tr key={p.id}>
                    <td className="font-semibold">{p.method}</td>
                    <td className="tabular">{o.number}</td>
                    <td>{customerById(o.customerId).name}</td>
                    <td className="text-walnut-600">{p.employeeId ? employeeById(p.employeeId).name : '—'}</td>
                    <td className="text-right font-semibold tabular">{money2(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={4}>Ukupno</td>
                  <td className="text-right tabular">{money2(sum())}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </Card>

        <div className="space-y-4">
          <DeliveryPrintCard compact day={nextWorkday(day)} title="Plan dostava za sljedeći dan" />
          <Card title="Promet dana">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-walnut-600">Nove narudžbe</dt>
                <dd className="font-semibold tabular">
                  {sold.length} · {money2(sold.reduce((s, o) => s + orderTotal(o), 0))}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-walnut-600">Nove ponude</dt>
                <dd className="font-semibold tabular">{offers.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-walnut-600">Roba izašla iz salona</dt>
                <dd className="font-semibold tabular">{issued.length} narudžbi</dd>
              </div>
            </dl>
          </Card>
          <Card title="Predaja gotovine">
            <div className="space-y-6 pt-2 text-sm">
              <div className="flex justify-between">
                <span className="text-walnut-600">Gotovina za predaju</span>
                <b className="tabular">{money2(sum('Gotovina'))}</b>
              </div>
              <div className="grid grid-cols-2 gap-6 pt-8 text-xs text-walnut-500">
                <div className="border-t border-walnut-400 pt-1">Predao/la</div>
                <div className="border-t border-walnut-400 pt-1">Primio/la</div>
              </div>
              <p className="text-xs text-walnut-500">Zaključak pripremio/la: {user.name}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
