import { CheckCircle2, Eye, Mail, Send, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useRemote } from '../lib/remote'
import { date } from '../lib/format'
import { weeklyPreviewFn, weeklySendTestFn, weeklyStatusFn } from '../server/api'
import { Modal } from './Modal'
import { Badge, Button, Card } from './ui'

/** Sedmični izvještaj upravi (e-pošta ponedjeljkom u 7:00): stanje, pregled i probno slanje. */
export function WeeklyReportCard() {
  const status = useRemote(() => weeklyStatusFn(), [])
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const s = status.data
  const ready = !!s && s.resend && s.token && s.recipients.length > 0

  async function openPreview() {
    setLoading(true)
    try {
      setPreview(await weeklyPreviewFn())
    } finally {
      setLoading(false)
    }
  }

  const Check = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
    <li className="flex items-start gap-2">
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
      ) : (
        <XCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
      )}
      <span>{children}</span>
    </li>
  )

  return (
    <Card
      className="mt-6"
      title="Sedmični izvještaj e-poštom"
      subtitle="Svakog ponedjeljka u 7:00 upravi stiže pregled prošle sedmice"
      action={s ? <Badge tone={ready ? 'good' : 'warn'}>{ready ? 'Uključeno' : 'Nije podešeno'}</Badge> : null}
    >
      {!s ? (
        <p className="text-sm text-walnut-500">{status.error ?? 'Učitavam…'}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <ul className="space-y-1.5 text-sm">
            <Check ok={s.recipients.length > 0}>
              Primaoci:{' '}
              {s.recipients.length
                ? s.recipients.map((r) => `${r.name} (${r.email})`).join(', ')
                : 'nema — upišite e-poštu administratoru ili upravi u Korisnici i pristup'}
            </Check>
            <Check ok={s.resend}>Servis za e-poštu (Resend) {s.resend ? 'je povezan' : 'nije povezan'}</Check>
            <Check ok={s.token}>Automatsko slanje (GitHub) {s.token ? 'je podešeno' : 'nije podešeno'}</Check>
            <li className="pl-6 text-xs text-walnut-500">
              Pošiljalac: {s.from}
              {s.lastWeekSent ? ` · zadnji poslan za sedmicu od ${date(s.lastWeekSent)}` : ''}
            </li>
          </ul>
          <div className="flex flex-wrap content-start gap-2 md:justify-end">
            <Button variant="outline" onClick={openPreview} disabled={loading}>
              <Eye className="size-4" /> {loading ? 'Pripremam…' : 'Pregled poruke'}
            </Button>
            <Button
              disabled={!s.resend || !s.recipients.length || status.busy}
              onClick={() =>
                status.run(() => weeklySendTestFn(), 'Probni izvještaj je poslan.')
              }
            >
              <Send className="size-4" /> {status.busy ? 'Šaljem…' : 'Pošalji probni primjerak'}
            </Button>
          </div>
          {status.error && <p className="text-sm text-rose-700 md:col-span-2">{status.error}</p>}
        </div>
      )}
      {preview && (
        <Modal title="Pregled sedmičnog izvještaja" subtitle={preview.subject} wide help={false} onClose={() => setPreview(null)}>
          <div className="mb-2 flex items-center gap-2 text-xs text-walnut-500">
            <Mail className="size-3.5" /> Ovako poruka izgleda u e-pošti.
          </div>
          <iframe
            title="Pregled sedmičnog izvještaja"
            srcDoc={preview.html}
            // Bez skripti; allow-same-origin treba da se srcDoc prikaže u svim preglednicima.
            sandbox="allow-same-origin"
            className="h-[70vh] w-full rounded-lg border border-walnut-200 bg-white"
          />
        </Modal>
      )}
    </Card>
  )
}
