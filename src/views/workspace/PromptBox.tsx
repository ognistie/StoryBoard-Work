import { useRef, useState } from 'react'
import { cx, Spinner, toast, toastError } from '../../components/ui'
import { restoreRevision } from '../../lib/repo'
import { reviseScene, type ReviseFocus } from '../../lib/scenes'
import { can } from '../../lib/session'
import { useWD } from './context'
import { useWS } from './store'

/**
 * Each shortcut limits what may change (`focus`). Typed text is the request; without text, `ask` is.
 * The first three come from the design; the last one is the request teams make most.
 */
const SHORTCUTS: { id: string; focus: ReviseFocus; label: string; ask: string }[] = [
  { id: 'drawing', focus: 'drawing', label: 'Só o desenho', ask: 'Só o desenho' },
  { id: 'dialogue', focus: 'dialogue', label: 'Só o diálogo', ask: 'Só o diálogo' },
  { id: 'shorter', focus: 'shorter', label: 'Mais curta', ask: 'Mais curta' },
  { id: 'impact', focus: 'all', label: 'Mais impacto', ask: 'Deixar a cena com mais impacto e ritmo, sem mudar a ideia' },
]

/**
 * The glass box at the bottom that rewrites the selected scene.
 * A shortcut sends at once: with text it limits what may change, without text its label is the request.
 * `compact` is the phone layout: smaller type, and shortcuts that scroll sideways.
 */
export function PromptBox({ compact = false }: { compact?: boolean }) {
  const { ordered, userId, role } = useWD()
  const editable = can(role, 'edit')
  const selectedId = useWS((s) => s.selectedId)
  const index = ordered.findIndex((f) => f.id === selectedId)
  const frame = ordered[index]
  const [text, setText] = useState('')
  const input = useRef<HTMLTextAreaElement>(null)
  /** The shortcut (or 'send') whose request is running. */
  const [busy, setBusy] = useState<string>()

  const send = async (focus: ReviseFocus, ask?: string, id = 'send') => {
    if (!frame || busy) return
    const instruction = text.trim() || ask
    if (!instruction) return
    const before = frame.headRevisionId
    const number = index + 1
    setBusy(id)
    try {
      await reviseScene({ frameId: frame.id, instruction, focus, userId })
      setText('')
      const browsing = { ...useWS.getState().browsing }
      delete browsing[frame.id]
      useWS.getState().set({ browsing })
      // Undo restores the version from before the request, as a new version: nothing is lost either way.
      const undo = async () => {
        try {
          if (before) await restoreRevision(before, userId)
          toast(`Cena ${number} voltou como estava`, { tone: 'ok' })
        } catch (e) {
          toastError(e)
        }
      }
      toast(
        <span className="flex items-center gap-3">
          Cena {number} refeita
          {before && (
            <button onClick={() => void undo()} className="font-semibold text-[#64D2FF] hover:underline">
              Desfazer
            </button>
          )}
        </span>,
        { tone: 'ok', duration: 8000 },
      )
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(undefined)
    }
  }

  return (
    // A click anywhere in the box but its buttons lands in the text field: the hint above it reads like a field.
    <div
      onMouseDown={(e) => {
        if (e.target === input.current || (e.target as HTMLElement).closest('button')) return
        e.preventDefault()
        input.current?.focus()
      }}
      className={cx(
        'glass flex cursor-text flex-col !shadow-[inset_0_1px_0_#FFFFFFE6,inset_0_-1px_0_#FFFFFF40,0_0_0_1px_#0000000F,0_8px_32px_#0000001A]',
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
        ref={input}
        rows={1}
        value={text}
        disabled={!frame || !!busy || !editable}
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
        placeholder={!editable ? 'Seu papel neste projeto não permite editar' : compact && frame ? 'Descreva o que mudar nesta cena' : undefined}
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
              key={s.id}
              disabled={!frame || !!busy || !editable}
              title={text.trim() ? `Aplicar o pedido mudando ${s.focus === 'all' ? 'o que for preciso' : s.label.toLowerCase()}` : s.ask}
              onClick={() => void send(s.focus, s.ask, s.id)}
              className={cx(
                'flex shrink-0 items-center gap-1.5 font-medium whitespace-nowrap text-black shadow-[inset_0_1px_0_#FFFFFFE6,0_0_0_1px_#0000000F] transition-colors hover:bg-white/85 disabled:opacity-50',
                compact ? 'h-8 rounded-2xl border border-white/75 bg-white/55 px-3 text-[13px] leading-4' : 'h-9 rounded-[18px] border border-white/75 bg-white/55 px-3.5 text-[14px] leading-[18px]',
              )}
            >
              {busy === s.id && <Spinner className="size-3.5" />}
              {s.label}
            </button>
          ))}
        </div>
        <button
          aria-label="Refazer cena"
          disabled={!frame || !!busy || !text.trim() || !editable}
          onClick={() => void send('all')}
          className={cx(
            'relative flex shrink-0 items-center justify-center rounded-full bg-accent transition-[background-color,opacity] hover:bg-[#0077ed]',
            // 40px on a phone, with a 44px touch target.
            compact ? 'size-10 after:absolute after:-inset-0.5 after:content-[""]' : 'size-11',
            busy !== 'send' && 'disabled:opacity-40',
          )}
        >
          {busy === 'send' ? (
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
