import { Fragment, type ReactNode } from 'react'
import { Logo } from './AppShell'

/**
 * Mali, siguran prikaz Markdowna za dokumente (bez HTML-a iz teksta):
 * naslovi, odlomci, liste, kontrolne liste, tablice, citat, **podebljano**, *kurziv*.
 * Posebni blokovi: [[logo]] i [[colors]] za knjigu grafičkih standarda.
 */

export const BRAND_COLORS = [
  { name: 'Orah 900', hex: '#2b211b', text: 'light' },
  { name: 'Orah 700', hex: '#5a463a', text: 'light' },
  { name: 'Orah 300', hex: '#c9b8a8', text: 'dark' },
  { name: 'Bakar 500', hex: '#b0703b', text: 'light' },
  { name: 'Bakar 400', hex: '#c98d55', text: 'dark' },
  { name: 'Mahovina 600', hex: '#4f6b4a', text: 'light' },
  { name: 'Papir', hex: '#f5f0e8', text: 'dark' },
  { name: 'Lan', hex: '#fcfaf6', text: 'dark' },
] as const

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

function Swatches() {
  return (
    <div className="not-prose my-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {BRAND_COLORS.map((c) => (
        <div
          key={c.hex}
          className="overflow-hidden rounded-xl border border-walnut-200 bg-white"
        >
          <div className="h-20" style={{ background: c.hex }} />
          <div className="px-3 py-2 text-xs">
            <div className="font-semibold text-walnut-900">{c.name}</div>
            <div className="font-mono text-walnut-500">
              {c.hex.toUpperCase()}
            </div>
            <div className="font-mono text-walnut-400">
              RGB {hexToRgb(c.hex)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function LogoBlock() {
  return (
    <div className="not-prose my-5 grid gap-3 sm:grid-cols-2">
      <div className="grid h-36 place-items-center rounded-xl border border-walnut-200 bg-linen">
        <Logo />
      </div>
      <div className="sidebar-bg grid h-36 place-items-center rounded-xl">
        <Logo light />
      </div>
    </div>
  )
}

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    out.push(
      tok.startsWith('**') ? (
        <strong key={k++}>{tok.slice(2, -2)}</strong>
      ) : (
        <em key={k++}>{tok.slice(1, -1)}</em>
      ),
    )
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export const headingId = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Naslovi drugog nivoa, za sadržaj dokumenta. */
export function outline(md: string) {
  return md
    .split('\n')
    .filter((l) => l.startsWith('## '))
    .map((l) => ({ id: headingId(l.slice(3)), text: l.slice(3).trim() }))
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r/g, '').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed) {
      i++
      continue
    }
    if (trimmed === '[[logo]]') {
      blocks.push(<LogoBlock key={key++} />)
      i++
      continue
    }
    if (trimmed === '[[colors]]') {
      blocks.push(<Swatches key={key++} />)
      i++
      continue
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(trimmed)
    if (h) {
      const lvl = h[1].length
      const text = h[2]
      const cls = [
        '',
        'font-display text-3xl font-semibold mt-8 mb-3',
        'font-display text-2xl font-semibold mt-9 mb-3 scroll-mt-24',
        'text-lg font-semibold mt-6 mb-2',
        'font-semibold mt-4 mb-1',
      ][lvl]
      const Tag = (['h1', 'h1', 'h2', 'h3', 'h4'] as const)[lvl]
      blocks.push(
        <Tag key={key++} id={headingId(text)} className={cls}>
          {inline(text)}
        </Tag>,
      )
      i++
      continue
    }
    if (trimmed.startsWith('>')) {
      const buf: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>'))
        buf.push(lines[i++].trim().replace(/^>\s?/, ''))
      blocks.push(
        <blockquote
          key={key++}
          className="my-5 rounded-xl border-l-4 border-copper-400 bg-copper-50 px-5 py-3.5 text-[15px] text-walnut-800"
        >
          {inline(buf.join(' '))}
        </blockquote>,
      )
      continue
    }
    if (trimmed.startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i]
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((c) => c.trim())
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells)
        i++
      }
      const [head, ...body] = rows
      blocks.push(
        <div
          key={key++}
          className="my-5 overflow-x-auto rounded-xl border border-walnut-200"
        >
          <table className="w-full text-sm">
            <thead className="bg-walnut-50">
              <tr>
                {head.map((c, j) => (
                  <th
                    key={j}
                    className="border-b border-walnut-200 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-walnut-600"
                  >
                    {inline(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, ri) => (
                <tr
                  key={ri}
                  className="border-b border-walnut-100 last:border-0"
                >
                  {r.map((c, j) => (
                    <td key={j} className="px-4 py-2.5 align-top">
                      {inline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }
    if (/^(- |\* |\d+\. )/.test(trimmed)) {
      const ordered = /^\d+\. /.test(trimmed)
      const items: string[] = []
      while (i < lines.length && /^(- |\* |\d+\. )/.test(lines[i].trim()))
        items.push(lines[i++].trim().replace(/^(- |\* |\d+\. )/, ''))
      const L = ordered ? 'ol' : 'ul'
      blocks.push(
        <L
          key={key++}
          className={`my-4 space-y-1.5 pl-6 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-copper-500`}
        >
          {items.map((it, j) => {
            const box = /^\[( |x)\]\s+/.exec(it)
            return (
              <li
                key={j}
                className={box ? 'list-none -ml-6 flex items-start gap-2' : ''}
              >
                {box ? (
                  <>
                    <span
                      className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded border ${box[1] === 'x' ? 'border-moss-600 bg-moss-600 text-white' : 'border-walnut-300 bg-white'}`}
                    >
                      {box[1] === 'x' ? '✓' : ''}
                    </span>
                    <span>{inline(it.slice(box[0].length))}</span>
                  </>
                ) : (
                  inline(it)
                )}
              </li>
            )
          })}
        </L>,
      )
      continue
    }
    const buf: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#|>|\||- |\* |\d+\. |\[\[)/.test(lines[i].trim())
    )
      buf.push(lines[i++].trim())
    blocks.push(
      <p key={key++} className="my-3.5 leading-relaxed">
        {inline(buf.join(' '))}
      </p>,
    )
  }

  return (
    <div className="text-[15px] text-walnut-800">
      {blocks.map((b, j) => (
        <Fragment key={j}>{b}</Fragment>
      ))}
    </div>
  )
}
