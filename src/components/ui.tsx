import { Loader2, X } from 'lucide-react'
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { create } from 'zustand'
import { userById } from '../lib/session'
import type { FrameStatus } from '../lib/types'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

// ---------------------------------------------------------------- buttons

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
type Size = 'sm' | 'md' | 'lg'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-fg text-bg hover:opacity-90 shadow-sm',
  secondary: 'bg-surface text-fg border border-line hover:border-line-strong hover:bg-surface-2 shadow-sm',
  ghost: 'text-fg-2 hover:bg-surface-2 hover:text-fg',
  subtle: 'bg-surface-2 text-fg hover:bg-surface-3',
  danger: 'bg-danger text-white hover:opacity-90',
}
const SIZE: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-[12.5px] gap-1.5 rounded-lg',
  md: 'h-8.5 px-3 text-[13px] gap-2 rounded-lg',
  lg: 'h-10 px-4 text-sm gap-2 rounded-xl',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  accent?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, accent, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-[background,opacity,border-color,transform] duration-150 select-none active:scale-[0.98] disabled:opacity-45 disabled:active:scale-100',
        accent ? 'bg-accent text-accent-fg hover:opacity-90 shadow-sm' : VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : icon}
      {children}
    </button>
  )
})

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean; size?: 'sm' | 'md' }>(
  function IconButton({ label, active, className, size = 'md', children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={cx(
          'inline-flex shrink-0 items-center justify-center rounded-lg text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-40',
          size === 'sm' ? 'size-7' : 'size-8.5',
          active && 'bg-surface-2 text-fg',
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    )
  },
)

// ---------------------------------------------------------------- form

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cx(
        'h-8.5 w-full rounded-lg border border-line bg-surface px-2.5 text-[13px] text-fg outline-none transition-colors placeholder:text-muted hover:border-line-strong focus:border-accent focus:ring-3 focus:ring-accent/15',
        className,
      )}
      {...rest}
    />
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={cx(
        'w-full resize-none rounded-lg border border-line bg-surface px-2.5 py-2 text-[13px] leading-relaxed text-fg outline-none transition-colors placeholder:text-muted hover:border-line-strong focus:border-accent focus:ring-3 focus:ring-accent/15',
        className,
      )}
      {...rest}
    />
  )
})

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        !className?.includes('w-') && 'w-full',
        'h-8.5 rounded-lg border border-line bg-surface px-2 text-[13px] text-fg outline-none hover:border-line-strong focus:border-accent focus:ring-3 focus:ring-accent/15',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  )
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block space-y-1.5', className)}>
      <span className="flex items-center justify-between text-[12px] font-medium text-fg-2">
        {label}
        {hint && <span className="font-normal text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx('relative mt-0.5 h-5 w-8.5 shrink-0 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-surface-3')}
      >
        <span className={cx('absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')} />
      </button>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-fg">{label}</span>
        {description && <span className="block text-[12px] leading-snug text-muted">{description}</span>}
      </span>
    </label>
  )
}

export function Segmented<T extends string>({ value, onChange, options, size = 'md' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; title?: string }[]; size?: 'sm' | 'md' }) {
  return (
    <div className="inline-flex rounded-lg bg-surface-2 p-0.5" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-md font-medium transition-all',
            size === 'sm' ? 'h-6 px-2 text-[12px]' : 'h-7.5 px-3 text-[12.5px]',
            value === o.value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- badges & avatars

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'ok' | 'warn' | 'danger' | 'info'; className?: string }) {
  const tones = {
    neutral: 'bg-surface-2 text-fg-2',
    accent: 'bg-accent-soft text-accent',
    ok: 'bg-ok-soft text-ok',
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-danger-soft text-danger',
    info: 'bg-info-soft text-info',
  }
  return <span className={cx('inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium whitespace-nowrap', tones[tone], className)}>{children}</span>
}

export const STATUS_META: Record<FrameStatus, { label: string; tone: 'neutral' | 'warn' | 'danger' | 'ok'; dot: string }> = {
  draft: { label: 'Rascunho', tone: 'neutral', dot: 'bg-muted' },
  review: { label: 'Em revisão', tone: 'warn', dot: 'bg-warn' },
  changes: { label: 'Ajustes solicitados', tone: 'danger', dot: 'bg-danger' },
  approved: { label: 'Aprovado', tone: 'ok', dot: 'bg-ok' },
}

export function StatusBadge({ status }: { status: FrameStatus }) {
  const m = STATUS_META[status]
  return (
    <Badge tone={m.tone}>
      <span className={cx('size-1.5 rounded-full', m.dot)} />
      {m.label}
    </Badge>
  )
}

export function Avatar({ userId, size = 24, ring }: { userId: string; size?: number; ring?: boolean }) {
  const u = userById(userId)
  const initials = u.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
  return (
    <span
      title={`${u.name}${u.title ? ` · ${u.title}` : ''}`}
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none', ring && 'ring-2 ring-surface')}
      style={{ width: size, height: size, background: u.color, fontSize: size * 0.4 }}
    >
      {initials}
    </span>
  )
}

export function AvatarStack({ ids, size = 22, max = 4 }: { ids: string[]; size?: number; max?: number }) {
  return (
    <div className="flex -space-x-1.5">
      {ids.slice(0, max).map((id) => (
        <Avatar key={id} userId={id} size={size} ring />
      ))}
      {ids.length > max && (
        <span className="inline-flex items-center justify-center rounded-full bg-surface-3 text-[10px] font-semibold text-fg-2 ring-2 ring-surface" style={{ width: size, height: size }}>
          +{ids.length - max}
        </span>
      )}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-surface-2 px-1 font-mono text-[10.5px] text-fg-2">{children}</kbd>
}

// ---------------------------------------------------------------- modal

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 520,
  bare,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: number
  bare?: boolean
}) {
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
    <div className="fade-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 p-4 pt-[8vh] backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" className="pop-in w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-lg" style={{ maxWidth: width }}>
        {bare ? (
          children
        ) : (
          <>
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
                <div>
                  {title && <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>}
                  {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
                </div>
                <IconButton label="Fechar" size="sm" onClick={onClose}>
                  <X className="size-4" />
                </IconButton>
              </div>
            )}
            <div className="px-5 pb-5">{children}</div>
            {footer && <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-2/50 px-5 py-3">{footer}</div>}
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

// ---------------------------------------------------------------- popover menu

export function Menu({ trigger, children, align = 'left' }: { trigger: (open: () => void) => ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', k)
    return () => {
      document.removeEventListener('mousedown', h)
      document.removeEventListener('keydown', k)
    }
  }, [open])
  return (
    <div ref={ref} className="relative">
      {trigger(() => setOpen((o) => !o))}
      {open && (
        <div className={cx('pop-in absolute top-full z-40 mt-1.5 min-w-52 rounded-xl border border-line bg-surface p-1 shadow-lg', align === 'right' ? 'right-0' : 'left-0')}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export function MenuItem({ icon, children, onClick, danger, hint, disabled }: { icon?: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean; hint?: ReactNode; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] transition-colors disabled:opacity-40',
        danger ? 'text-danger hover:bg-danger-soft' : 'text-fg hover:bg-surface-2',
      )}
    >
      {icon && <span className="text-muted [&>svg]:size-4">{icon}</span>}
      <span className="flex-1">{children}</span>
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </button>
  )
}

// ---------------------------------------------------------------- toasts

interface Toast {
  id: number
  text: ReactNode
  tone: 'neutral' | 'ok' | 'danger' | 'accent'
  action?: { label: string; onClick: () => void }
}

const useToasts = create<{ items: Toast[] }>(() => ({ items: [] }))
let tid = 0

export function toast(text: ReactNode, opts: { tone?: Toast['tone']; action?: Toast['action']; duration?: number } = {}) {
  const id = ++tid
  useToasts.setState((s) => ({ items: [...s.items.slice(-3), { id, text, tone: opts.tone ?? 'neutral', action: opts.action }] }))
  setTimeout(() => useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) })), opts.duration ?? 4200)
}

export function toastError(e: unknown) {
  toast((e as Error)?.message ?? String(e), { tone: 'danger', duration: 6000 })
}

export function Toaster() {
  const items = useToasts((s) => s.items)
  return createPortal(
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className={cx(
            'slide-up pointer-events-auto flex max-w-[92vw] items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] shadow-lg',
            t.tone === 'danger' ? 'bg-danger text-white' : 'bg-fg text-bg',
          )}
        >
          {t.tone === 'ok' && <span className="size-1.5 rounded-full bg-ok" />}
          {t.tone === 'accent' && <span className="size-1.5 rounded-full bg-accent" />}
          <span>{t.text}</span>
          {t.action && (
            <button
              className="font-semibold underline-offset-2 hover:underline"
              onClick={() => {
                t.action!.onClick()
                useToasts.setState((s) => ({ items: s.items.filter((x) => x.id !== t.id) }))
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>,
    document.body,
  )
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx('size-4 animate-spin text-muted', className)} />
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-surface-2 text-muted [&>svg]:size-5">{icon}</div>}
      <h3 className="text-[14px] font-semibold">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-[13px] text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
