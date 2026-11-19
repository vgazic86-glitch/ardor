import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../lib/store'
import { Modal } from './Modal'
import { Button, inputCls } from './ui'

/** Kategorije artikala: dodavanje i brisanje. Kategoriju koju koristi neki artikal ne može se obrisati. */
export function CategoriesDialog({ onClose }: { onClose: () => void }) {
  const { categories, products, addCategory, deleteCategory, busy } = useStore()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const usedBy = (c: string) => products.filter((p) => p.category === c).length

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await addCategory(name)
    if (res) setName('')
  }

  return (
    <Modal
      title="Kategorije artikala"
      subtitle="Ovdje dodajete i brišete kategorije. Artikl bira kategoriju s ovog popisa. Kategoriju koju koristi neki artikal prvo premjestite na drugu, pa je tek onda obrišite."
      onClose={onClose}
      help={false}
      footer={
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Zatvori
          </Button>
        </div>
      }
    >
      <form onSubmit={add} className="mb-5 flex gap-2">
        <input
          className={inputCls}
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          placeholder="Naziv nove kategorije, npr. Dječje sobe"
          aria-label="Naziv nove kategorije"
        />
        <Button type="submit" disabled={busy || !name.trim()}>
          <Plus className="size-4" /> Dodaj
        </Button>
      </form>
      {error && <p className="mb-3 text-sm text-rose-700">{error}</p>}
      <ul className="divide-y divide-walnut-100 rounded-xl border border-walnut-200 bg-white">
        {categories.length === 0 && <li className="px-4 py-3 text-sm text-walnut-500">Još nema kategorija.</li>}
        {categories.map((c) => {
          const n = usedBy(c)
          return (
            <li key={c} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex-1 font-medium">{c}</span>
              <span className="text-xs text-walnut-500">{n} {n === 1 ? 'artikal' : 'artikala'}</span>
              <button
                type="button"
                disabled={busy || n > 0}
                title={n > 0 ? 'Kategorija se koristi. Prvo premjestite artikle u drugu kategoriju.' : 'Obriši kategoriju'}
                onClick={async () => {
                  setError('')
                  const res = await deleteCategory(c)
                  if (!res) setError(`Kategoriju „${c}” nije bilo moguće obrisati.`)
                }}
                className="rounded-lg p-1.5 text-walnut-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label={`Obriši kategoriju ${c}`}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}
