import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '../../components/ui'
import { useWS } from './store'

/** The white panel at the right of the canvas (desktop), with the same frame as the scene inspector. */
export function PanelFrame({ children }: { children: ReactNode }) {
  return <aside className="flex h-full w-full flex-col overflow-clip rounded-2xl border border-[#E4E4E7] bg-white shadow-[0_1px_2px_#0000000A,0_8px_24px_#0000000F]">{children}</aside>
}

/** Title block of the chat and folder panels: a small label, a title, an optional line, and a close button back to the scene. */
export function PanelHeader({ label, title, children, closable = true }: { label: string; title: string; children?: ReactNode; closable?: boolean }) {
  return (
    <div className="flex shrink-0 flex-col gap-3 px-[22px] pt-[22px] pb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[13px] leading-4 font-medium text-muted">{label}</span>
          <h2 className="truncate text-[24px] leading-[30px] font-medium tracking-[-0.025em] text-black">{title}</h2>
        </div>
        {closable && (
          <button
            aria-label="Fechar e voltar à cena"
            onClick={() => useWS.getState().set({ panel: 'scene' })}
            className={cx('-mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg')}
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}
