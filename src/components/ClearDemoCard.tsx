import { Link } from '@tanstack/react-router'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useRemote } from '../lib/remote'
import { useStore } from '../lib/store'
import { clearPreviewFn, clearTransactionsFn } from '../server/api'
import { Modal } from './Modal'
import { Button, Card, inputCls } from './ui'

/**
 * Brisanje primjernih podataka prije stvarnog rada (samo administrator).
 * Dvostruka potvrda: kvačica za kopije + upisano „OBRIŠI”, pa još jedno „Da, obriši” u prozoru.
 */
export function ClearDemoCard() {
  const { user, notify } = useStore()
  const preview = useRemote(() => (user.role === 'admin' ? clearPreviewFn() : Promise.resolve(null)), [user.role])
  const [backup, setBackup] = useState(false)
  const [word, setWord] = useState('')
  const [ask, setAsk] = useState(false)
  const [done, setDone] = useState(false)
  if (user.role !== 'admin') return null
  const p = preview.data
  const ready = backup && word.trim() === 'OBRIŠI'

  async function clear() {
    const ok = await preview.run(() => clearTransactionsFn({ data: { confirm: 'OBRIŠI' } }))
    setAsk(false)
    if (ok) {
      setDone(true)
      setWord('')
      setBackup(false)
      notify('Primjerni podaci su obrisani.')
      // Glavni snimak (prodaje, zalihe…) se osvježi pri sljedećem učitavanju.
      setTimeout(() => window.location.reload(), 1200)
    }
  }

  const del: [string, number | undefined][] = [
    ['prodaja (uz stavke, uplate, rate, dostave)', p?.prodaje],
    ['kupaca', p?.kupci],
    ['uplata', p?.uplate],
    ['primki robe (zaliha svih artikala postaje 0)', p?.primke],
    ['narudžbi dobavljačima', p?.narudzbeDobavljacima],
    ['reklamacija', p?.reklamacije],
    ['zadataka', p?.zadaci],
    ['primjernih troškova', p?.primjerniTroskovi],
    ['primjernih plaća', p?.primjernePlace],
  ]
  const keep: [string, number | undefined][] = [
    ['artikala', p?.artikli],
    ['dobavljača', p?.dobavljaci],
    ['zaposlenika', p?.zaposlenici],
    ['korisnika', p?.korisnici],
  ]

  return (
    <Card
      className="mt-6 border-rose-200"
      title={
        <span className="flex items-center gap-2 text-rose-800">
          <Trash2 className="size-5" /> Brisanje primjernih podataka
        </span>
      }
      subtitle="Jednom, prije stvarnog rada: briše probni promet, a katalog i ljudi ostaju. Ne može se vratiti."
    >
      {done ? (
        <p className="text-sm font-semibold text-emerald-700">Primjerni podaci su obrisani. Sljedeći korak: inventura (Roba → Inventura) da se upiše stvarna zaliha.</p>
      ) : !p ? (
        <p className="text-sm text-walnut-500">{preview.error ?? 'Učitavam…'}</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="text-sm">
            <div className="mb-1 font-semibold text-rose-800">Briše se</div>
            <ul className="space-y-0.5 text-walnut-700">
              {del.map(([l, n]) => (
                <li key={l}>
                  <b className="tabular">{n ?? 0}</b> {l}
                </li>
              ))}
              <li>radno vrijeme, kartice dobavljača, povijest promjena cijena</li>
            </ul>
            <div className="mb-1 mt-3 font-semibold text-emerald-800">Ostaje</div>
            <ul className="space-y-0.5 text-walnut-700">
              {keep.map(([l, n]) => (
                <li key={l}>
                  <b className="tabular">{n ?? 0}</b> {l}
                </li>
              ))}
              <li>planovi prometa, dokumenti firme, kadrovski dosjei, podaci o firmi, dnevnik izmjena</li>
            </ul>
          </div>
          <div className="space-y-3 text-sm">
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={backup} onChange={(e) => setBackup(e.target.checked)} className="mt-0.5 size-4 accent-rose-600" />
              <span>
                Napravljena je kopija: <Link to="/izvjestaji" className="font-semibold text-copper-600 hover:underline">Izvještaji → Kopija svih podataka</Link> (Excel) i kopija baze (pg_dump).
              </span>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-walnut-600">Za potvrdu upišite OBRIŠI</span>
              <input value={word} onChange={(e) => setWord(e.target.value)} className={`${inputCls} mt-1`} placeholder="OBRIŠI" />
            </label>
            <Button variant="danger" disabled={!ready || preview.busy} onClick={() => setAsk(true)}>
              <Trash2 className="size-4" /> Obriši primjerne podatke
            </Button>
            {preview.error && <p className="text-rose-700">{preview.error}</p>}
          </div>
        </div>
      )}
      {ask && (
        <Modal title="Zadnja potvrda" help={false} onClose={() => setAsk(false)}>
          <div className="flex items-start gap-3 text-sm">
            <AlertTriangle className="mt-0.5 size-6 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold">Brišete {p?.prodaje ?? 0} prodaja, {p?.kupci ?? 0} kupaca i sav ostali probni promet.</p>
              <p className="mt-1 text-walnut-600">Ovo se ne može vratiti iz aplikacije — samo iz kopije baze. Zaliha svih artikala bit će 0.</p>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAsk(false)}>
              Odustani
            </Button>
            <Button variant="danger" disabled={preview.busy} onClick={clear}>
              {preview.busy ? 'Brišem…' : 'Da, obriši'}
            </Button>
          </div>
        </Modal>
      )}
    </Card>
  )
}
