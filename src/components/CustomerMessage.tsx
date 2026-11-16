import { Link } from '@tanstack/react-router'
import { Copy, MessageCircle, MessageSquareText, Phone, Wrench } from 'lucide-react'
import { useState } from 'react'
import { money } from '../lib/format'
import { useStore } from '../lib/store'
import type { Customer, Order } from '../lib/types'

/** Broj za WhatsApp/Viber/SMS u međunarodnom obliku (BiH: 061… → 38761…). */
export function intlPhone(raw: string) {
  let d = (raw || '').replace(/[^\d+]/g, '')
  if (d.startsWith('+')) d = d.slice(1)
  else if (d.startsWith('00')) d = d.slice(2)
  else if (d.startsWith('0')) d = `387${d.slice(1)}`
  return d.length >= 8 ? d : ''
}

const DAY = ['nedjelja', 'ponedjeljak', 'utorak', 'srijeda', 'četvrtak', 'petak', 'subota']
const when = (iso: string) => `${DAY[new Date(`${iso}T12:00:00Z`).getUTCDay()]}, ${Number(iso.slice(8, 10))}.${Number(iso.slice(5, 7))}.${iso.slice(0, 4)}.`

type Kind = 'dostava' | 'stigla' | 'uplata' | 'hvala'

function message(kind: Kind, o: Order, c: Customer, left: number) {
  const ime = c.name.split(' ')[0] || c.name
  const pozdrav = `Poštovani/a ${ime},`
  const potpis = '\n\nARDOR namještaj, Banja Luka'
  if (kind === 'dostava' && o.delivery)
    return `${pozdrav}\n\nVaša dostava (narudžba ${o.number}) zakazana je za ${when(o.delivery.date)}, u terminu ${o.delivery.slot} h.\nAdresa: ${o.delivery.address}, ${o.delivery.city}.${left > 0.5 ? `\nPri preuzimanju za naplatu: ${money(left)}.` : ''}\n\nAko Vam termin ne odgovara, javite nam se.${potpis}`
  if (kind === 'stigla')
    return `${pozdrav}\n\nroba za Vašu narudžbu ${o.number} stigla je u naš salon. Javite nam kada Vam odgovara dostava ili preuzimanje.${potpis}`
  if (kind === 'uplata')
    return `${pozdrav}\n\nljubazno podsjećamo da je za narudžbu ${o.number} preostalo za uplatu ${money(left)}. Uplatu možete izvršiti u salonu ili pri preuzimanju robe.${potpis}`
  return `${pozdrav}\n\nhvala što ste odabrali ARDOR namještaj! Nadamo se da ste zadovoljni novim namještajem. Ako bilo šta nije kako treba, slobodno nam se javite.${potpis}`
}

/** Poruka kupcu (Viber, WhatsApp, SMS) i prijava reklamacije iz narudžbe. */
export function CustomerMessage({ order, customer, left }: { order: Order; customer: Customer; left: number }) {
  const { notify } = useStore()
  const kinds: { k: Kind; label: string }[] = []
  if (order.delivery && order.delivery.status !== 'dostavljeno') kinds.push({ k: 'dostava', label: 'Termin dostave' })
  if (order.status === 'spremna') kinds.push({ k: 'stigla', label: 'Roba je stigla' })
  if (left > 0.5 && order.status !== 'ponuda' && order.status !== 'otkazana') kinds.push({ k: 'uplata', label: 'Ostatak za uplatu' })
  if (order.status === 'isporučena') kinds.push({ k: 'hvala', label: 'Zahvala' })
  const [kind, setKind] = useState<Kind | null>(kinds[0]?.k ?? null)
  const [text, setText] = useState(kind ? message(kind, order, customer, left) : '')
  const phone = intlPhone(customer.phone)
  const canComplain = order.status === 'isporučena' || !!order.issuedAt

  if (!kinds.length && !canComplain) return null
  const pick = (k: Kind) => {
    setKind(k)
    setText(message(k, order, customer, left))
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      notify('Poruka je kopirana.')
    } catch {
      notify('Kopiranje nije uspjelo — označite tekst i kopirajte ručno.')
    }
  }
  const enc = encodeURIComponent(text)

  return (
    <div className="mt-6 rounded-2xl border border-walnut-200 p-4 print:hidden">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-walnut-500">
          <MessageSquareText className="size-4 text-copper-500" /> Poruka kupcu
        </span>
        {canComplain && (
          <Link to="/reklamacije" search={{ nova: order.id }} className="flex items-center gap-1 text-xs font-semibold text-copper-600 hover:underline">
            <Wrench className="size-3.5" /> Reklamacija
          </Link>
        )}
      </div>
      {kinds.length > 0 ? (
        <>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {kinds.map((x) => (
              <button
                key={x.k}
                onClick={() => pick(x.k)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${kind === x.k ? 'bg-walnut-900 text-linen' : 'border border-walnut-200 bg-linen text-walnut-700 hover:border-copper-300'}`}
              >
                {x.label}
              </button>
            ))}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className="w-full rounded-lg border border-walnut-200 bg-white px-3 py-2 text-sm" />
          {!phone && <p className="mt-1 text-xs text-amber-700">Kupac nema upisan broj telefona — poruku možete samo kopirati.</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {phone && (
              <>
                <a href={`https://wa.me/${phone}?text=${enc}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white">
                  <MessageCircle className="size-3.5" /> WhatsApp
                </a>
                <a href={`viber://chat?number=%2B${phone}`} onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg bg-[#7360F2] px-3 py-1.5 text-xs font-semibold text-white" title="Otvara Viber; tekst je kopiran — zalijepite ga u razgovor">
                  <MessageCircle className="size-3.5" /> Viber
                </a>
                <a href={`sms:+${phone}?&body=${enc}`} className="inline-flex items-center gap-1.5 rounded-lg border border-walnut-200 bg-linen px-3 py-1.5 text-xs font-semibold">
                  <Phone className="size-3.5" /> SMS
                </a>
              </>
            )}
            <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-walnut-200 bg-linen px-3 py-1.5 text-xs font-semibold">
              <Copy className="size-3.5" /> Kopiraj
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-walnut-500">Viber ne prima gotov tekst — tekst se kopira, pa ga u razgovoru samo zalijepite.</p>
        </>
      ) : (
        <p className="text-xs text-walnut-500">Za ovu narudžbu trenutno nema pripremljene poruke.</p>
      )}
    </div>
  )
}
