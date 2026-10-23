import { Paperclip, X } from 'lucide-react'
import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { navigate } from '../../App'
import { cx, Spinner, toastError } from '../../components/ui'
import { createProjectFromBriefing, type BriefingFormat } from '../../lib/briefing'
import { ACCEPT_DOCS } from '../../lib/fileText'
import { useSession } from '../../lib/session'

const FORMAT_OPTIONS: { value: BriefingFormat; label: string }[] = [
  { value: '9:16', label: 'Reels · 9:16' },
  { value: '1:1', label: 'Feed · 1:1' },
  { value: '16:9', label: 'YouTube · 16:9' },
]
const DURATION_OPTIONS = [15, 30, 60]

// Lighter glass for the controls that sit inside the composer.
const INNER_GLASS = 'border border-white/75 bg-white/55 shadow-[inset_0_1px_0_rgb(255_255_255/0.9)]'
const MAX_FIELD_HEIGHT = 160

function Chevron() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className="shrink-0">
      <path d="M2.5 3.8L5 6.3l2.5-2.5" fill="none" stroke="#6E6E73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// The visible label sizes the pill; the native select sits invisibly on top, so the pill is as wide as the current choice.
function PillSelect<T extends string | number>({ label, value, options, onChange, disabled }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; disabled: boolean }) {
  return (
    <div className={cx('relative flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 transition-colors focus-within:bg-white/80 hover:bg-white/80', INNER_GLASS)}>
      <span className="text-[14px] leading-[18px] font-medium text-fg">{options.find((o) => o.value === value)?.label}</span>
      <Chevron />
      <select
        aria-label={label}
        disabled={disabled}
        value={String(value)}
        onChange={(e) => onChange(options.find((o) => String(o.value) === e.target.value)!.value)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

/** The pill where a briefing starts: text, an optional attachment, format and length. Sending creates the project. */
export function BriefingComposer() {
  const userId = useSession((s) => s.userId)
  const [briefing, setBriefing] = useState('')
  const [file, setFile] = useState<File>()
  const [format, setFormat] = useState<BriefingFormat>('9:16')
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

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_FIELD_HEIGHT)}px`
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <form onSubmit={submit} className="glass flex min-h-[68px] w-full items-end gap-2 rounded-[34px] p-3">
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
        <textarea
          rows={1}
          value={briefing}
          disabled={busy}
          onChange={(e) => {
            setBriefing(e.target.value)
            grow(e.target)
          }}
          onKeyDown={onKeyDown}
          placeholder="Cole o briefing ou descreva o vídeo…"
          aria-label="Briefing"
          className="min-w-0 flex-1 resize-none self-center bg-transparent py-2.5 pl-1.5 text-[18px] leading-6 text-fg outline-none placeholder:text-muted"
        />
        <PillSelect label="Formato" value={format} options={FORMAT_OPTIONS} onChange={setFormat} disabled={busy} />
        <PillSelect label="Duração" value={durationSeconds} options={DURATION_OPTIONS.map((s) => ({ value: s, label: `${s}s` }))} onChange={setDurationSeconds} disabled={busy} />
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

      {(file || busy) && (
        <div className="flex items-center gap-2 text-[13px] text-muted">
          {file && (
            <span className={cx('flex h-7 items-center gap-1.5 rounded-full pr-1 pl-2.5 text-fg-2', INNER_GLASS)}>
              <Paperclip className="size-3.5" />
              <span className="max-w-60 truncate">{file.name}</span>
              <button type="button" aria-label="Remover anexo" disabled={busy} onClick={() => setFile(undefined)} className="flex size-5 items-center justify-center rounded-full hover:bg-black/5">
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
