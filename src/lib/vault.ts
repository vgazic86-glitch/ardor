/** Trezor pristupnih podataka: vrste i tipovi (dijele server i stranica). */
export const VAULT_KINDS = ['email', 'hosting', 'banka', 'drustvene', 'program', 'ostalo'] as const
export type VaultKind = (typeof VAULT_KINDS)[number]

export const VAULT_KIND_LABEL: Record<string, string> = {
  email: 'Službeni mail',
  hosting: 'Hosting, domena i server',
  banka: 'Banka i plaćanja',
  drustvene: 'Društvene mreže i web',
  program: 'Programi i aplikacije',
  ostalo: 'Ostalo',
}

export interface VaultEntry {
  id: string
  kind: string
  title: string
  username: string
  url: string
  hasSecret: boolean
  hasNote: boolean
  updatedBy: string
  updatedAt: string
}

export interface VaultInput {
  id: string | null
  kind: string
  title: string
  username: string
  url: string
  secret: string
  note: string
}

/** Siguran link: samo http(s), inače ništa (bez javascript: i sl.). */
export function safeUrl(url: string) {
  const u = url.trim()
  if (!u) return null
  const full = /^[a-z]+:\/\//i.test(u) ? u : `https://${u}`
  return /^https?:\/\//i.test(full) ? full : null
}
