import { Lightbulb, PackageCheck } from 'lucide-react'
import { useState } from 'react'
import { money2 } from '../lib/format'
import { useRemote } from '../lib/remote'
import { useStore } from '../lib/store'
import { purchaseSuggestionsFn, savePurchaseOrderFn } from '../server/api'
import { Modal } from './Modal'
import { Button, EmptyState, inputCls } from './ui'

/** Prijedlog narudžbi dobavljačima: odaberi stavke i napravi nacrte jednim klikom. */
export function PurchaseSuggestions({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { today, seesCosts, notify } = useStore()
  const r = useRemote(() => purchaseSuggestionsFn(), [])
  const [qty, setQty] = useState<Record<string, number>>({})
  const [off, setOff] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [done, setDone] = useState<Record<string, boolean>>({})
  const groups = r.data ?? []

  const create = async (supplierId: string) => {
    const g = groups.find((x) => x.supplierId === supplierId)!
    const lines = g.lines
      .filter((l) => !off[l.productId] && (qty[l.productId] ?? l.qty) > 0)
      .map((l) => ({ productId: l.productId, code: l.sku, name: l.name, qty: qty[l.productId] ?? l.qty, unit: 'kom', price: l.price || null, note: '' }))
    if (!lines.length) return notify('Nijedna stavka nije odabrana.')
    setBusy(supplierId)
    try {
      await savePurchaseOrderFn({ data: { id: null, supplierId, date: today, deliveryBy: null, note: 'Napravljeno iz prijedloga narudžbe.', lines } })
      setDone((d) => ({ ...d, [supplierId]: true }))
      notify(`Nacrt narudžbe za ${g.supplierName} je napravljen.`)
      onCreated()
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Narudžba nije napravljena.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal
      wide
      help={false}
      title="Prijedlog narudžbe"
      subtitle="Šta treba naručiti: rezervacije kupaca + minimalna zaliha + očekivana prodaja tokom roka isporuke, umanjeno za stanje i već naručenu robu."
      onClose={onClose}
    >
      {!r.data ? (
        <p className="py-8 text-center text-sm text-walnut-500">Računam…</p>
      ) : !groups.length ? (
        <EmptyState icon={PackageCheck} title="Sve je pokriveno">
          Nijedan artikal trenutno ne treba naručiti.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.supplierId} className="rounded-2xl border border-walnut-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-walnut-100 px-4 py-3">
                <div>
                  <div className="font-display text-lg font-semibold">{g.supplierName}</div>
                  <div className="text-xs text-walnut-500">Rok isporuke oko {g.leadTimeDays} dana · {g.lines.length} artikala</div>
                </div>
                {done[g.supplierId] ? (
                  <span className="text-sm font-semibold text-emerald-700">✓ Nacrt napravljen</span>
                ) : (
                  <Button size="sm" variant="copper" disabled={busy === g.supplierId} onClick={() => create(g.supplierId)}>
                    {busy === g.supplierId ? 'Pravim…' : 'Napravi nacrt narudžbe'}
                  </Button>
                )}
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wider text-walnut-500">
                  <tr>
                    <th className="w-8 px-4 py-2" />
                    <th className="px-2 py-2">Artikal</th>
                    <th className="px-2 py-2 text-right">Stanje</th>
                    <th className="px-2 py-2 text-right">Rezerv.</th>
                    <th className="px-2 py-2 text-right">Naručeno</th>
                    <th className="px-2 py-2">Zašto</th>
                    <th className="px-4 py-2 text-right">Naručiti</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-walnut-100">
                  {g.lines.map((l) => (
                    <tr key={l.productId} className={off[l.productId] ? 'opacity-40' : ''}>
                      <td className="px-4 py-2">
                        <input type="checkbox" className="size-4 accent-copper-500" checked={!off[l.productId]} onChange={(e) => setOff((o) => ({ ...o, [l.productId]: !e.target.checked }))} />
                      </td>
                      <td className="px-2 py-2">
                        <div className="font-medium">{l.name}</div>
                        <div className="text-xs text-walnut-500">
                          {l.sku}
                          {seesCosts && l.price ? ` · ${money2(l.price)}` : ''}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right tabular">{l.stock}</td>
                      <td className="px-2 py-2 text-right tabular">{l.reserved}</td>
                      <td className="px-2 py-2 text-right tabular">{l.incoming || '—'}</td>
                      <td className="px-2 py-2 text-xs text-walnut-600">{l.reason}</td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          className={`${inputCls} ml-auto w-20 py-1 text-right`}
                          value={qty[l.productId] ?? l.qty}
                          onChange={(e) => setQty((q) => ({ ...q, [l.productId]: Math.max(0, Math.round(Number(e.target.value) || 0)) }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
          <p className="flex items-start gap-2 text-xs text-walnut-500">
            <Lightbulb className="mt-0.5 size-4 text-copper-500" /> Nacrt možete prije slanja još urediti, zaključiti i poslati dobavljaču kao PDF.
          </p>
        </div>
      )}
    </Modal>
  )
}
