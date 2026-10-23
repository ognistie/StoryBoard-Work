import { useLiveQuery } from 'dexie-react-hooks'
import { Check, CornerDownRight, MapPin, Send } from 'lucide-react'
import { useState } from 'react'
import { FrameImage } from '../../components/FrameImage'
import { Avatar, Button, cx, Empty, Textarea, toastError } from '../../components/ui'
import { db } from '../../lib/db'
import { timeAgo } from '../../lib/hooks'
import { addComment, setCommentResolved } from '../../lib/repo'
import { can, userById } from '../../lib/session'
import type { Comment, Frame } from '../../lib/types'
import { notify } from './actions'
import { useWD } from './context'

export function renderMentions(text: string) {
  return text.split(/(@[A-Za-zÀ-ú]+)/g).map((p, i) =>
    p.startsWith('@') ? (
      <span key={i} className="rounded bg-accent-soft px-0.5 font-medium text-accent">
        {p}
      </span>
    ) : (
      p
    ),
  )
}

export function CommentsPanel({ frame }: { frame: Frame }) {
  const { comments, role, userId, project } = useWD()
  const [text, setText] = useState('')
  const [pin, setPin] = useState<{ x: number; y: number }>()
  const [pinMode, setPinMode] = useState(false)
  const [replyTo, setReplyTo] = useState<string>()
  const [showResolved, setShowResolved] = useState(false)
  const list = comments.filter((c) => c.frameId === frame.id)
  const roots = list.filter((c) => !c.parentId && (showResolved || !c.resolved))
  const pins = list.filter((c) => c.pin && !c.resolved)
  const revs = useLiveQuery(() => db.revisions.where('frameId').equals(frame.id).toArray(), [frame.id]) ?? []
  const revLabel = (id?: string) => {
    const r = revs.find((x) => x.id === id)
    return r ? `v${r.number}` : ''
  }

  const submit = async () => {
    if (!text.trim()) return
    try {
      const id = await addComment(project.id, frame.id, userId, text.trim(), pin)
      if (replyTo) await db.comments.update(id, { parentId: replyTo })
      notify(project.id, userId, `comentou em “${frame.title}”: ${text.trim().slice(0, 60)}`, frame.id)
      setText('')
      setPin(undefined)
      setPinMode(false)
      setReplyTo(undefined)
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 p-4 pb-2">
        <div
          className={cx('relative overflow-hidden rounded-lg border', pinMode ? 'cursor-crosshair border-accent ring-3 ring-accent/20' : 'border-line')}
          onClick={(e) => {
            if (!pinMode) return
            const r = e.currentTarget.getBoundingClientRect()
            setPin({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height })
          }}
        >
          <FrameImage imageId={frame.imageId} alt={frame.title} />
          {pins.map((c, i) => (
            <span key={c.id} className="absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white shadow-md ring-2 ring-white" style={{ left: `${c.pin!.x * 100}%`, top: `${c.pin!.y * 100}%` }}>
              {i + 1}
            </span>
          ))}
          {pin && <span className="absolute size-5 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-accent ring-4 ring-accent/30" style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }} />}
          {pinMode && !pin && <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] font-medium text-white drop-shadow">Clique no ponto da imagem</div>}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4">
        {roots.length === 0 && <Empty title="Sem comentários abertos">Comente o quadro ou marque um ponto específico da imagem.</Empty>}
        {roots.map((c) => (
          <Thread key={c.id} root={c} replies={list.filter((r) => r.parentId === c.id)} pinIndex={pins.findIndex((p) => p.id === c.id)} onReply={() => setReplyTo(c.id)} revLabel={revLabel} />
        ))}
        {list.some((c) => c.resolved) && (
          <button className="text-[12px] text-muted hover:text-fg" onClick={() => setShowResolved((s) => !s)}>
            {showResolved ? 'Ocultar resolvidos' : `Mostrar resolvidos (${list.filter((c) => c.resolved && !c.parentId).length})`}
          </button>
        )}
      </div>

      {can(role, 'comment') && (
        <div className="space-y-2 border-t border-line p-3">
          {replyTo && (
            <div className="flex items-center justify-between text-[11.5px] text-muted">
              <span className="flex items-center gap-1">
                <CornerDownRight className="size-3" /> Respondendo a {userById(list.find((c) => c.id === replyTo)?.authorId).name.split(' ')[0]}
              </span>
              <button onClick={() => setReplyTo(undefined)} className="hover:text-fg">
                cancelar
              </button>
            </div>
          )}
          <Textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva um comentário… use @nome para mencionar"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void submit()
              }
            }}
          />
          <div className="flex items-center justify-between">
            <button onClick={() => (pinMode ? (setPinMode(false), setPin(undefined)) : setPinMode(true))} className={cx('flex items-center gap-1 text-[12px] font-medium', pinMode || pin ? 'text-accent' : 'text-muted hover:text-fg')}>
              <MapPin className="size-3.5" />
              {pin ? 'Ponto marcado' : pinMode ? 'Cancelar ponto' : 'Marcar ponto na imagem'}
            </button>
            <Button size="sm" variant="primary" icon={<Send className="size-3.5" />} disabled={!text.trim()} onClick={submit}>
              Enviar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Thread({ root, replies, pinIndex, onReply, revLabel }: { root: Comment; replies: Comment[]; pinIndex: number; onReply: () => void; revLabel: (id?: string) => string }) {
  const { role, userId } = useWD()
  return (
    <div className={cx('rounded-xl border border-line p-3', root.resolved && 'opacity-60')}>
      {[root, ...replies].map((c, i) => (
        <div key={c.id} className={cx('flex gap-2.5', i > 0 && 'mt-3 border-t border-line pt-3')}>
          <Avatar userId={c.authorId} size={24} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[12px]">
              <b className="font-semibold">{userById(c.authorId).name.split(' ')[0]}</b>
              <span className="text-muted">{timeAgo(c.createdAt)}</span>
              {c.revisionId && <span className="font-mono text-[10.5px] text-muted">{revLabel(c.revisionId)}</span>}
              {i === 0 && pinIndex >= 0 && <span className="flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">{pinIndex + 1}</span>}
            </div>
            <p className="mt-0.5 text-[13px] leading-snug whitespace-pre-wrap text-fg-2">{renderMentions(c.text)}</p>
          </div>
        </div>
      ))}
      {can(role, 'comment') && (
        <div className="mt-2 flex gap-3 pl-8 text-[11.5px] font-medium text-muted">
          <button className="hover:text-fg" onClick={onReply}>
            Responder
          </button>
          <button className="flex items-center gap-1 hover:text-ok" onClick={() => setCommentResolved(root.id, userId, !root.resolved).catch(toastError)}>
            <Check className="size-3" />
            {root.resolved ? 'Reabrir' : 'Resolver'}
          </button>
        </div>
      )}
    </div>
  )
}
