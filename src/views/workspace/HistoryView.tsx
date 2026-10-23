import { useLiveQuery } from 'dexie-react-hooks'
import { Flag, GitCommitHorizontal, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { FrameImage } from '../../components/FrameImage'
import { Avatar, Badge, Button, cx, Input, Segmented, toast, toastError } from '../../components/ui'
import { db } from '../../lib/db'
import { formatDate, timeAgo } from '../../lib/hooks'
import { createSnapshot } from '../../lib/repo'
import { can, userById } from '../../lib/session'
import { frameNumber, useWD } from './context'
import { KIND_LABEL } from './FrameHistoryPanel'
import { useWS } from './store'

/** Project-wide history: commits (revisions), audit events and snapshots. */
export function HistoryView() {
  const { project, ordered, role, userId } = useWD()
  const ws = useWS()
  const [mode, setMode] = useState<'commits' | 'activity' | 'snapshots'>('commits')
  const revisions = useLiveQuery(() => db.revisions.where('projectId').equals(project.id).reverse().sortBy('createdAt'), [project.id]) ?? []
  const events = useLiveQuery(() => db.events.where('projectId').equals(project.id).reverse().sortBy('createdAt'), [project.id]) ?? []
  const snapshots = useLiveQuery(() => db.snapshots.where('projectId').equals(project.id).reverse().sortBy('createdAt'), [project.id]) ?? []
  const [snapName, setSnapName] = useState('')

  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Histórico do projeto</h2>
            <p className="text-[12.5px] text-muted">Cada versão é imutável. Restaurar cria uma nova versão; nada é apagado.</p>
          </div>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'commits', label: `Versões (${revisions.length})` },
              { value: 'activity', label: 'Atividade' },
              { value: 'snapshots', label: 'Marcos' },
            ]}
          />
        </div>

        {mode === 'commits' && (
          <ol className="relative mt-6">
            <span className="absolute top-3 bottom-3 left-[13px] w-px bg-line-strong" />
            {revisions.map((r) => {
              const frame = ordered.find((f) => f.id === r.frameId)
              const ai = r.kind === 'ai-edit' || r.kind === 'ai-generate' || r.kind === 'proposal'
              return (
                <li key={r.id}>
                  <button onClick={() => (frame ? ws.set({ diffRevisionId: r.id }) : toast('O quadro desta versão foi removido; o registro permanece para auditoria.'))} className="group flex w-full gap-4 rounded-xl py-2.5 pr-3 pl-1.5 text-left hover:bg-surface">
                    <span className={cx('relative z-10 mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border-2 bg-bg', ai ? 'border-accent text-accent' : 'border-line-strong text-muted')}>
                      {ai ? <Sparkles className="size-3" /> : <GitCommitHorizontal className="size-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <code className="font-mono text-[12px] font-semibold text-accent">{r.short}</code>
                        <span className="text-[13.5px] font-medium">{r.message}</span>
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                        <Avatar userId={r.authorId} size={16} />
                        {userById(r.authorId).name} · {formatDate(r.createdAt)} · <Badge>{KIND_LABEL[r.kind]}</Badge>
                        {frame ? <span>Quadro {frameNumber(ordered, frame.id)} “{frame.title}” · v{r.number}</span> : <Badge tone="danger">quadro removido</Badge>}
                      </span>
                    </span>
                    <FrameImage imageId={r.snapshot.imageId} alt="" className="w-28 shrink-0 rounded-lg border border-line" />
                  </button>
                </li>
              )
            })}
          </ol>
        )}

        {mode === 'activity' && (
          <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-surface">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                <Avatar userId={e.actorId} size={24} />
                <span className="min-w-0 flex-1 text-[13px]">
                  <b className="font-medium">{userById(e.actorId).name.split(' ')[0]}</b> <span className="text-fg-2">{e.message}</span>
                </span>
                <span className="shrink-0 text-[12px] text-muted" title={formatDate(e.createdAt)}>
                  {timeAgo(e.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {mode === 'snapshots' && (
          <div className="mt-6 space-y-4">
            {can(role, 'edit') && (
              <div className="flex gap-2">
                <Input value={snapName} onChange={(e) => setSnapName(e.target.value)} placeholder="Nome do marco (ex.: Rodada 2 para o cliente)" />
                <Button
                  variant="primary"
                  icon={<Flag className="size-4" />}
                  onClick={async () => {
                    try {
                      await createSnapshot(project.id, userId, snapName.trim() || `Marco ${snapshots.length + 1}`)
                      setSnapName('')
                      toast('Marco criado', { tone: 'ok' })
                    } catch (e) {
                      toastError(e)
                    }
                  }}
                >
                  Criar marco
                </Button>
              </div>
            )}
            {snapshots.map((s) => (
              <div key={s.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-center gap-2">
                  <Flag className="size-4 text-accent" />
                  <span className="text-[13.5px] font-semibold">{s.name}</span>
                  <span className="ml-auto text-[12px] text-muted">
                    {userById(s.authorId).name.split(' ')[0]} · {formatDate(s.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-muted">{s.frames.length} quadros congelados nas versões daquele momento.</p>
                <SnapshotStrip revisionIds={s.frames.map((f) => f.revisionId).filter(Boolean) as string[]} />
              </div>
            ))}
            {!snapshots.length && <p className="text-[12.5px] text-muted">Nenhum marco ainda. Crie um ao enviar uma rodada para o cliente.</p>}
          </div>
        )}
      </div>
    </div>
  )
}

function SnapshotStrip({ revisionIds }: { revisionIds: string[] }) {
  const ws = useWS()
  const revs = useLiveQuery(() => db.revisions.bulkGet(revisionIds), [revisionIds.join()]) ?? []
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
      {revs.map((r) =>
        r ? (
          <button key={r.id} onClick={() => ws.set({ diffRevisionId: r.id })} className="w-32 shrink-0 text-left">
            <FrameImage imageId={r.snapshot.imageId} alt="" className="rounded-md border border-line" />
            <span className="mt-1 block truncate font-mono text-[10.5px] text-muted">
              {r.short} · v{r.number}
            </span>
          </button>
        ) : null,
      )}
    </div>
  )
}
