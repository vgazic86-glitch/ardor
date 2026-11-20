import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { DeliveryStatus, Employee, OrderStatus } from '../lib/types'
import {
  deliveryStatusLabel,
  deliveryStatusTone,
  orderStatusLabel,
  orderStatusTone,
} from '../lib/format'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-copper-600">
            <span className="h-px w-6 bg-copper-400" />
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
          {title}
        </h1>
        {description && (
          <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-walnut-700">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-end gap-2">{actions}</div>
      )}
    </div>
  )
}

export function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
  flush = false,
}: {
  children: ReactNode
  className?: string
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  /** Bez unutrašnjeg razmaka (za tablice od ruba do ruba). */
  flush?: boolean
}) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-walnut-200/70 bg-linen shadow-card ${flush ? 'overflow-hidden' : 'p-5'} ${className}`}
    >
      {title && (
        <div
          className={`flex flex-wrap items-start justify-between gap-x-3 gap-y-2 ${flush ? 'px-5 pt-5 pb-4' : 'mb-4'}`}
        >
          <div className="min-w-[11rem] flex-1">
            <h2 className="font-display text-lg font-semibold leading-tight">
              {title}
            </h2>
            {subtitle && (
              <div className="mt-0.5 text-xs text-walnut-500">{subtitle}</div>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: string
  hint?: ReactNode
  icon?: LucideIcon
  tone?: 'default' | 'accent' | 'warn' | 'good'
}) {
  const box = {
    default: 'border-walnut-200/70 bg-linen',
    accent: 'border-walnut-800 bg-walnut-900 text-linen sidebar-bg',
    warn: 'border-copper-200 bg-copper-50',
    good: 'border-moss-100 bg-moss-50',
  }[tone]
  const chip = {
    default: 'bg-walnut-100 text-walnut-700',
    accent: 'bg-copper-500/20 text-copper-400',
    warn: 'bg-copper-100 text-copper-600',
    good: 'bg-moss-100 text-moss-600',
  }[tone]
  const muted = tone === 'accent' ? 'text-walnut-300' : 'text-walnut-500'
  return (
    <div
      className={`relative overflow-hidden border p-4 shadow-card sm:p-5 ${tone === 'accent' ? 'leaf' : 'rounded-2xl'} ${box}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`text-[11px] font-bold uppercase tracking-wider ${muted}`}
        >
          {label}
        </div>
        {Icon && (
          <span
            className={`hidden size-8 shrink-0 place-items-center rounded-lg sm:grid ${chip}`}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div className="mt-1 whitespace-nowrap font-display text-[1.35rem] font-semibold leading-tight tabular sm:text-[1.8rem]">
        {value}
      </div>
      {hint && (
        <div
          className={`mt-1.5 text-xs ${tone === 'accent' ? 'text-walnut-300' : 'text-walnut-700'}`}
        >
          {hint}
        </div>
      )}
    </div>
  )
}

export function Delta({ value }: { value: number }) {
  if (!Number.isFinite(value)) return null
  const up = value >= 0
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-px text-[11px] font-bold ${up ? 'bg-moss-600/15 text-moss-600' : 'bg-rose-600/15 text-rose-500'}`}
    >
      {up ? '▲' : '▼'} {Math.abs(Math.round(value * 100))}%
    </span>
  )
}

const badgeBase =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset'

export const tones = {
  neutral: 'bg-stone-100 text-stone-700 ring-stone-300',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
  warn: 'bg-amber-50 text-amber-800 ring-amber-200',
  good: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  bad: 'bg-rose-50 text-rose-700 ring-rose-200',
  violet: 'bg-violet-50 text-violet-800 ring-violet-200',
  copper: 'bg-copper-100 text-copper-700 ring-copper-200',
} as const

export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: keyof typeof tones | string
  children: ReactNode
  className?: string
}) {
  const cls = tone in tones ? tones[tone as keyof typeof tones] : tone
  return <span className={`${badgeBase} ${cls} ${className}`}>{children}</span>
}

export function OrderBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`${badgeBase} ${orderStatusTone[status]}`}>
      {orderStatusLabel[status]}
    </span>
  )
}

export function DeliveryBadge({ status }: { status: DeliveryStatus }) {
  return (
    <span className={`${badgeBase} ${deliveryStatusTone[status]}`}>
      {deliveryStatusLabel[status]}
    </span>
  )
}

export function Avatar({
  employee,
  size = 'md',
}: {
  employee: Employee
  size?: 'sm' | 'md' | 'lg'
}) {
  const s =
    size === 'sm'
      ? 'size-6 text-[10px]'
      : size === 'lg'
        ? 'size-11 text-sm'
        : 'size-8 text-xs'
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full font-bold text-white ring-2 ring-white/70 ${s}`}
      style={{ backgroundColor: employee.color }}
      title={employee.name}
    >
      {employee.initials}
    </span>
  )
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline' | 'copper' | 'danger'
  size?: 'sm' | 'md'
}) {
  const styles = {
    primary: 'bg-walnut-900 text-linen shadow-sm hover:bg-walnut-800',
    copper: 'bg-copper-500 text-white shadow-sm hover:bg-copper-600',
    outline:
      'border border-walnut-200 bg-linen text-walnut-900 shadow-sm hover:border-walnut-300 hover:bg-white',
    ghost: 'text-walnut-700 hover:bg-walnut-100',
    danger: 'text-rose-700 hover:bg-rose-50',
  }[variant]
  const sz = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm'
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${sz} ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

export function Progress({
  value,
  color = '#F15A29',
}: {
  value: number
  color?: string
}) {
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-walnut-100"
      role="progressbar"
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${Math.max(0, Math.min(100, value * 100))}%`,
          backgroundColor: color,
        }}
      />
    </div>
  )
}

export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-walnut-700">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-walnut-200 bg-linen px-3 py-2 text-sm font-medium text-walnut-900 shadow-sm focus:border-copper-400 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <label
      className={`flex flex-col gap-1 text-xs font-semibold text-walnut-700 ${className}`}
    >
      {label}
      {children}
      {hint && <span className="font-normal text-walnut-500">{hint}</span>}
    </label>
  )
}

/** Segmentirani izbornik (kartice). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-walnut-200 bg-walnut-50 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            value === o.value
              ? 'bg-white text-walnut-900 shadow-sm ring-1 ring-walnut-200'
              : 'text-walnut-600 hover:text-walnut-900'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? 'bg-walnut-900 text-linen shadow-sm'
          : 'bg-walnut-100 text-walnut-700 hover:bg-walnut-200'
      }`}
    >
      {children}
    </button>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-walnut-100 text-walnut-500">
        <Icon className="size-6" />
      </span>
      <div className="mt-3 font-display text-lg font-semibold">{title}</div>
      {children && (
        <div className="mt-1 max-w-sm text-sm text-walnut-600">{children}</div>
      )}
    </div>
  )
}

export const inputCls =
  'w-full rounded-lg border border-walnut-200 bg-white px-3 py-2 text-sm text-walnut-900 shadow-sm placeholder:text-walnut-400 focus:border-copper-400 focus:outline-none focus:ring-2 focus:ring-copper-200/60'
