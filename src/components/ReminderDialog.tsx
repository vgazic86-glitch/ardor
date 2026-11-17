import { Copy, MessageCircle, Phone } from 'lucide-react'
import { useState } from 'react'
import { reminderText, type Receivable } from '../lib/collection'
import { useStore } from '../lib/store'
import { intlPhone } from './CustomerMessage'
import { Modal } from './Modal'

/** Podsjetnik kupcu za uplatu. Svaki klik na kanal upisuje „podsjećen” (ko, kada, kako). */
export function ReminderDialog({ r, onClose }: { r: Receivable; onClose: () => void }) {
  const { customerById, recordReminder, notify } = useStore()
  const c = customerById(r.order.customerId)
  const [text, setText] = useState(() => reminderText(r, c))
  const phone = intlPhone(c.phone)
  const enc = encodeURIComponent(text)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      notify('Poruka je kopirana.')
    } catch {
      notify('Kopiranje nije uspjelo — označite tekst i kopirajte ručno.')
    }
  }
  const sent = (channel: string) => void recordReminder(r.order.id, channel)

  return (
    <Modal title={`Podsjetnik: ${c.name}`} subtitle={`Prodaja ${r.order.number}`} help="naplata" onClose={onClose}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        className="w-full rounded-lg border border-walnut-200 bg-white px-3 py-2 text-sm"
      />
      {!phone && <p className="mt-1 text-xs text-amber-700">Kupac nema upisan broj telefona — poruku možete samo kopirati.</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {phone && (
          <>
            <a
              href={`https://wa.me/${phone}?text=${enc}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => sent('WhatsApp')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white"
            >
              <MessageCircle className="size-3.5" /> WhatsApp
            </a>
            <a
              href={`viber://chat?number=%2B${phone}`}
              onClick={() => {
                void copy()
                sent('Viber')
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#7360F2] px-3 py-1.5 text-xs font-semibold text-white"
              title="Otvara Viber; tekst je kopiran — zalijepite ga u razgovor"
            >
              <MessageCircle className="size-3.5" /> Viber
            </a>
            <a
              href={`sms:+${phone}?&body=${enc}`}
              onClick={() => sent('SMS')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-walnut-200 bg-linen px-3 py-1.5 text-xs font-semibold"
            >
              <Phone className="size-3.5" /> SMS
            </a>
            <a
              href={`tel:+${phone}`}
              onClick={() => sent('poziv')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-walnut-200 bg-linen px-3 py-1.5 text-xs font-semibold"
            >
              <Phone className="size-3.5" /> Nazovi
            </a>
          </>
        )}
        <button
          onClick={() => {
            void copy()
            sent('kopirano')
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-walnut-200 bg-linen px-3 py-1.5 text-xs font-semibold"
        >
          <Copy className="size-3.5" /> Kopiraj
        </button>
      </div>
      <p className="mt-2 text-[11px] text-walnut-500">
        Klik na bilo koji kanal bilježi da je kupac podsjećen. Viber ne prima gotov tekst — tekst se kopira, pa ga u razgovoru samo zalijepite.
      </p>
    </Modal>
  )
}
