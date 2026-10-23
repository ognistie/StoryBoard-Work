import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlertTriangle, Clock, Columns2, Copy, ImagePlus, Maximize2, MessageSquare, MoreHorizontal, RefreshCw, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { memo } from 'react'
import { FrameImage } from '../../components/FrameImage'
import { Avatar, Badge, cx, Menu, MenuItem, STATUS_META } from '../../components/ui'
import { SHOT_LABEL } from '../../lib/context'
import { isJobActive } from '../../lib/jobs'
import { usePresence } from '../../lib/presence'
import { frameNeedsRevalidation } from '../../lib/repo'
import { can } from '../../lib/session'
import type { Frame, GenerationJob } from '../../lib/types'
import { duplicate, generateFromDescription, removeFrame, replaceImage } from './actions'
import { useWD } from './context'
import { useWS } from './store'
import { AnnotationLayer } from './Viewer'

const JOB_LABEL: Record<string, string> = {
  queued: 'Na fila…',
  preparing: 'Preparando contexto…',
  generating: 'Gerando prévia…',
  refining: 'Refinando…',
}

export const FrameCard = memo(function FrameCard({
  frame,
  number,
  selected,
  job,
  comments,
  proposal,
  onSelect,
  strip,
}: {
  frame: Frame
  number: string
  selected: boolean
  job?: GenerationJob
  comments: number
  proposal: boolean
  onSelect: (e: React.MouseEvent) => void
  strip?: boolean
}) {
  const { role, userId } = useWD()
  const ws = useWS()
  const editable = can(role, 'edit')
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: frame.id, disabled: !editable })
  const peers = usePresence((s) => s.peers)
  const watchers = [...new Set(Object.values(peers).filter((p) => p.frameId === frame.id && p.userId !== userId).map((p) => p.userId))]
  const active = job && isJobActive(job)
  const ready = job?.status === 'ready'
  const failed = job?.status === 'error'
  const revalidate = frameNeedsRevalidation(frame)
  const status = STATUS_META[frame.status]

  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx('group relative', isDragging && 'z-10 opacity-60', strip && 'w-[340px] shrink-0')}
      data-frame-id={frame.id}
    >
      <div
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={`Quadro ${number}: ${frame.title}`}
        onClick={onSelect}
        onDoubleClick={() => ws.set({ viewerId: frame.id })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') ws.set({ viewerId: frame.id })
        }}
        className={cx(
          'overflow-hidden rounded-xl border bg-surface shadow-sm transition-[box-shadow,border-color] outline-none',
          selected ? 'border-accent ring-3 ring-accent/35' : 'border-line hover:border-line-strong hover:shadow-md',
          'focus-visible:ring-3 focus-visible:ring-accent/40',
        )}
      >
        <FrameImage imageId={frame.imageId} alt={frame.description || frame.title}>
          {active && (
            <div className="absolute inset-0 flex items-end bg-black/10">
              <div className="shimmer absolute inset-0" />
              <div className="relative m-2 flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
                <Sparkles className="size-3 animate-pulse" />
                {JOB_LABEL[job!.status]}
              </div>
            </div>
          )}
          {ready && (
            <button
              onClick={(e) => {
                stop(e)
                ws.openPanel('ai', frame.id)
              }}
              className="absolute right-2 bottom-2 flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-[11px] font-semibold text-white shadow-md transition-transform hover:scale-105"
            >
              <Wand2 className="size-3" />
              Prévia pronta
            </button>
          )}
          {failed && (
            <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-md bg-danger px-2 py-1 text-[11px] font-semibold text-white">
              <AlertTriangle className="size-3" /> Falha na IA
            </span>
          )}
          <span className={cx('absolute top-2 left-2 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium text-white backdrop-blur', selected ? 'bg-accent' : 'bg-black/65')}>{number}</span>
          <AnnotationLayer annotations={frame.annotations} />
          {watchers.length > 0 && (
            <span className="absolute top-2 right-2 flex -space-x-1">
              {watchers.map((u) => (
                <Avatar key={u} userId={u} size={20} ring />
              ))}
            </span>
          )}

          {/* hover actions */}
          <div
            className="absolute inset-x-2 top-2 flex justify-end gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
            onPointerDown={stop}
            onClick={stop}
            style={{ paddingLeft: 36 }}
          >
            {can(role, 'ai') && (
              <HoverBtn label="Editar com IA (E)" onClick={() => ws.openPanel('ai', frame.id)} accent>
                <Sparkles className="size-3.5" />
                <span className="hidden sm:inline">Editar com IA</span>
              </HoverBtn>
            )}
            <HoverBtn label="Ampliar (Enter)" onClick={() => ws.set({ viewerId: frame.id })}>
              <Maximize2 className="size-3.5" />
            </HoverBtn>
            {can(role, 'comment') && (
              <HoverBtn label="Comentar (C)" onClick={() => ws.openPanel('comments', frame.id)}>
                <MessageSquare className="size-3.5" />
              </HoverBtn>
            )}
            <HoverBtn
              label="Comparar versões"
              onClick={() => (ready ? ws.openPanel('ai', frame.id) : ws.set({ diffRevisionId: frame.headRevisionId }))}
            >
              <Columns2 className="size-3.5" />
            </HoverBtn>
            {editable && (
              <Menu
                align="right"
                trigger={(toggle) => (
                  <HoverBtn label="Mais opções" onClick={toggle}>
                    <MoreHorizontal className="size-3.5" />
                  </HoverBtn>
                )}
              >
                {(close) => (
                  <>
                    <MenuItem icon={<Copy />} onClick={() => (close(), duplicate(frame, userId))}>
                      Duplicar
                    </MenuItem>
                    <MenuItem icon={<ImagePlus />} onClick={() => (close(), replaceImage(frame, userId))}>
                      Importar imagem
                    </MenuItem>
                    <MenuItem icon={<RefreshCw />} onClick={() => (close(), generateFromDescription([frame], userId))}>
                      Gerar imagem da descrição
                    </MenuItem>
                    <div className="my-1 h-px bg-line" />
                    <MenuItem icon={<Trash2 />} danger onClick={() => (close(), removeFrame(frame, userId))}>
                      Excluir quadro
                    </MenuItem>
                  </>
                )}
              </Menu>
            )}
          </div>
        </FrameImage>

        <div className="space-y-1.5 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className={cx('size-2 shrink-0 rounded-full', status.dot)} title={status.label} />
            <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-tight">{frame.title}</h3>
            {comments > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] text-muted" title={`${comments} comentários abertos`}>
                <MessageSquare className="size-3" />
                {comments}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted">
            <span>{SHOT_LABEL[frame.shot]}</span>
            <span className="text-line-strong">·</span>
            <span className="flex items-center gap-0.5">
              <Clock className="size-3" />
              {frame.duration}s
            </span>
            {proposal && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  ws.openPanel('ai', frame.id)
                }}
                className="rounded-md hover:ring-2 hover:ring-accent/30"
              >
                <Badge tone="accent">Proposta pendente</Badge>
              </button>
            )}
            {revalidate && !proposal && <Badge tone="warn">Revalidar</Badge>}
            {frame.dirty && <Badge>Não versionado</Badge>}
            {frame.contextOutdated && <Badge tone="info">Roteiro mudou</Badge>}
          </div>
        </div>
      </div>
    </div>
  )
})

function HoverBtn({ label, onClick, children, accent }: { label: string; onClick: () => void; children: React.ReactNode; accent?: boolean }) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cx(
        'flex h-7 items-center gap-1 rounded-md px-1.5 text-[11.5px] font-semibold shadow-md backdrop-blur transition-transform hover:scale-105',
        accent ? 'bg-accent text-white' : 'bg-white/90 text-neutral-800 hover:bg-white',
      )}
    >
      {children}
    </button>
  )
}
