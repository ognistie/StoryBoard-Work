import { useState } from 'react'
import { cx, Spinner, toast, toastError } from '../../components/ui'
import { reviseScene, type ReviseFocus } from '../../lib/scenes'
import { useWD } from './context'
import { useWS } from './store'

const SHORTCUTS: { focus: ReviseFocus; label: string }[] = [
  { focus: 'drawing', label: 'Só o desenho' },
  { focus: 'dialogue', label: 'Só o diálogo' },
  { focus: 'shorter', label: 'Mais curta' },
]

/**
 * The glass box at the bottom that rewrites the selected scene.
 * A shortcut sends at once: with text it limits what may change, without text its label is the request.
 * `compact` is the phone layout: smaller type, and shortcuts that scroll sideways.
 */
export function PromptBox({ compact = false }: { compact?: boolean }) {
  const { ordered, userId } = useWD()
  const selectedId = useWS((s) => s.selectedId)
  const index = ordered.findIndex((f) => f.id === selectedId)
  const frame = ordered[index]
  const [text, setText] = useState('')
  const [busy, setBusy] = useState<ReviseFocus>()

  const send = async (focus: ReviseFocus, label?: string) => {
    if (!frame || busy) return
    const instruction = text.trim() || label
    if (!instruction) return
    setBusy(focus)
    try {
      await reviseScene({ frameId: frame.id, instruction, focus, userId })
      setText('')
      const browsing = { ...useWS.getState().browsing }
      delete browsing[frame.id]
      useWS.getState().set({ browsing })
      toast(`Cena ${index + 1} refeita`, { tone: 'ok' })
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <div
      className={cx(
        'glass flex flex-col !shadow-[inset_0_1px_0_#FFFFFFE6,inset_0_-1px_0_#FFFFFF40,0_0_0_1px_#0000000F,0_8px_32px_#0000001A]',
        compact ? 'gap-3 rounded-[24px] pt-3.5 pr-3 pb-3 pl-4' : 'gap-[18px] rounded-[26px] pt-5 pr-4 pb-4 pl-6',
      )}
    >
      {/* Fixed height, so the box keeps its size with or without the scene chip. */}
      <div className="flex h-6 items-center gap-2">
        {frame && (
          <span className="flex h-6 shrink-0 items-center gap-1.5 rounded-[7px] bg-[#0071E31A] px-[9px]">
            <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden className="shrink-0">
              <rect x="1" y="2" width="10" height="8" rx="1.5" fill="none" stroke="#0071E3" strokeWidth="1.3" />
              <path d="M1 4.5h10" fill="none" stroke="#0071E3" strokeWidth="1.3" />
            </svg>
            <span className="max-w-56 truncate text-[12px] leading-4 font-semibold text-accent">
              Cena {index + 1} · {frame.title}
            </span>
          </span>
        )}
        {!(compact && frame) && <span className="truncate text-[13px] leading-4 text-faint">{frame ? 'Descreva o que mudar nesta cena' : 'Selecione uma cena no canvas'}</span>}
      </div>
      <textarea
        rows={1}
        value={text}
        disabled={!frame || !!busy}
        onChange={(e) => {
          setText(e.target.value)
          e.target.style.height = 'auto'
          e.target.style.height = `${Math.min(e.target.scrollHeight, 130)}px`
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            void send('all')
          }
        }}
        aria-label="O que mudar nesta cena"
        placeholder={compact && frame ? 'Descreva o que mudar nesta cena' : undefined}
        className={cx('resize-none bg-transparent text-[#1D1D1F] outline-none placeholder:text-faint', compact ? 'text-[16px] leading-[22px]' : 'text-[18px] leading-[26px]')}
      />
      <div className={cx('flex items-center justify-between', compact ? 'gap-2' : 'gap-3')}>
        <div
          className={cx(
            'flex min-w-0 items-center gap-1.5',
            compact ? 'flex-1 overflow-x-auto [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_82%,transparent)] [&::-webkit-scrollbar]:hidden' : 'flex-wrap',
          )}
        >
          {SHORTCUTS.map((s) => (
            <button
              key={s.focus}
              disabled={!frame || !!busy}
              onClick={() => void send(s.focus, s.label)}
              className={cx(
                'flex shrink-0 items-center gap-1.5 font-medium whitespace-nowrap text-black shadow-[inset_0_1px_0_#FFFFFFE6,0_0_0_1px_#0000000F] transition-colors hover:bg-white/85 disabled:opacity-50',
                compact ? 'h-8 rounded-2xl border border-white/75 bg-white/55 px-3 text-[13px] leading-4' : 'h-9 rounded-[18px] border border-white/75 bg-white/55 px-3.5 text-[14px] leading-[18px]',
              )}
            >
              {busy === s.focus && <Spinner className="size-3.5" />}
              {s.label}
            </button>
          ))}
        </div>
        <button
          aria-label="Refazer cena"
          disabled={!frame || !!busy || !text.trim()}
          onClick={() => void send('all')}
          className={cx(
            'relative flex shrink-0 items-center justify-center rounded-full bg-accent transition-[background-color,opacity] hover:bg-[#0077ed]',
            // 40px on a phone, with a 44px touch target.
            compact ? 'size-10 after:absolute after:-inset-0.5 after:content-[""]' : 'size-11',
            busy !== 'all' && 'disabled:opacity-40',
          )}
        >
          {busy === 'all' ? (
            <Spinner className="text-white" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path d="M8 13V3.2M4 7.2L8 3.2l4 4" fill="none" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
