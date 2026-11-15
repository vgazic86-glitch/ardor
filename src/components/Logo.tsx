import { BRAND, MARK, TAGLINE, WORDMARK } from '../lib/brand'

/** Znak ARDOR: dva preklopljena kvadrata (estetika + funkcionalnost). */
export function BrandMark({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="485 79 56.5 56.5" className={className} aria-hidden>
      <path fill={BRAND.red} d={MARK.red} />
      <path fill={BRAND.gray} d={MARK.gray} />
      <path fill={BRAND.orange} d={MARK.orange} />
    </svg>
  )
}

/**
 * Puni logotip „ARDOR namještaj” prema knjizi grafičkih standarda.
 * `light` = negativ: cijeli logotip bijel, za tamne podloge (40–100 % crne, siva, fotografije).
 */
export function Logo({
  light = false,
  className = 'h-9',
}: {
  light?: boolean
  className?: string
}) {
  return (
    <svg
      viewBox="484 78 263 59"
      className={className}
      role="img"
      aria-label="ARDOR namještaj"
    >
      <path fill={light ? '#FFFFFF' : BRAND.red} d={MARK.red} />
      <path fill={light ? '#FFFFFF' : BRAND.gray} d={MARK.gray} />
      <path fill={light ? '#FFFFFF' : BRAND.orange} d={MARK.orange} />
      <g fill={light ? '#FFFFFF' : BRAND.gray}>
        {WORDMARK.map((d, i) => (
          <path key={i} d={d} />
        ))}
        {TAGLINE.map((d, i) => (
          <path key={`t${i}`} d={d} />
        ))}
      </g>
    </svg>
  )
}
