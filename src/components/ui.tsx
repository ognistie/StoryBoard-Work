import { Loader2, X } from 'lucide-react'
import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { create } from 'zustand'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

// Surfaces follow the inspector panel in the Paper design: white, a zinc hairline, a soft two-layer shadow.
const FLOATING_SURFACE = 'border border-line bg-surface shadow-[0_1px_2px_#0000000A,0_8px_24px_#0000000F]'

// ---------------------------------------------------------------- buttons

type Variant = 'primary' | 'secondary' | 'danger'

// Pills, like "Publicar" in the design: 36px tall, 14px medium text.
const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-[#0077ED]',
  secondary: 'border border-line bg-surface text-fg hover:bg-surface-2',
  danger: 'bg-danger-soft text-danger hover:bg-[#f9dade]',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'secondary', loading, className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-[14px] leading-[18px] font-medium whitespace-nowrap transition-colors select-none disabled:opacity-45',
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  )
})

// ---------------------------------------------------------------- modal

export function Modal({ open, onClose, title, children, footer, width = 480 }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input,textarea,select,button[data-autofocus]')?.focus(), 30)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      prev?.focus?.()
    }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fade-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/20 p-4 pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} className={cx('pop-in w-full overflow-hidden rounded-2xl', FLOATING_SURFACE)} style={{ maxWidth: width }}>
        <div className="flex items-start justify-between gap-4 px-[22px] pt-[22px] pb-4">
          <h2 className="text-[24px] leading-[30px] font-medium tracking-[-0.025em] text-black">{title}</h2>
          <button aria-label="Fechar" onClick={onClose} className="-mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg">
            <X className="size-4" />
          </button>
        </div>
        <div className="px-[22px] pb-[22px]">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line px-[22px] py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

// ---------------------------------------------------------------- popover menu

/** A dropdown rendered in a portal, so panels with their own stacking context never cover it. */
export function Menu({ trigger, children, align = 'left' }: { trigger: (open: () => void) => ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right' }) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const close = () => setAnchor(null)
  useEffect(() => {
    if (!anchor) return
    const outside = (e: PointerEvent) => !triggerRef.current?.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node) && close()
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close()
    // Capture phase: the canvas stops pointer events from bubbling to the document.
    document.addEventListener('pointerdown', outside, true)
    document.addEventListener('keydown', k)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', outside, true)
      document.removeEventListener('keydown', k)
      window.removeEventListener('resize', close)
    }
  }, [anchor])
  return (
    <div ref={triggerRef}>
      {trigger(() => setAnchor((a) => (a ? null : (triggerRef.current?.getBoundingClientRect() ?? null))))}
      {anchor &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: anchor.bottom + 8, ...(align === 'right' ? { right: window.innerWidth - anchor.right } : { left: anchor.left }) }}
            className={cx('pop-in fixed z-50 min-w-56 rounded-2xl p-1.5', FLOATING_SURFACE)}
          >
            {children(close)}
          </div>,
          document.body,
        )}
    </div>
  )
}

export function MenuItem({ icon, children, onClick }: { icon?: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <button role="menuitem" onClick={onClick} className="flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-[14px] leading-[18px] text-fg transition-colors hover:bg-surface-2">
      {icon && <span className="text-muted [&>svg]:size-4">{icon}</span>}
      <span className="flex-1">{children}</span>
    </button>
  )
}

// ---------------------------------------------------------------- toasts

interface Toast {
  id: number
  text: ReactNode
  tone: 'neutral' | 'ok' | 'danger'
}

const useToasts = create<{ items: Toast[] }>(() => ({ items: [] }))
let tid = 0

export function toast(text: ReactNode, opts: { tone?: Toast['tone']; duration?: number } = {}) {
  const id = ++tid
  useToasts.setState((s) => ({ items: [...s.items.slice(-3), { id, text, tone: opts.tone ?? 'neutral' }] }))
  setTimeout(() => useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) })), opts.duration ?? 4200)
}

export function toastError(e: unknown) {
  toast((e as Error)?.message ?? String(e), { tone: 'danger', duration: 6000 })
}

/** Dark pills at the top centre, away from the prompt box at the bottom. */
export function Toaster() {
  const items = useToasts((s) => s.items)
  return createPortal(
    <div className="pointer-events-none fixed top-5 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2 print:hidden" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'danger' ? 'alert' : 'status'}
          className="slide-up pointer-events-auto flex max-w-[92vw] items-center gap-2.5 rounded-full bg-fg px-4 py-2.5 text-[14px] leading-[18px] font-medium text-white shadow-[0_8px_24px_#00000029]"
        >
          {t.tone !== 'neutral' && <span className={cx('size-1.5 shrink-0 rounded-full', t.tone === 'ok' ? 'bg-[#30D158]' : 'bg-[#FF453A]')} />}
          <span>{t.text}</span>
        </div>
      ))}
    </div>,
    document.body,
  )
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx('size-4 animate-spin text-muted', className)} />
}
