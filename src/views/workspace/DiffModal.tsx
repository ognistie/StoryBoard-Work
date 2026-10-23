import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCircle2, Copy, GitCompareArrows, MessageSquare, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'
import { CompareSlider } from '../../components/CompareSlider'
import { Avatar, Badge, Button, cx, IconButton, Modal, Segmented, toast, toastError } from '../../components/ui'
import { MOVE_LABEL, SHOT_LABEL } from '../../lib/context'
import { db } from '../../lib/db'
import { diffWords } from '../../lib/diff'
import { formatDate } from '../../lib/hooks'
import { duplicateFrame, restoreRevision } from '../../lib/repo'
import { can, userById } from '../../lib/session'
import type { FrameContent } from '../../lib/types'
import { ContextRefs } from './AIPanel'
import { frameNumber, useWD } from './context'
import { KIND_LABEL } from './FrameHistoryPanel'
import { useWS } from './store'

const META_FIELDS: [keyof FrameContent, string][] = [
  ['title', 'Título'],
  ['shot', 'Enquadramento'],
  ['movement', 'Movimento'],
  ['angle', 'Ângulo'],
  ['duration', 'Duração'],
  ['characters', 'Personagens'],
  ['location', 'Locação'],
  ['lighting', 'Iluminação'],
  ['action', 'Ação'],
  ['dialogue', 'Diálogo'],
]

function fmt(k: keyof FrameContent, v: unknown) {
  if (k === 'shot') return SHOT_LABEL[v as string] ?? String(v)
  if (k === 'movement') return MOVE_LABEL[v as string] ?? String(v)
  if (k === 'duration') return `${v}s`
  if (Array.isArray(v)) return v.join(', ') || '—'
  return (v as string) || '—'
}

export function DiffModal() {
  const ws = useWS()
  const { frames, ordered, role, userId } = useWD()
  const rev = useLiveQuery(() => (ws.diffRevisionId ? db.revisions.get(ws.diffRevisionId) : undefined), [ws.diffRevisionId])
  const parent = useLiveQuery(() => (rev?.parentId ? db.revisions.get(rev.parentId) : undefined), [rev?.parentId])
  const approvals = useLiveQuery(() => (rev ? db.approvals.where('revisionId').equals(rev.id).toArray() : []), [rev?.id]) ?? []
  const confidentialIds = useLiveQuery(async () => new Set((await db.docs.toArray()).filter((d) => d.confidential).map((d) => d.id)), []) ?? new Set<string>()
  const [against, setAgainst] = useState<'parent' | 'current'>('parent')
  const [busy, setBusy] = useState(false)
  const close = () => ws.set({ diffRevisionId: undefined })
  const frame = frames.find((f) => f.id === rev?.frameId)
  if (!rev) return null

  const base = against === 'current' && frame ? { content: frame as FrameContent, label: 'Atual' } : parent ? { content: parent.snapshot, label: `v${parent.number} · ${parent.short}` } : null
  const after = rev.snapshot
  const changed = base ? META_FIELDS.filter(([k]) => JSON.stringify(base.content[k]) !== JSON.stringify(after[k])) : []
  const isHead = frame?.headRevisionId === rev.id
  // People without access to confidential documents never see excerpts or prompts built from them.
  const restricted = !can(role, 'docs') && !!rev.ai?.contextRefs.some((r) => confidentialIds.has(r.docId))
  const refs = (rev.ai?.contextRefs ?? []).filter((r) => can(role, 'docs') || !confidentialIds.has(r.docId))

  const restore = async () => {
    setBusy(true)
    try {
      const r = await restoreRevision(rev.id, userId)
      toast(`Restaurado como nova versão v${r.number} (${r.short})`, { tone: 'ok' })
      close()
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={close} width={980} bare>
      <div className="flex max-h-[86vh] flex-col">
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-md bg-accent-soft px-1.5 py-0.5 font-mono text-[12px] font-semibold text-accent">{rev.short}</code>
              <Badge>v{rev.number}</Badge>
              <Badge tone={rev.kind.startsWith('ai') || rev.kind === 'proposal' ? 'accent' : 'neutral'}>{KIND_LABEL[rev.kind]}</Badge>
              {isHead && <Badge tone="ok">versão atual</Badge>}
              {approvals.some((a) => a.decision === 'approved') && (
                <Badge tone="ok">
                  <CheckCircle2 className="size-3" /> aprovada por {approvals.filter((a) => a.decision === 'approved').map((a) => userById(a.userId).name.split(' ')[0]).join(', ')}
                </Badge>
              )}
            </div>
            <h2 className="mt-1.5 text-[16px] font-semibold tracking-tight">{rev.message}</h2>
            <div className="mt-1 flex items-center gap-2 text-[12.5px] text-muted">
              <Avatar userId={rev.authorId} size={18} />
              {userById(rev.authorId).name} · {formatDate(rev.createdAt)} · Quadro {frame ? frameNumber(ordered, frame.id) : '—'} “{after.title}”
            </div>
          </div>
          <IconButton label="Fechar" onClick={close}>
            <X className="size-4" />
          </IconButton>
        </header>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold">Antes / Depois</h3>
              <Segmented
                size="sm"
                value={against}
                onChange={setAgainst}
                options={[
                  { value: 'parent', label: 'vs. anterior' },
                  { value: 'current', label: 'vs. atual' },
                ]}
              />
            </div>
            {base ? (
              <CompareSlider beforeId={base.content.imageId} afterId={after.imageId} beforeLabel={base.label} afterLabel={`v${rev.number}`} />
            ) : (
              <div>
                <p className="mb-2 text-[12px] text-muted">Primeira versão — sem anterior para comparar.</p>
                <CompareSlider beforeId={after.imageId} afterId={after.imageId} showModes={false} />
              </div>
            )}

            <div>
              <h3 className="mb-1.5 text-[13px] font-semibold">Descrição (prompt-base)</h3>
              <p className="rounded-lg bg-surface-2 p-3 text-[12.5px] leading-relaxed">
                {base
                  ? diffWords(base.content.description, after.description).map((p, i) => (
                      <span key={i} className={cx(p.type === 'add' && 'rounded bg-ok-soft text-ok', p.type === 'del' && 'rounded bg-danger-soft text-danger line-through')}>
                        {p.text}
                      </span>
                    ))
                  : after.description}
              </p>
            </div>

            {rev.ai && (
              <div className="space-y-2">
                <h3 className="text-[13px] font-semibold">Instrução de alteração</h3>
                <p className="rounded-lg border border-accent/30 bg-accent-soft/40 p-3 text-[13px]">“{rev.ai.instruction}”</p>
                {restricted ? (
                  <p className="text-[12px] text-muted">O prompt estruturado usa documentos confidenciais e está disponível só para a equipe.</p>
                ) : (
                  <details className="group">
                    <summary className="cursor-pointer text-[12px] font-medium text-muted hover:text-fg">Ver prompt estruturado enviado ao modelo</summary>
                    <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-surface-2 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-fg-2">{rev.ai.structuredPrompt}</pre>
                  </details>
                )}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="flex flex-col gap-1.5">
              {can(role, 'edit') && !isHead && (
                <Button variant="primary" icon={<RotateCcw className="size-4" />} loading={busy} onClick={restore}>
                  Restaurar esta versão
                </Button>
              )}
              {!isHead && (
                <Button icon={<GitCompareArrows className="size-4" />} onClick={() => setAgainst('current')}>
                  Comparar com atual
                </Button>
              )}
              {can(role, 'edit') && frame && (
                <Button
                  icon={<Copy className="size-4" />}
                  onClick={async () => {
                    try {
                      await duplicateFrame(frame.id, userId, rev.snapshot, `Alternativa criada a partir de ${rev.short}`)
                      toast('Duplicado como quadro alternativo', { tone: 'ok' })
                      close()
                    } catch (e) {
                      toastError(e)
                    }
                  }}
                >
                  Duplicar como alternativa
                </Button>
              )}
              {frame && can(role, 'comment') && (
                <Button
                  variant="ghost"
                  icon={<MessageSquare className="size-4" />}
                  onClick={() => {
                    close()
                    ws.openPanel('comments', frame.id)
                  }}
                >
                  Comentar
                </Button>
              )}
              {!isHead && <p className="text-[11.5px] leading-snug text-muted">Restaurar cria uma nova versão; nada no histórico é apagado.</p>}
            </div>

            <div>
              <h3 className="mb-1.5 text-[12.5px] font-semibold">Metadados {base ? 'alterados' : ''}</h3>
              <dl className="space-y-1.5 text-[12px]">
                {(base ? changed : META_FIELDS.slice(0, 5)).map(([k, label]) => (
                  <div key={k} className="rounded-lg bg-surface-2 p-2">
                    <dt className="text-muted">{label}</dt>
                    <dd>
                      {base && <span className="text-danger line-through">{fmt(k, base.content[k])}</span>} <span className={cx(base && 'text-ok')}>{fmt(k, after[k])}</span>
                    </dd>
                  </div>
                ))}
                {base && !changed.length && <p className="text-muted">Nenhum metadado alterado.</p>}
              </dl>
            </div>

            {rev.ai && (
              <div className="space-y-2">
                <h3 className="text-[12.5px] font-semibold">Geração</h3>
                <p className="text-[12px] text-muted">
                  {rev.ai.provider} · <code className="font-mono">{rev.ai.model}</code>
                  {rev.ai.latencyMs ? ` · ${(rev.ai.latencyMs / 1000).toFixed(1)}s` : ''}
                  {rev.ai.region && ' · edição regional'}
                </p>
                {rev.ai.isDemo && <Badge tone="warn">gerado em modo demonstração (sem IA real)</Badge>}
                <h3 className="pt-2 text-[12.5px] font-semibold">Contexto utilizado</h3>
                <ContextRefs refs={refs} exception={rev.ai.exception} />
              </div>
            )}
          </aside>
        </div>
      </div>
    </Modal>
  )
}
