import { BookOpen, History, MessageSquare, SlidersHorizontal, Sparkles } from 'lucide-react'
import { Empty, cx } from '../../components/ui'
import { can } from '../../lib/session'
import { AIPanel } from './AIPanel'
import { CommentsPanel } from './CommentsPanel'
import { useWD } from './context'
import { DetailsPanel } from './DetailsPanel'
import { FrameContextPanel } from './FrameContextPanel'
import { FrameHistoryPanel } from './FrameHistoryPanel'
import { useWS, type PanelTab } from './store'

const TABS: { id: PanelTab; label: string; icon: React.ReactNode }[] = [
  { id: 'ai', label: 'IA', icon: <Sparkles className="size-4" /> },
  { id: 'details', label: 'Detalhes', icon: <SlidersHorizontal className="size-4" /> },
  { id: 'comments', label: 'Comentários', icon: <MessageSquare className="size-4" /> },
  { id: 'context', label: 'Contexto', icon: <BookOpen className="size-4" /> },
  { id: 'history', label: 'Histórico', icon: <History className="size-4" /> },
]

export function RightPanel() {
  const { frames, comments, jobs, proposals, userId, role } = useWD()
  const ws = useWS()
  const frame = frames.find((f) => f.id === ws.focusId)
  const badge: Partial<Record<PanelTab, number>> = {
    ai: jobs.filter((j) => j.createdBy === userId && j.decision === 'pending' && j.status === 'ready').length + (can(role, 'decide') ? proposals.filter((p) => p.status === 'open').length : 0),
    comments: frame ? comments.filter((c) => c.frameId === frame.id && !c.resolved).length : 0,
  }

  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-l border-line bg-surface" aria-label="Painel contextual">
      <div className="flex h-12 shrink-0 items-center gap-0.5 border-b border-line px-2" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={ws.panel === t.id}
            title={t.label}
            onClick={() => ws.set({ panel: t.id })}
            className={cx(
              'relative flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium transition-colors',
              ws.panel === t.id ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {t.icon}
            {(ws.panel === t.id || t.id === 'ai') && <span>{t.label}</span>}
            {!!badge[t.id] && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">{badge[t.id]}</span>}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {ws.panel === 'ai' ? (
          <AIPanel />
        ) : !frame ? (
          <Empty title="Nenhum quadro selecionado">Selecione um quadro no storyboard para ver detalhes, comentários e histórico.</Empty>
        ) : ws.panel === 'details' ? (
          <DetailsPanel key={frame.id} frame={frame} />
        ) : ws.panel === 'comments' ? (
          <CommentsPanel key={frame.id} frame={frame} />
        ) : ws.panel === 'context' ? (
          <FrameContextPanel frame={frame} />
        ) : (
          <FrameHistoryPanel frame={frame} />
        )}
      </div>
    </aside>
  )
}
