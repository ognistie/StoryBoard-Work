import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCircle2, RotateCcw, Sparkles } from 'lucide-react'
import { FrameImage } from '../../components/FrameImage'
import { Badge, cx, Empty } from '../../components/ui'
import { db } from '../../lib/db'
import { formatDate } from '../../lib/hooks'
import { userById } from '../../lib/session'
import type { Frame, Revision } from '../../lib/types'
import { useWS } from './store'

export const KIND_LABEL: Record<Revision['kind'], string> = {
  initial: 'Inicial',
  'ai-edit': 'Edição IA',
  'ai-generate': 'Geração IA',
  briefing: 'Briefing mudou',
  manual: 'Manual',
  restore: 'Restauração',
  upload: 'Importação',
  proposal: 'Proposta aceita',
}

/** GitHub-like commit list for one frame. */
export function FrameHistoryPanel({ frame }: { frame: Frame }) {
  const revisions = useLiveQuery(() => db.revisions.where('frameId').equals(frame.id).reverse().sortBy('number'), [frame.id]) ?? []
  const approvals = useLiveQuery(() => db.approvals.where('frameId').equals(frame.id).toArray(), [frame.id]) ?? []
  const ws = useWS()
  if (!revisions.length) return <Empty title="Sem versões ainda" />
  return (
    <div className="p-4">
      {frame.dirty && (
        <div className="relative mb-1 flex gap-3 pb-4 pl-1">
          <span className="relative z-10 mt-1 size-3 rounded-full border-2 border-dashed border-accent bg-surface" />
          <span className="text-[12.5px] text-muted italic">Alterações locais ainda não versionadas</span>
        </div>
      )}
      <ol className="relative">
        <span className="absolute top-2 bottom-6 left-[10px] w-px bg-line-strong" />
        {revisions.map((r) => {
          const approved = approvals.find((a) => a.revisionId === r.id && a.decision === 'approved')
          const isHead = r.id === frame.headRevisionId
          return (
            <li key={r.id}>
              <button onClick={() => ws.set({ diffRevisionId: r.id })} className="group flex w-full gap-3 rounded-lg py-2 pr-2 pl-1 text-left hover:bg-surface-2">
                <span className={cx('relative z-10 mt-1 size-3 shrink-0 rounded-full border-2', isHead ? 'border-accent bg-accent' : 'border-line-strong bg-surface')} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <code className="font-mono text-[11.5px] font-medium text-accent">{r.short}</code>
                    <span className="text-[11px] text-muted">v{r.number}</span>
                    {isHead && <Badge tone="accent">atual</Badge>}
                    {approved && (
                      <span title={`Aprovado por ${userById(approved.userId).name}`}>
                        <CheckCircle2 className="size-3.5 text-ok" />
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug font-medium">{r.message}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted">
                    {r.kind === 'ai-edit' || r.kind === 'ai-generate' || r.kind === 'proposal' ? <Sparkles className="size-3" /> : r.kind === 'restore' ? <RotateCcw className="size-3" /> : null}
                    {userById(r.authorId).name.split(' ')[0]} · {formatDate(r.createdAt)} · {KIND_LABEL[r.kind]}
                  </span>
                </span>
                <FrameImage imageId={r.snapshot.imageId} alt="" className="w-16 shrink-0 self-center rounded-md border border-line" />
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
