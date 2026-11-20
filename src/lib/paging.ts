/** Straničenje popisa: koliko stranica, koja je stranica važeća i koji redovi idu na nju. */
export const PAGE_SIZE = 50

export function pageCount(total: number, size = PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / size))
}

/** Stranica se drži u granicama (npr. nakon pretrage ostane manje stranica). Stranice počinju od 1. */
export function clampPage(page: number, total: number, size = PAGE_SIZE) {
  return Math.min(Math.max(1, Math.floor(page) || 1), pageCount(total, size))
}

export function pageSlice<T>(rows: T[], page: number, size = PAGE_SIZE) {
  const p = clampPage(page, rows.length, size)
  return rows.slice((p - 1) * size, p * size)
}

/** Brojevi stranica za gumbe: prva, zadnja i do dvije oko trenutne; null = „…”. */
export function pageButtons(page: number, pages: number): (number | null)[] {
  const set = new Set([1, pages, page - 2, page - 1, page, page + 1, page + 2].filter((n) => n >= 1 && n <= pages))
  const list = [...set].sort((a, b) => a - b)
  const out: (number | null)[] = []
  list.forEach((n, i) => {
    if (i && n - list[i - 1] > 1) out.push(null)
    out.push(n)
  })
  return out
}
