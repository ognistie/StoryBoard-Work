import { useLiveQuery } from 'dexie-react-hooks'
import { Sparkles } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Avatar, cx, Spinner, toast, toastError } from '../../components/ui'
import { AI_MENTION, askAssistant } from '../../lib/assistant'
import { db } from '../../lib/db'
import { timeAgo } from '../../lib/hooks'
import { markSuggestionApplied, sendMessage } from '../../lib/repo'
import { reviseScene } from '../../lib/scenes'
import { can, userById } from '../../lib/session'
import { AI_AUTHOR, type ChatMessage } from '../../lib/types'
import { useWD } from './context'
import { PanelHeader } from './PanelShell'
import { ShareButton } from './ShareModal'
import { useWS } from './store'

/** Questions that show what the assistant is for, on an empty chat. */
const STARTERS = ['Sugira um gancho mais forte para a cena 1', 'A duração total está boa para o formato?', 'Que plano funciona melhor na última cena?']

const lastReadKey = (projectId: string) => `decupa.chat.read.${projectId}`

/** Messages from others since this browser last opened the chat. Shown as a badge on the chat button. */
export function useUnread(projectId: string, userId: string): number {
  const panel = useWS((s) => s.panel)
  return (
    useLiveQuery(async () => {
      if (panel === 'chat') return 0
      const since = Number(localStorage.getItem(lastReadKey(projectId)) ?? 0)
      return db.messages
        .where('projectId')
        .equals(projectId)
        .filter((m) => m.createdAt > since && m.authorId !== userId && m.askedBy !== userId)
        .count()
    }, [projectId, userId, panel]) ?? 0
  )
}

function Suggestion({ message, index }: { message: ChatMessage; index: number }) {
  const { ordered, userId, role } = useWD()
  const [busy, setBusy] = useState(false)
  const s = message.suggestions![index]
  const frame = ordered[s.sceneNumber - 1]
  const apply = async () => {
    if (!frame) return
    setBusy(true)
    try {
      await reviseScene({ frameId: frame.id, instruction: s.instruction, focus: 'all', userId })
      await markSuggestionApplied(message.id, index, userId)
      useWS.getState().set({ selectedId: frame.id })
      toast(`Cena ${s.sceneNumber} refeita. A versão anterior está em Versões.`, { tone: 'ok' })
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-[#E4E4E7] bg-white px-3 py-2.5">
      <span className="text-[11px] leading-[14px] font-semibold tracking-[0.02em] text-muted uppercase">Cena {s.sceneNumber}</span>
      <span className="text-[13px] leading-[18px] text-fg">{s.instruction}</span>
      {s.appliedBy ? (
        <span className="text-[12px] leading-4 text-muted">Aplicada por {s.appliedBy === userId ? 'você' : userById(s.appliedBy).name.split(' ')[0]}</span>
      ) : (
        can(role, 'edit') &&
        frame && (
          <button
            onClick={() => void apply()}
            disabled={busy}
            className="flex h-8 items-center gap-1.5 self-start rounded-full bg-[#0071E31A] px-3 text-[13px] leading-4 font-semibold text-accent transition-colors hover:bg-[#0071E326] disabled:opacity-60"
          >
            {busy && <Spinner className="size-3.5 text-accent" />}
            Aplicar na cena
          </button>
        )
      )}
    </div>
  )
}

function Message({ message, me, grouped }: { message: ChatMessage; me: string; grouped: boolean }) {
  const mine = message.authorId === me
  const ai = message.authorId === AI_AUTHOR
  const author = userById(message.authorId)
  return (
    <div className={cx('flex gap-2.5', mine && 'flex-row-reverse', grouped ? 'mt-1' : 'mt-3.5')}>
      <div className="w-7 shrink-0">
        {!grouped &&
          (ai ? (
            <span className="flex size-7 items-center justify-center rounded-full bg-[#0071E31A] text-accent">
              <Sparkles className="size-3.5" />
            </span>
          ) : (
            !mine && <Avatar id={message.authorId} name={author.name} size={28} />
          ))}
      </div>
      <div className={cx('flex max-w-[82%] min-w-0 flex-col gap-1', mine && 'items-end')}>
        {!grouped && (
          <span className="px-1 text-[12px] leading-4 text-muted">
            {mine ? 'Você' : author.name}
            {ai && message.askedBy && <span className="text-faint"> · para {message.askedBy === me ? 'você' : userById(message.askedBy).name.split(' ')[0]}</span>}
            <span className="text-faint"> · {timeAgo(message.createdAt)}</span>
          </span>
        )}
        <p
          className={cx(
            'rounded-[16px] px-3.5 py-2 text-[14px] leading-5 break-words whitespace-pre-wrap',
            mine ? 'bg-accent text-white' : ai ? 'bg-[#F4F4F5] text-fg ring-1 ring-[#0071E31F]' : 'bg-[#F4F4F5] text-fg',
          )}
        >
          {message.text}
        </p>
        {message.suggestions?.map((_, i) => (
          <Suggestion key={i} message={message} index={i} />
        ))}
      </div>
    </div>
  )
}

/** The project chat: everyone in the project sees the same messages; "@ia" asks the assistant. */
export function ChatPanel({ closable = true }: { closable?: boolean }) {
  const { project, userId, role } = useWD()
  const loaded = useLiveQuery(() => db.messages.where('projectId').equals(project.id).sortBy('createdAt'), [project.id])
  const messages = loaded ?? []
  const [text, setText] = useState('')
  const [aiMode, setAiMode] = useState(false)
  const [busy, setBusy] = useState<'send' | 'ai'>()
  const list = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const canWrite = can(role, 'comment')

  // Marks everything as read while the chat is open. Messages carry their author's clock, which may run
  // ahead of this one, so the mark is never earlier than the newest message.
  useEffect(() => {
    try {
      localStorage.setItem(lastReadKey(project.id), String(Math.max(Date.now(), ...messages.map((m) => m.createdAt))))
    } catch {
      // Storage blocked: the badge just counts again next time.
    }
  }, [project.id, messages])

  useLayoutEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight })
  }, [messages.length, busy])

  const send = async (raw = text) => {
    const value = raw.trim()
    if (!value || busy) return
    const toAI = aiMode || AI_MENTION.test(value)
    setBusy(toAI ? 'ai' : 'send')
    setText('')
    try {
      if (toAI) await askAssistant(project.id, userId, value)
      else await sendMessage(project.id, userId, value)
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(undefined)
      field.current?.focus()
    }
  }

  return (
    <>
      <PanelHeader label={project.remote ? `${project.members.length} ${project.members.length === 1 ? 'pessoa' : 'pessoas'} no projeto` : 'Só neste navegador'} title="Chat" closable={closable}>
        {!project.remote && (
          <div className="flex items-center justify-between gap-3 rounded-[12px] bg-[#F4F4F5] px-3 py-2.5">
            <span className="text-[13px] leading-[18px] text-fg-2">Compartilhe o projeto para conversar com o time.</span>
            <ShareButton compact />
          </div>
        )}
      </PanelHeader>

      <div ref={list} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-3" aria-live="polite">
        {!loaded ? null : messages.length === 0 ? (
          <div className="m-auto flex max-w-64 flex-col items-center gap-3 py-6 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-[#0071E31A] text-accent">
              <Sparkles className="size-4" />
            </span>
            <p className="text-[13px] leading-[18px] text-muted">Converse com o time aqui. Comece com @ia para pedir ajuda à IA, que lê o briefing e as cenas.</p>
            {canWrite && (
              <div className="flex flex-col gap-1.5">
                {STARTERS.map((q) => (
                  <button key={q} onClick={() => void send(`@ia ${q}`)} className="rounded-full border border-[#E4E4E7] px-3 py-1.5 text-[13px] leading-4 text-fg transition-colors hover:bg-[#FAFAFA]">
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1]
            const grouped = !!prev && prev.authorId === m.authorId && m.createdAt - prev.createdAt < 5 * 60_000
            return <Message key={m.id} message={m} me={userId} grouped={grouped} />
          })
        )}
        {busy === 'ai' && (
          <div className="mt-3.5 flex items-center gap-2.5 text-[13px] text-muted">
            <span className="flex size-7 items-center justify-center rounded-full bg-[#0071E31A] text-accent">
              <Sparkles className="size-3.5" />
            </span>
            <span className="animate-pulse">Decupa IA está lendo o projeto…</span>
          </div>
        )}
      </div>

      {canWrite ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
          className="flex shrink-0 items-end gap-2 border-t border-[#E4E4E7] px-3 py-3"
        >
          <button
            type="button"
            aria-pressed={aiMode}
            title={aiMode ? 'Mensagens vão para a IA' : 'Perguntar à IA'}
            onClick={() => setAiMode((v) => !v)}
            className={cx('flex size-9 shrink-0 items-center justify-center rounded-full transition-colors', aiMode ? 'bg-accent text-white' : 'bg-[#F4F4F5] text-muted hover:text-accent')}
          >
            <Sparkles className="size-4" />
          </button>
          <textarea
            ref={field}
            rows={1}
            value={text}
            disabled={!!busy}
            onChange={(e) => {
              setText(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                void send()
              }
            }}
            aria-label="Mensagem"
            placeholder={aiMode ? 'Pergunte à IA sobre o projeto…' : 'Mensagem · @ia chama a IA'}
            className="max-h-[120px] min-h-9 min-w-0 flex-1 resize-none rounded-[18px] bg-[#F4F4F5] px-3.5 py-2 text-[14px] leading-5 text-fg outline-none placeholder:text-faint focus:ring-2 focus:ring-[#0071E333] max-md:text-[16px]"
          />
          <button
            type="submit"
            aria-label="Enviar"
            disabled={!text.trim() || !!busy}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent transition-[background-color,opacity] hover:bg-[#0077ed] disabled:opacity-40"
          >
            {busy ? (
              <Spinner className="size-4 text-white" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
                <path d="M8 13V3.2M4 7.2L8 3.2l4 4" fill="none" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </form>
      ) : (
        <p className="shrink-0 border-t border-[#E4E4E7] px-[22px] py-3 text-[13px] text-muted">Seu papel neste projeto é só de leitura.</p>
      )}
    </>
  )
}
