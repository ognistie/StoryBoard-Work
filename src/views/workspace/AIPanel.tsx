import { AlertTriangle, BookOpen, Check, ChevronDown, Info, RotateCcw, ScanLine, Send, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CompareSlider } from '../../components/CompareSlider'
import { FrameImage } from '../../components/FrameImage'
import { Avatar, Badge, Button, cx, Empty, Input, Textarea, toast, toastError, Toggle } from '../../components/ui'
import { getProvider } from '../../lib/ai'
import { detectConflicts, mentionedCharacters, type ContextIssue } from '../../lib/context'
import { cancelJob, isJobActive, retryJob, startEditBatch } from '../../lib/jobs'
import { acceptCandidate, decideProposal, discardCandidate, StaleRevisionError, updateFrame } from '../../lib/repo'
import { can, userById } from '../../lib/session'
import { useSettings } from '../../lib/settings'
import { db } from '../../lib/db'
import type { ContextDoc, Frame, GenerationJob, Proposal, Region } from '../../lib/types'
import { useLiveQuery } from 'dexie-react-hooks'
import { notify } from './actions'
import { frameNumber, useWD } from './context'
import { RegionPicker } from './RegionPicker'
import { useWS } from './store'

const SUGGESTIONS = [
  'Adicionar mais uma pessoa à direita, mantendo o restante',
  'Mudar a luz para pôr do sol',
  'Abrir o plano para mostrar mais do cenário',
  'Close no rosto do personagem',
  'Adicionar um cachorro em primeiro plano',
  'Remover a pessoa da esquerda',
]

export function AIPanel() {
  const { project, ordered, assets, jobs, proposals, role, userId, scenes } = useWD()
  const ws = useWS()
  const providerId = useSettings((s) => s.provider)
  const provider = useMemo(() => getProvider(), [providerId])
  const selected = ordered.filter((f) => ws.selection.includes(f.id))
  const [instruction, setInstruction] = useState('')
  const [keep, setKeep] = useState(true)
  const [region, setRegion] = useState<Region>()
  const [regionMode, setRegionMode] = useState(false)
  const [exception, setException] = useState('')
  const [override, setOverride] = useState(false)
  const [busy, setBusy] = useState(false)
  const docs = useLiveQuery(() => db.docs.where('projectId').equals(project.id).toArray(), [project.id]) ?? []
  const visibleDocs: ContextDoc[] = can(role, 'docs') ? docs : docs.filter((d) => !d.confidential)
  const characters = assets.filter((a) => a.type === 'character')

  useEffect(() => {
    if (ws.aiPrefill) {
      setInstruction(ws.aiPrefill)
      ws.set({ aiPrefill: undefined })
    }
  }, [ws.aiPrefill]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setRegion(undefined)
    setRegionMode(false)
  }, [ws.selection.join()])

  // conflict detection runs per frame, debounced
  const [issues, setIssues] = useState<{ frame: Frame; issues: ContextIssue[] }[]>([])
  useEffect(() => {
    const t = setTimeout(() => {
      if (!instruction.trim() || !keep) return setIssues([])
      setIssues(
        selected
          .map((f) => ({ frame: f, issues: detectConflicts({ instruction, frame: f, scene: scenes.find((s) => s.id === f.sceneId), assets, docs: visibleDocs }) }))
          .filter((x) => x.issues.length),
      )
    }, 300)
    return () => clearTimeout(t)
  }, [instruction, keep, ws.selection.join(), docs.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasConflict = issues.some((x) => x.issues.some((i) => i.level === 'conflict'))
  const mentions = mentionedCharacters(instruction, assets)
  const myJobs = jobs.filter((j) => j.createdBy === userId && j.decision === 'pending' && j.status !== 'canceled').reverse()
  const openProposals = proposals.filter((p) => p.status === 'open')

  const generate = async () => {
    if (!instruction.trim() || !selected.length) return
    if (hasConflict && !override) return toast('Confirme a exceção ao roteiro antes de gerar.', { tone: 'danger' })
    setBusy(true)
    try {
      await startEditBatch({
        projectId: project.id,
        frameIds: selected.map((f) => f.id),
        instruction: instruction.trim(),
        region: selected.length === 1 ? region : undefined,
        keepConsistency: keep,
        exception: hasConflict && override ? exception.trim() || 'Decisão criativa confirmada pelo usuário' : undefined,
        actorId: userId,
      })
      setInstruction('')
      setOverride(false)
      setException('')
      setRegionMode(false)
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5 p-4">
      {can(role, 'decide') && openProposals.length > 0 && <ProposalList proposals={openProposals} />}

      <div className={cx('flex items-start gap-2 rounded-lg px-2.5 py-2 text-[12px] leading-snug', provider.isDemo ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok')}>
        <Info className="mt-0.5 size-3.5 shrink-0" />
        {provider.isDemo ? (
          <span>
            <b>Modo demonstração:</b> imagens desenhadas localmente, sem IA real. Escolha a OpenAI em Configurações para reescrever os quadros com IA.
          </span>
        ) : (
          <span>
            <b>{provider.label}</b> · {provider.model}. O texto do quadro e trechos do projeto vão para a OpenAI. O desenho é feito localmente.
          </span>
        )}
      </div>

      {!can(role, 'ai') ? (
        <Empty title="Somente leitura">Seu papel neste projeto não permite solicitar alterações.</Empty>
      ) : !selected.length ? (
        <Empty icon={<Sparkles />} title="Selecione quadros para editar">
          Clique em um quadro (ou Shift/Ctrl+clique para vários) e descreva a alteração em poucas palavras.
        </Empty>
      ) : (
        <section className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold">
                {selected.length === 1 ? 'Editar quadro' : `Editar ${selected.length} quadros`}
              </h3>
              {selected.length === 1 && selected[0].imageId && provider.capabilities.maskedRegion !== 'none' && (
                <button onClick={() => setRegionMode((m) => !m)} className={cx('flex items-center gap-1 text-[12px] font-medium', regionMode || region ? 'text-accent' : 'text-muted hover:text-fg')}>
                  <ScanLine className="size-3.5" />
                  {region ? 'Área marcada' : 'Marcar área'}
                </button>
              )}
            </div>
            {regionMode && selected.length === 1 ? (
              <div className="mt-2 space-y-1.5">
                <RegionPicker imageId={selected[0].imageId} value={region} onChange={setRegion} />
                <p className="text-[11.5px] text-muted">
                  Só a área marcada deve mudar.{' '}
                  {provider.capabilities.maskedRegion === 'guided' && 'Este provedor não aceita máscara real: a área é enviada como guia visual e textual.'}
                  {region && (
                    <button className="ml-1 text-accent hover:underline" onClick={() => setRegion(undefined)}>
                      limpar
                    </button>
                  )}
                </p>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {selected.slice(0, 6).map((f) => (
                  <BasePrompt key={f.id} frame={f} number={frameNumber(ordered, f.id)} editable={can(role, 'edit')} compact={selected.length > 1} />
                ))}
                {selected.length > 6 && <p className="text-[11.5px] text-muted">+ {selected.length - 6} quadros</p>}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="ai-change" className="text-[12px] font-medium text-fg-2">
              O que você quer alterar {selected.length > 1 ? 'nestes quadros' : 'nesta imagem'}?
            </label>
            <Textarea
              id="ai-change"
              rows={3}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Ex.: Adicionar mais uma pessoa à direita, mantendo o restante."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void generate()
              }}
            />
            <div className="flex flex-wrap gap-1.5">
              {(instruction ? [] : SUGGESTIONS).map((s) => (
                <button key={s} onClick={() => setInstruction(s)} className="rounded-full border border-line px-2.5 py-1 text-[11.5px] text-fg-2 transition-colors hover:border-accent hover:text-accent">
                  {s}
                </button>
              ))}
            </div>
            {characters.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11.5px] text-muted">Personagens do projeto:</span>
                {characters.map((c) => {
                  const on = mentions.some((m) => m.id === c.id)
                  return (
                    <button
                      key={c.id}
                      title={c.description}
                      onClick={() => setInstruction((t) => (on ? t : t ? `${t.replace(/\s+$/, '')} ${c.name}` : `Adicionar ${c.name} `))}
                      className={cx('rounded-full px-2 py-0.5 text-[11.5px] font-medium transition-colors', on ? 'bg-accent text-white' : 'bg-surface-2 text-fg-2 hover:bg-surface-3')}
                    >
                      {on && <Check className="mr-0.5 inline size-3" />}
                      {c.name}
                    </button>
                  )
                })}
              </div>
            )}
            {mentions.length > 0 && <p className="text-[11.5px] text-muted">A IA usará a ficha e a referência visual de {mentions.map((m) => m.name).join(', ')}.</p>}
          </div>

          <Toggle checked={keep} onChange={setKeep} label="Manter consistência com o roteiro" description="Usa roteiro, personagens e regras do projeto para a imagem não fugir da história." />

          {issues.length > 0 && (
            <div className="space-y-2">
              {groupIssues(issues).map(({ issue: i, frames: fs }) => (
                <div
                  key={i.level + i.message}
                  className={cx(
                    'flex gap-2 rounded-lg p-2.5 text-[12px] leading-snug',
                    i.level === 'conflict' ? 'bg-danger-soft text-danger' : i.level === 'warning' ? 'bg-warn-soft text-warn' : 'bg-info-soft text-info',
                  )}
                >
                  {i.level === 'info' ? <Info className="mt-0.5 size-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />}
                  <span>
                    {selected.length > 1 && <b>{fs.length > 1 ? 'Quadros' : 'Quadro'} {fs.map((f) => frameNumber(ordered, f.id)).join(', ')}: </b>}
                    {i.message}
                    {i.source && <span className="opacity-70"> — {i.source}</span>}
                  </span>
                </div>
              ))}
              {hasConflict && (
                <div className="space-y-2 rounded-lg border border-line p-2.5">
                  <label className="flex items-center gap-2 text-[12.5px] font-medium">
                    <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="accent-[var(--accent)]" />
                    Sim, propor esta mudança como exceção ao roteiro
                  </label>
                  {override && <Input value={exception} onChange={(e) => setException(e.target.value)} placeholder="Justificativa (fica registrada no histórico)" />}
                </div>
              )}
            </div>
          )}

          <Button variant="primary" size="lg" className="w-full" icon={<Sparkles className="size-4" />} loading={busy} disabled={!instruction.trim() || (hasConflict && !override)} onClick={generate}>
            Gerar prévia{selected.length > 1 ? ` (${selected.length})` : ''}
          </Button>
          <p className="-mt-2 text-center text-[11.5px] text-muted">
            A imagem atual não muda até você aceitar{role === 'client' ? ' e a produtora aprovar' : ''}. Ctrl+Enter para gerar.
          </p>
        </section>
      )}

      {myJobs.length > 0 && (
        <section className="space-y-3 border-t border-line pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold">Resultados da IA</h3>
            <BulkAccept jobs={myJobs.filter((j) => j.status === 'ready' && !j.stale)} />
          </div>
          {myJobs.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </section>
      )}
    </div>
  )
}

function groupIssues(list: { frame: Frame; issues: ContextIssue[] }[]) {
  const map = new Map<string, { issue: ContextIssue; frames: Frame[] }>()
  for (const { frame, issues } of list)
    for (const i of issues) {
      const k = i.level + i.message
      const g = map.get(k) ?? { issue: i, frames: [] }
      g.frames.push(frame)
      map.set(k, g)
    }
  const rank = { conflict: 0, warning: 1, info: 2 }
  return [...map.values()].sort((a, b) => rank[a.issue.level] - rank[b.issue.level])
}

function BasePrompt({ frame, number, editable, compact }: { frame: Frame; number: string; editable: boolean; compact: boolean }) {
  const { userId } = useWD()
  const [value, setValue] = useState(frame.description)
  useEffect(() => setValue(frame.description), [frame.description])
  if (compact)
    return (
      <div className="flex gap-2.5 rounded-lg bg-surface-2 p-2">
        <FrameImage imageId={frame.imageId} alt="" className="w-20 shrink-0 rounded-md" />
        <div className="min-w-0">
          <div className="truncate text-[12px] font-medium">
            <span className="font-mono text-muted">{number}</span> {frame.title}
          </div>
          <p className="line-clamp-2 text-[11.5px] text-muted">{frame.description || 'Sem descrição'}</p>
        </div>
      </div>
    )
  return (
    <div className="space-y-1.5">
      <FrameImage imageId={frame.imageId} alt={frame.title} className="rounded-lg border border-line" />
      <div className="flex items-center justify-between text-[12px] font-medium text-fg-2">
        Prompt-base do quadro
        <span className="font-normal text-muted">descrição usada pela IA</span>
      </div>
      {editable ? (
        <Textarea
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => value !== frame.description && updateFrame(frame.id, userId, { description: value }).catch(toastError)}
          className="bg-surface-2/60 text-[12.5px]"
        />
      ) : (
        <p className="rounded-lg bg-surface-2 p-2.5 text-[12.5px] leading-relaxed text-fg-2">{frame.description}</p>
      )}
    </div>
  )
}

const STEPS: [GenerationJob['status'], string][] = [
  ['preparing', 'Preparando'],
  ['generating', 'Gerando prévia'],
  ['refining', 'Refinando'],
  ['ready', 'Pronto'],
]

function JobCard({ job }: { job: GenerationJob }) {
  const { frames, ordered, role, userId, project } = useWD()
  const frame = frames.find((f) => f.id === job.frameId)
  const [busy, setBusy] = useState(false)
  const [showCtx, setShowCtx] = useState(false)
  if (!frame) return null
  const active = isJobActive(job)
  const stepIdx = STEPS.findIndex(([s]) => s === job.status)
  const isClient = role === 'client'

  const accept = async (force = false) => {
    setBusy(true)
    try {
      const res = await acceptCandidate(job.id, userId, { force })
      if (res === 'proposed') {
        toast('Proposta enviada para aprovação da produtora', { tone: 'ok' })
        notify(project.id, userId, `propôs uma alteração em “${frame.title}”`, frame.id)
      } else toast(`Nova versão registrada em “${frame.title}”`, { tone: 'ok' })
    } catch (e) {
      if (e instanceof StaleRevisionError) {
        if (confirm(`${e.message}\n\nAplicar este resultado mesmo assim? Ele será registrado sobre a versão mais recente (nada é perdido no histórico).`)) {
          setBusy(false)
          return accept(true)
        }
      } else toastError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="pop-in overflow-hidden rounded-xl border border-line bg-surface">
      <header className="flex items-center gap-2 px-3 pt-2.5 pb-2">
        <span className="font-mono text-[11px] text-muted">{frameNumber(ordered, frame.id)}</span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{frame.title}</span>
        {job.status === 'ready' && job.totalMs !== undefined && (
          <span className="text-[11px] text-muted" title="Latência medida: solicitação → prévia / resultado final">
            {job.firstPreviewMs ? `prévia ${(job.firstPreviewMs / 1000).toFixed(1)}s · ` : ''}
            {(job.totalMs / 1000).toFixed(1)}s
          </span>
        )}
      </header>
      <p className="px-3 pb-2 text-[12px] text-fg-2">“{job.instruction}”</p>

      {active && (
        <div className="space-y-2 px-3 pb-3">
          <div className="relative overflow-hidden rounded-lg">
            <FrameImage imageId={job.previewImageId ?? frame.imageId} alt="Prévia" className={cx(!job.previewImageId && 'opacity-60')} />
            <div className="shimmer absolute inset-0" />
          </div>
          <ol className="flex gap-1">
            {STEPS.map(([s, label], i) => (
              <li key={s} className="flex-1">
                <div className={cx('h-1 rounded-full', i < stepIdx ? 'bg-accent' : i === stepIdx ? 'animate-pulse bg-accent/60' : 'bg-surface-3')} />
                <span className={cx('mt-1 block text-[10.5px]', i <= stepIdx ? 'text-fg-2' : 'text-muted')}>{label}</span>
              </li>
            ))}
          </ol>
          <div className="flex justify-between text-[11.5px] text-muted">
            <span>{job.status === 'queued' ? 'Na fila…' : 'Você pode continuar trabalhando.'}</span>
            <button className="font-medium hover:text-danger" onClick={() => cancelJob(job.id)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {job.status === 'ready' && (
        <div className="space-y-2.5 px-3 pb-3">
          <CompareSlider beforeId={frame.imageId} afterId={job.candidateImageId} showModes={false} />
          {job.stale && (
            <div className="flex gap-2 rounded-lg bg-warn-soft p-2 text-[11.5px] text-warn">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> O quadro recebeu outra versão depois deste pedido. Revise antes de aceitar.
            </div>
          )}
          {job.error && (
            <div className="flex gap-2 rounded-lg bg-info-soft p-2 text-[11.5px] text-info">
              <Info className="mt-0.5 size-3.5 shrink-0" /> {job.error}
            </div>
          )}
          {job.newDescription && job.newDescription !== frame.description && (
            <p className="rounded-lg bg-surface-2 p-2 text-[11.5px] leading-snug text-fg-2">
              <span className="font-medium text-muted">Nova descrição: </span>
              {job.newDescription}
            </p>
          )}
          {job.ai && (
            <button onClick={() => setShowCtx((s) => !s)} className="flex items-center gap-1 text-[11.5px] font-medium text-muted hover:text-fg">
              <BookOpen className="size-3.5" />
              Contexto utilizado pela IA ({job.ai.contextRefs.length})
              <ChevronDown className={cx('size-3 transition-transform', showCtx && 'rotate-180')} />
            </button>
          )}
          {showCtx && job.ai && <ContextRefs refs={job.ai.contextRefs} exception={job.ai.exception} />}
          <div className="flex gap-1.5">
            <Button size="sm" accent className="flex-1" loading={busy} icon={isClient ? <Send className="size-3.5" /> : <Check className="size-3.5" />} onClick={() => accept()}>
              {isClient ? 'Enviar proposta' : 'Aceitar'}
            </Button>
            <Button size="sm" icon={<RotateCcw className="size-3.5" />} onClick={() => retryJob(job.id).catch(toastError)}>
              Refazer
            </Button>
            <Button size="sm" variant="ghost" icon={<X className="size-3.5" />} onClick={() => discardCandidate(job.id)}>
              Descartar
            </Button>
          </div>
        </div>
      )}

      {job.status === 'error' && (
        <div className="space-y-2 px-3 pb-3">
          <div className="flex gap-2 rounded-lg bg-danger-soft p-2.5 text-[12px] text-danger">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {job.error ?? 'Falha na geração.'} <span className="opacity-75">A imagem original foi preservada.</span>
            </span>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" icon={<RotateCcw className="size-3.5" />} onClick={() => retryJob(job.id).catch(toastError)}>
              Tentar novamente
            </Button>
            <Button size="sm" variant="ghost" onClick={() => discardCandidate(job.id)}>
              Descartar
            </Button>
          </div>
        </div>
      )}
    </article>
  )
}

export function ContextRefs({ refs, exception }: { refs: { docTitle: string; docVersion: number; section: string; excerpt: string }[]; exception?: string }) {
  return (
    <div className="space-y-1.5">
      {exception && <div className="rounded-lg bg-warn-soft p-2 text-[11.5px] text-warn">Exceção autorizada: {exception}</div>}
      {refs.length ? (
        refs.map((r, i) => (
          <blockquote key={i} className="rounded-lg border-l-2 border-accent bg-surface-2 p-2 text-[11.5px] leading-snug">
            <div className="mb-0.5 font-medium text-fg-2">
              {r.docTitle} <span className="text-muted">v{r.docVersion} · {r.section}</span>
            </div>
            <span className="text-muted">{r.excerpt}</span>
          </blockquote>
        ))
      ) : (
        <p className="text-[11.5px] text-muted">Nenhum trecho de documento foi necessário.</p>
      )}
    </div>
  )
}

function BulkAccept({ jobs }: { jobs: GenerationJob[] }) {
  const { userId, role, project } = useWD()
  if (jobs.length < 2) return null
  return (
    <Button
      size="sm"
      variant="subtle"
      onClick={async () => {
        let n = 0
        for (const j of jobs) {
          try {
            await acceptCandidate(j.id, userId)
            n++
          } catch (e) {
            toastError(e)
          }
        }
        toast(role === 'client' ? `${n} propostas enviadas` : `${n} versões registradas`, { tone: 'ok' })
        if (role === 'client') notify(project.id, userId, `propôs alterações em ${n} quadros`)
      }}
    >
      {role === 'client' ? 'Enviar todas' : 'Aceitar todos'} ({jobs.length})
    </Button>
  )
}

function ProposalList({ proposals }: { proposals: Proposal[] }) {
  const { frames, ordered, userId, project } = useWD()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const decide = async (p: Proposal, accept: boolean) => {
    try {
      await decideProposal(p.id, userId, accept, notes[p.id])
      toast(accept ? 'Proposta aceita: nova versão registrada' : 'Proposta recusada', { tone: accept ? 'ok' : 'neutral' })
      notify(project.id, userId, `${accept ? 'aceitou' : 'recusou'} a proposta em “${frames.find((f) => f.id === p.frameId)?.title}”`, p.frameId)
    } catch (e) {
      toastError(e)
    }
  }
  return (
    <section className="space-y-3 rounded-xl border border-accent/30 bg-accent-soft/40 p-3">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold">
        <span className="flex size-5 items-center justify-center rounded-full bg-accent text-[11px] text-white">{proposals.length}</span>
        Propostas aguardando sua decisão
      </h3>
      {proposals.map((p) => {
        const f = frames.find((x) => x.id === p.frameId)
        if (!f) return null
        return (
          <article key={p.id} className="space-y-2 rounded-lg bg-surface p-2.5 shadow-sm">
            <div className="flex items-center gap-2">
              <Avatar userId={p.authorId} size={20} />
              <span className="min-w-0 flex-1 truncate text-[12px]">
                <b>{userById(p.authorId).name.split(' ')[0]}</b> · Quadro {frameNumber(ordered, f.id)}
              </span>
              {f.headRevisionId !== p.baseRevisionId && <Badge tone="warn">quadro mudou</Badge>}
            </div>
            <p className="text-[12px] text-fg-2">“{p.instruction}”</p>
            <CompareSlider beforeId={f.imageId} afterId={p.candidateImageId} beforeLabel="Atual" afterLabel="Proposta" showModes={false} />
            <Input placeholder="Comentário opcional" value={notes[p.id] ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [p.id]: e.target.value }))} />
            <div className="flex gap-1.5">
              <Button size="sm" accent className="flex-1" icon={<Check className="size-3.5" />} onClick={() => decide(p, true)}>
                Aceitar como nova versão
              </Button>
              <Button size="sm" onClick={() => decide(p, false)}>
                Recusar
              </Button>
            </div>
          </article>
        )
      })}
    </section>
  )
}
