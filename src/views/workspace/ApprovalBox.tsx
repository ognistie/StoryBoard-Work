import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCircle2, MessageSquareWarning } from 'lucide-react'
import { useState } from 'react'
import { Avatar, Button, Input, StatusBadge, toast, toastError } from '../../components/ui'
import { db } from '../../lib/db'
import { timeAgo } from '../../lib/hooks'
import { frameNeedsRevalidation, reviewFrame } from '../../lib/repo'
import { can, userById } from '../../lib/session'
import type { Frame } from '../../lib/types'
import { notify } from './actions'
import { useWD } from './context'

/** Approve / request changes. Approvals always reference an exact revision. */
export function ApprovalBox({ frame }: { frame: Frame }) {
  const { role, userId, project } = useWD()
  const [comment, setComment] = useState('')
  const [asking, setAsking] = useState(false)
  const head = useLiveQuery(() => (frame.headRevisionId ? db.revisions.get(frame.headRevisionId) : undefined), [frame.headRevisionId])
  const approvedRev = useLiveQuery(() => (frame.approvedRevisionId ? db.revisions.get(frame.approvedRevisionId) : undefined), [frame.approvedRevisionId])
  const lastApproval = useLiveQuery(
    () => db.approvals.where('frameId').equals(frame.id).reverse().sortBy('createdAt').then((a) => a[0]),
    [frame.id, frame.status],
  )
  const revalidate = frameNeedsRevalidation(frame)

  const act = async (decision: 'approved' | 'changes') => {
    try {
      await reviewFrame(frame.id, userId, decision, comment.trim() || undefined)
      toast(decision === 'approved' ? `Versão v${head?.number} aprovada` : 'Ajustes solicitados', { tone: decision === 'approved' ? 'ok' : 'neutral' })
      notify(project.id, userId, decision === 'approved' ? `aprovou “${frame.title}”` : `pediu ajustes em “${frame.title}”`, frame.id)
      setComment('')
      setAsking(false)
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div className="space-y-2.5 rounded-xl border border-line p-3">
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={frame.status} />
        <span className="font-mono text-[11px] text-muted">
          {head ? `v${head.number} · ${head.short}` : '—'}
          {frame.dirty && ' + alterações'}
        </span>
      </div>
      {revalidate && approvedRev && (
        <p className="rounded-lg bg-warn-soft p-2 text-[11.5px] leading-snug text-warn">
          Aprovado na v{approvedRev.number} ({approvedRev.short}). A versão atual mudou e precisa de nova validação.
        </p>
      )}
      {lastApproval && (
        <div className="flex items-center gap-2 text-[11.5px] text-muted">
          <Avatar userId={lastApproval.userId} size={18} />
          <span>
            {userById(lastApproval.userId).name.split(' ')[0]} {lastApproval.decision === 'approved' ? 'aprovou' : 'pediu ajustes'} {timeAgo(lastApproval.createdAt)}
          </span>
        </div>
      )}
      {can(role, 'approve') && (
        <>
          {asking && <Input autoFocus value={comment} onChange={(e) => setComment(e.target.value)} placeholder="O que precisa mudar? (opcional)" onKeyDown={(e) => e.key === 'Enter' && act('changes')} />}
          <div className="flex gap-1.5">
            {frame.status !== 'approved' || revalidate ? (
              <Button size="sm" className="flex-1" icon={<CheckCircle2 className="size-3.5 text-ok" />} onClick={() => act('approved')}>
                Aprovar v{head?.number ?? ''}
              </Button>
            ) : null}
            <Button size="sm" className="flex-1" variant={asking ? 'primary' : 'secondary'} icon={<MessageSquareWarning className="size-3.5" />} onClick={() => (asking ? act('changes') : setAsking(true))}>
              {asking ? 'Enviar pedido' : 'Solicitar ajustes'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
