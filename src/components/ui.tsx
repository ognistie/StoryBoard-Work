import { Check, Loader2, X } from 'lucide-react'
import { forwardRef, useEffect, useId, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
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
  // Callers pass a new onClose on every render. Reading it from a ref keeps the effect below to
  // open and close only: re-running it on each keystroke moved focus away and back mid-typing.
  const onCloseRef = useRef(onClose)
  useLayoutEffect(() => {
    onCloseRef.current = onClose
  })
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
      }
    }
    window.addEventListener('keydown', onKey, true)
    const focus = setTimeout(() => ref.current?.querySelector<HTMLElement>('input,textarea,select,button[data-autofocus]')?.focus(), 30)
    return () => {
      clearTimeout(focus)
      window.removeEventListener('keydown', onKey, true)
      prev?.focus?.()
    }
  }, [open])
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

// ---------------------------------------------------------------- select

export interface SelectOption<T> {
  value: T
  label: string
  /** A second line under the label, in gray. */
  hint?: string
}

export function Chevron({ className }: { className?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className={cx('shrink-0', className)}>
      <path d="M2.5 3.8L5 6.3l2.5-2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * A listbox styled like the app's menus, in place of the browser's native dropdown.
 * Keyboard: arrows, Home/End, Enter or Space to pick, Esc to close, a letter to jump.
 * The popup opens below the trigger, or above it when the bottom of the window has no room.
 */
export function Select<T extends string | number>({
  value,
  options,
  onChange,
  label,
  disabled,
  className,
  align = 'left',
}: {
  value: T
  options: SelectOption<T>[]
  onChange: (v: T) => void
  label: string
  disabled?: boolean
  /** Classes of the trigger button: display, size, weight, background and border. */
  className?: string
  align?: 'left' | 'right'
}) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const [active, setActive] = useState(0)
  const [placement, setPlacement] = useState<'below' | 'above'>('below')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const id = useId()
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )

  const open = () => {
    if (disabled) return
    setActive(selectedIndex)
    setAnchor(triggerRef.current?.getBoundingClientRect() ?? null)
  }
  const close = (refocus = true) => {
    setAnchor(null)
    if (refocus) triggerRef.current?.focus()
  }
  const pick = (i: number) => {
    onChange(options[i].value)
    close()
  }

  useLayoutEffect(() => {
    if (!anchor || !listRef.current) return
    const h = listRef.current.offsetHeight
    setPlacement(anchor.bottom + 8 + h > window.innerHeight - 8 && anchor.top - 8 - h > 8 ? 'above' : 'below')
    listRef.current.focus()
  }, [anchor])

  useEffect(() => {
    if (!anchor) return
    const outside = (e: PointerEvent) => !triggerRef.current?.contains(e.target as Node) && !listRef.current?.contains(e.target as Node) && close(false)
    const dismiss = () => close(false)
    // The popup is fixed to where the trigger was; scrolling anything but the list itself closes it.
    const scrolled = (e: Event) => !listRef.current?.contains(e.target as Node) && close(false)
    document.addEventListener('pointerdown', outside, true)
    window.addEventListener('resize', dismiss)
    window.addEventListener('scroll', scrolled, true)
    return () => {
      document.removeEventListener('pointerdown', outside, true)
      window.removeEventListener('resize', dismiss)
      window.removeEventListener('scroll', scrolled, true)
    }
  }, [anchor])

  const onListKey = (e: ReactKeyboardEvent) => {
    const last = options.length - 1
    const moves: Record<string, number> = { ArrowDown: Math.min(last, active + 1), ArrowUp: Math.max(0, active - 1), Home: 0, End: last }
    if (e.key in moves) setActive(moves[e.key])
    else if (e.key === 'Enter' || e.key === ' ') pick(active)
    else if (e.key === 'Escape') close()
    else if (e.key === 'Tab') close(false)
    else if (e.key.length === 1) {
      const letter = e.key.toLowerCase()
      const next = options.findIndex((o, j) => j > active && o.label.toLowerCase().startsWith(letter))
      const first = options.findIndex((o) => o.label.toLowerCase().startsWith(letter))
      if (next >= 0 || first >= 0) setActive(next >= 0 ? next : first)
      return
    } else return
    e.preventDefault()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={!!anchor}
        aria-controls={anchor ? id : undefined}
        disabled={disabled}
        onClick={() => (anchor ? close() : open())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            open()
          }
        }}
        className={cx('min-w-0 shrink-0 items-center gap-1.5 text-[14px] leading-[18px] text-fg transition-colors disabled:opacity-50', className)}
      >
        <span className="truncate">{options[selectedIndex]?.label}</span>
        <Chevron className="text-muted" />
      </button>
      {anchor &&
        createPortal(
          <div
            ref={listRef}
            id={id}
            role="listbox"
            tabIndex={-1}
            aria-label={label}
            aria-activedescendant={`${id}-${active}`}
            onKeyDown={onListKey}
            style={{
              ...(placement === 'below' ? { top: anchor.bottom + 8 } : { bottom: window.innerHeight - anchor.top + 8 }),
              ...(align === 'right' ? { right: window.innerWidth - anchor.right } : { left: anchor.left }),
              minWidth: Math.max(anchor.width, 180),
            }}
            className={cx('pop-in fixed z-50 max-h-[min(360px,60vh)] overflow-y-auto rounded-2xl p-1.5 outline-none', FLOATING_SURFACE)}
          >
            {options.map((o, i) => {
              const selected = i === selectedIndex
              return (
                <div
                  key={String(o.value)}
                  id={`${id}-${i}`}
                  role="option"
                  aria-selected={selected}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => pick(i)}
                  className={cx('flex min-h-9 cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 text-[14px] leading-[18px] text-fg', i === active && 'bg-surface-2')}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={cx(selected && 'font-medium')}>{o.label}</span>
                    {o.hint && <span className="text-[12px] leading-4 text-muted">{o.hint}</span>}
                  </span>
                  <Check className={cx('size-4 shrink-0 text-accent', !selected && 'invisible')} strokeWidth={2.2} aria-hidden />
                </div>
              )
            })}
          </div>,
          document.body,
        )}
    </>
  )
}

// ---------------------------------------------------------------- avatars

const AVATAR_TONES = ['#E4E4E7', '#DBEAFE', '#DCFCE7', '#FEF3C7', '#FCE7F3', '#EDE9FE']

/** Initials in a circle. The tone comes from the id, so a person keeps one color everywhere. */
export function Avatar({ id, name, size = 32, online, className }: { id: string; name: string; size?: number; online?: boolean; className?: string }) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0
  const letters = name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span
      title={name}
      className={cx('relative flex shrink-0 items-center justify-center rounded-full font-semibold text-fg', className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34), backgroundColor: AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length] }}
    >
      {letters || '?'}
      {online && <span aria-label="online" className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-white bg-[#30D158]" />}
    </span>
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
