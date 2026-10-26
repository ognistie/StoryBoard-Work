import { Paperclip, X } from 'lucide-react'
import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { navigate } from '../../App'
import { cx, Select, Spinner, toastError } from '../../components/ui'
import { createProjectFromBriefing, type BriefingFormat } from '../../lib/briefing'
import { ACCEPT_DOCS } from '../../lib/fileText'
import { useSession } from '../../lib/session'

const FORMAT_OPTIONS: { value: BriefingFormat; label: string; hint: string }[] = [
  { value: '9:16', label: 'Reels · 9:16', hint: 'Reels, TikTok, Shorts, Stories' },
  { value: '1:1', label: 'Feed · 1:1', hint: 'Post quadrado no feed' },
  { value: '16:9', label: 'YouTube · 16:9', hint: 'YouTube, TV, site' },
]
const DURATION_OPTIONS = [15, 30, 60].map((s) => ({ value: s, label: `${s}s`, hint: s === 15 ? 'Até 3 cenas' : s === 30 ? 'De 4 a 5 cenas' : 'Até 6 cenas' }))

// Lighter glass for the controls that sit inside the composer.
const INNER_GLASS = 'border border-white/75 bg-white/55 shadow-[inset_0_1px_0_rgb(255_255_255/0.9)]'
// The field's own glass, for chips that sit outside it on the background.
const CHIP_GLASS = 'border border-white/70 bg-white/42 shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_4px_16px_rgb(0_0_0/0.08)] backdrop-blur-[24px] backdrop-saturate-[1.8]'
const MAX_FIELD_HEIGHT = 160

// On phones the format and length leave the field and sit below it as chips with the field's own glass.
const PILL_STYLE = {
  inline: cx('hidden h-11 rounded-full px-4 font-medium hover:bg-white/80 aria-expanded:bg-white/80 md:flex', INNER_GLASS),
  chip: cx('flex h-9 rounded-[18px] px-3.5 font-medium hover:bg-white/70 aria-expanded:bg-white/70 md:hidden', CHIP_GLASS),
}

/** The pill where a briefing starts: text, an optional attachment, format and length. Sending creates the project. */
export function BriefingComposer() {
  const userId = useSession((s) => s.userId)
  const [briefing, setBriefing] = useState('')
  const [file, setFile] = useState<File>()
  const [format, setFormat] = useState<BriefingFormat>('16:9')
  const [durationSeconds, setDurationSeconds] = useState(30)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (busy || !briefing.trim()) return
    setBusy(true)
    try {
      const projectId = await createProjectFromBriefing({ briefing, format, durationSeconds, file, userId })
      navigate(`/p/${projectId}`)
    } catch (err) {
      toastError(err)
      setBusy(false)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) void submit(e)
  }

  const selects = (variant: keyof typeof PILL_STYLE) => (
    <>
      <Select label="Formato" value={format} options={FORMAT_OPTIONS} onChange={setFormat} disabled={busy} className={PILL_STYLE[variant]} align={variant === 'inline' ? 'right' : 'left'} />
      <Select label="Duração" value={durationSeconds} options={DURATION_OPTIONS} onChange={setDurationSeconds} disabled={busy} className={PILL_STYLE[variant]} align={variant === 'inline' ? 'right' : 'left'} />
    </>
  )

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_FIELD_HEIGHT)}px`
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <form onSubmit={submit} className="glass flex min-h-[60px] w-full items-end gap-2 rounded-[30px] px-2 py-[7px] md:min-h-[68px] md:rounded-[34px] md:px-3 md:py-[11px]">
        <button
          type="button"
          aria-label="Anexar arquivo"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
          className={cx('flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/80', INNER_GLASS)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <path d="M8 3v10M3 8h10" fill="none" stroke="#1D1D1F" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
        <input
          ref={fileInput}
          type="file"
          hidden
          accept={`image/*,${ACCEPT_DOCS}`}
          onChange={(e) => {
            setFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {/* A textarea never ellipsizes its placeholder, so the hint is drawn on top and cut with "…" on narrow screens. */}
        <div className="relative flex min-w-0 flex-1 self-center">
          {!briefing && (
            <span aria-hidden className="pointer-events-none absolute top-1/2 right-0 left-1.5 -translate-y-1/2 truncate text-[16px] leading-6 text-muted md:text-[18px]">
              Cole o briefing ou descreva o vídeo…
            </span>
          )}
          <textarea
            rows={1}
            value={briefing}
            disabled={busy}
            onChange={(e) => {
              setBriefing(e.target.value)
              grow(e.target)
            }}
            onKeyDown={onKeyDown}
            aria-label="Briefing"
            className="min-w-0 flex-1 resize-none bg-transparent py-2.5 pl-1.5 text-[16px] leading-6 text-fg outline-none md:text-[18px]"
          />
        </div>
        {selects('inline')}
        <button
          type="submit"
          aria-label="Criar cenas"
          disabled={busy || !briefing.trim()}
          className={cx('flex size-11 shrink-0 items-center justify-center rounded-full bg-accent transition-[background-color,opacity] hover:bg-[#0077ed]', !busy && 'disabled:opacity-40')}
        >
          {busy ? (
            <Spinner className="text-white" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path d="M9 14.5v-11M4.2 8.3L9 3.5l4.8 4.8" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </form>

      <div className="flex gap-2 md:hidden">{selects('chip')}</div>

      {(file || busy) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-muted md:justify-center">
          {file && (
            <span className={cx('flex h-7 min-w-0 items-center gap-1.5 rounded-full pr-1 pl-2.5 text-fg-2', CHIP_GLASS)}>
              <Paperclip className="size-3.5" />
              <span className="max-w-60 truncate">{file.name}</span>
              <button type="button" aria-label="Remover anexo" disabled={busy} onClick={() => setFile(undefined)} className="flex size-5 items-center justify-center rounded-full transition-[background-color,opacity] enabled:hover:bg-black/5 disabled:opacity-40">
                <X className="size-3" />
              </button>
            </span>
          )}
          {busy && <span aria-live="polite">Planejando as cenas…</span>}
        </div>
      )}
    </div>
  )
}
