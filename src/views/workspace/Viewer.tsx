import { ArrowUpRight, ChevronLeft, ChevronRight, MessageSquare, Sparkles, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FrameImage } from '../../components/FrameImage'
import { Badge, Button, cx, IconButton, Input, toastError } from '../../components/ui'
import { MOVE_LABEL, SHOT_LABEL } from '../../lib/context'
import { uid } from '../../lib/ids'
import { updateFrame } from '../../lib/repo'
import { can } from '../../lib/session'
import type { Annotation, Frame } from '../../lib/types'
import { ApprovalBox } from './ApprovalBox'
import { frameNumber, useWD } from './context'
import { useWS } from './store'

export function AnnotationLayer({ annotations, draft }: { annotations: Annotation[]; draft?: Annotation }) {
  const all = draft ? [...annotations, draft] : annotations
  return (
    <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 56.25" preserveAspectRatio="none">
      <defs>
        <marker id="arrowhead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#ff3b5c" />
        </marker>
      </defs>
      {all.map((a) => (
        <g key={a.id}>
          <line x1={a.x1 * 100} y1={a.y1 * 56.25} x2={a.x2 * 100} y2={a.y2 * 56.25} stroke={a.color} strokeWidth={0.6} strokeLinecap="round" markerEnd="url(#arrowhead)" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 3 }} />
          {a.label && (
            <text x={a.x2 * 100 + 1} y={a.y2 * 56.25 - 1} fontSize={2.4} fontWeight={700} fill={a.color} stroke="white" strokeWidth={0.5} paintOrder="stroke">
              {a.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

export function Viewer() {
  const ws = useWS()
  const { ordered, comments, role, userId, scenes } = useWD()
  const idx = ordered.findIndex((f) => f.id === ws.viewerId)
  const frame = ordered[idx]
  const [annotate, setAnnotate] = useState(false)
  const close = () => ws.set({ viewerId: undefined })
  const go = (d: number) => {
    const n = ordered[idx + d]
    if (n) ws.set({ viewerId: n.id, selection: [n.id], focusId: n.id })
  }

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })

  if (!frame) return null
  const pins = comments.filter((c) => c.frameId === frame.id && c.pin && !c.resolved)
  const scene = scenes.find((s) => s.id === frame.sceneId)

  return createPortal(
    <div className="fade-in fixed inset-0 z-50 flex bg-neutral-950/92 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Quadro ${frame.title}`}>
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center gap-3 px-4 text-white">
          <span className="font-mono text-[12px] text-white/60">
            {frameNumber(ordered, frame.id)} / {ordered.length}
          </span>
          <span className="text-[13px] font-medium">{scene?.heading}</span>
          <div className="flex-1" />
          {can(role, 'edit') && (
            <button onClick={() => setAnnotate((a) => !a)} className={cx('flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium', annotate ? 'bg-white text-neutral-900' : 'text-white/80 hover:bg-white/10')}>
              <ArrowUpRight className="size-4" /> {annotate ? 'Concluir anotações' : 'Anotar'}
            </button>
          )}
          <button onClick={close} className="flex size-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10" aria-label="Fechar (Esc)">
            <X className="size-5" />
          </button>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-16 pb-8">
          <button disabled={idx === 0} onClick={() => go(-1)} className="absolute left-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-20" aria-label="Anterior">
            <ChevronLeft className="size-5" />
          </button>
          <div className="w-full max-w-[min(1200px,calc((100vh-140px)*16/9))]">
            <AnnotatedImage frame={frame} annotate={annotate} pins={pins.map((p) => p.pin!)} />
          </div>
          <button disabled={idx === ordered.length - 1} onClick={() => go(1)} className="absolute right-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-20" aria-label="Próximo">
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
      <aside className="hidden w-[340px] shrink-0 space-y-4 overflow-y-auto border-l border-white/10 bg-surface p-5 md:block">
        <div>
          <h2 className="text-[16px] font-semibold tracking-tight">{frame.title}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge>{SHOT_LABEL[frame.shot]}</Badge>
            <Badge>{MOVE_LABEL[frame.movement]}</Badge>
            <Badge>{frame.duration}s</Badge>
            {frame.characters.map((c) => (
              <Badge key={c} tone="accent">
                {c}
              </Badge>
            ))}
          </div>
        </div>
        <p className="text-[13px] leading-relaxed text-fg-2">{frame.description}</p>
        {frame.dialogue && <p className="rounded-lg bg-surface-2 p-3 text-[12.5px] whitespace-pre-line italic">{frame.dialogue}</p>}
        <ApprovalBox frame={frame} />
        <div className="flex gap-1.5">
          {can(role, 'ai') && (
            <Button
              size="sm"
              accent
              className="flex-1"
              icon={<Sparkles className="size-3.5" />}
              onClick={() => {
                close()
                ws.openPanel('ai', frame.id)
              }}
            >
              Editar com IA
            </Button>
          )}
          <Button
            size="sm"
            className="flex-1"
            icon={<MessageSquare className="size-3.5" />}
            onClick={() => {
              close()
              ws.openPanel('comments', frame.id)
            }}
          >
            Comentários
          </Button>
        </div>
        {(annotate || frame.annotations.length > 0) && <AnnotationList frame={frame} editable={can(role, 'edit')} userId={userId} />}
      </aside>
    </div>,
    document.body,
  )
}

function AnnotatedImage({ frame, annotate, pins }: { frame: Frame; annotate: boolean; pins: { x: number; y: number }[] }) {
  const { userId } = useWD()
  const ref = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<Annotation>()
  const pt = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }
  return (
    <div
      ref={ref}
      className={cx('relative overflow-hidden rounded-lg shadow-2xl', annotate && 'cursor-crosshair touch-none')}
      onPointerDown={(e) => {
        if (!annotate) return
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        const p = pt(e)
        setDraft({ id: uid('ann'), kind: 'arrow', x1: p.x, y1: p.y, x2: p.x, y2: p.y, color: '#ff3b5c' })
      }}
      onPointerMove={(e) => draft && setDraft({ ...draft, ...{ x2: pt(e).x, y2: pt(e).y } })}
      onPointerUp={async () => {
        if (!draft) return
        const len = Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1)
        setDraft(undefined)
        if (len < 0.03) return
        try {
          await updateFrame(frame.id, userId, { annotations: [...frame.annotations, draft] })
        } catch (err) {
          toastError(err)
        }
      }}
    >
      <FrameImage imageId={frame.imageId} alt={frame.description || frame.title} />
      <AnnotationLayer annotations={frame.annotations} draft={draft} />
      {pins.map((p, i) => (
        <span key={i} className="absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white shadow-md ring-2 ring-white" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>
          {i + 1}
        </span>
      ))}
      {annotate && <div className="pointer-events-none absolute inset-x-0 top-3 text-center text-[12px] font-medium text-white drop-shadow">Arraste para desenhar uma seta (câmera, deslocamento do ator…)</div>}
    </div>
  )
}

function AnnotationList({ frame, editable, userId }: { frame: Frame; editable: boolean; userId: string }) {
  const save = (annotations: Annotation[]) => updateFrame(frame.id, userId, { annotations }).catch(toastError)
  return (
    <div className="space-y-2">
      <h3 className="text-[12.5px] font-semibold">Anotações gráficas</h3>
      <p className="text-[11.5px] text-muted">Camada separada: a imagem original não é alterada.</p>
      {frame.annotations.map((a, i) => (
        <div key={a.id} className="flex items-center gap-1.5">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: a.color }} />
          <Input
            defaultValue={a.label}
            disabled={!editable}
            placeholder={`Seta ${i + 1} — ex.: dolly in`}
            onBlur={(e) => e.target.value !== (a.label ?? '') && save(frame.annotations.map((x) => (x.id === a.id ? { ...x, label: e.target.value } : x)))}
          />
          {editable && (
            <IconButton size="sm" label="Remover anotação" onClick={() => save(frame.annotations.filter((x) => x.id !== a.id))}>
              <Trash2 className="size-3.5" />
            </IconButton>
          )}
        </div>
      ))}
    </div>
  )
}
