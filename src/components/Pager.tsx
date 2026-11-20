import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { count } from '../lib/format'
import { PAGE_SIZE, clampPage, pageButtons, pageCount, pageSlice } from '../lib/paging'

/**
 * Straničenje popisa po 50 redova. `resetKey` (npr. pretraga + kategorija) vraća na prvu stranicu
 * kad se promijeni filter.
 */
export function usePaged<T>(rows: T[], resetKey: string, size = PAGE_SIZE) {
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [resetKey])
  const p = clampPage(page, rows.length, size)
  return { page: p, setPage, pages: pageCount(rows.length, size), total: rows.length, size, rows: pageSlice(rows, p, size) }
}

export function Pager({
  page,
  pages,
  total,
  size = PAGE_SIZE,
  setPage,
  className = '',
}: {
  page: number
  pages: number
  total: number
  size?: number
  setPage: (n: number) => void
  className?: string
}) {
  if (total <= size) return null
  const from = (page - 1) * size + 1
  const to = Math.min(total, page * size)
  const btn = 'grid h-8 min-w-8 place-items-center rounded-lg px-2 text-sm font-semibold tabular'
  return (
    <nav
      aria-label="Stranice"
      className={`flex flex-wrap items-center justify-between gap-3 border-t border-walnut-200/70 px-5 py-3 text-sm no-print ${className}`}
    >
      <span className="text-walnut-600">
        Prikazano {count(from)}–{count(to)} od {count(total)}
      </span>
      <span className="flex flex-wrap items-center gap-1">
        <button
          className={`${btn} text-walnut-700 hover:bg-walnut-100 disabled:opacity-40`}
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          aria-label="Prethodna stranica"
        >
          <ChevronLeft className="size-4" />
        </button>
        {pageButtons(page, pages).map((n, i) =>
          n === null ? (
            <span key={`x${i}`} className="px-1 text-walnut-400">
              …
            </span>
          ) : (
            <button
              key={n}
              className={`${btn} ${n === page ? 'bg-walnut-900 text-linen' : 'text-walnut-700 hover:bg-walnut-100'}`}
              aria-current={n === page ? 'page' : undefined}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ),
        )}
        <button
          className={`${btn} text-walnut-700 hover:bg-walnut-100 disabled:opacity-40`}
          disabled={page >= pages}
          onClick={() => setPage(page + 1)}
          aria-label="Sljedeća stranica"
        >
          <ChevronRight className="size-4" />
        </button>
      </span>
    </nav>
  )
}
