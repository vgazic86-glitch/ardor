import { X } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Otvoreni modali, da Escape zatvori samo onaj na vrhu. */
const stack: string[] = []

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  side = false,
  footer,
  wide = false,
}: {
  title: string
  subtitle?: ReactNode
  onClose: () => void
  children: ReactNode
  side?: boolean
  footer?: ReactNode
  wide?: boolean
}) {
  const uid = useId()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    stack.push(uid)
    return () => {
      const i = stack.lastIndexOf(uid)
      if (i >= 0) stack.splice(i, 1)
    }
  }, [uid])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) =>
      e.key === 'Escape' && stack[stack.length - 1] === uid && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, uid])

  if (!mounted) return null
  return createPortal(
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        className="absolute inset-0 bg-walnut-950/40 backdrop-blur-[3px]"
        aria-label="Zatvori"
        onClick={onClose}
      />
      <div
        className={
          side
            ? 'toast-in absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-paper shadow-2xl'
            : `absolute left-1/2 top-1/2 flex max-h-[92vh] ${wide ? 'w-[min(980px,calc(100%-1.5rem))]' : 'w-[min(760px,calc(100%-1.5rem))]'} -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-walnut-200 bg-paper shadow-2xl`
        }
      >
        <div className="flex items-start justify-between gap-4 border-b border-walnut-200 px-6 py-5">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <div className="mt-1 text-sm text-walnut-700">{subtitle}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-walnut-500 hover:bg-walnut-100"
            aria-label="Zatvori"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="border-t border-walnut-200 px-6 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  )
}
