import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CheckCircle2, Keyboard, LayoutGrid, PanelLeft, PanelRight, Plus, Rows3, Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button, cx, IconButton, Kbd, Modal, Segmented, toast, toastError } from '../../components/ui'
import { useHotkeys } from '../../lib/hooks'
import { isJobActive } from '../../lib/jobs'
import { reorderFrames, reviewFrame } from '../../lib/repo'
import { can } from '../../lib/session'
import { addFrame, removeFrame } from './actions'
import { frameNumber, latestJob, useWD } from './context'
import { FrameCard } from './FrameCard'
import { useWS } from './store'

const TIME_LABEL = { day: 'Dia', night: 'Noite', sunset: 'Pôr do sol', unknown: '' }

export function Canvas() {
  const { project, scenes, ordered, jobs, comments, proposals, role, userId } = useWD()
  const ws = useWS()
  const [help, setHelp] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  const visible = ws.statusFilter === 'all' ? ordered : ordered.filter((f) => f.status === ws.statusFilter)
  const ids = visible.map((f) => f.id)
  const commentCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of comments) if (!c.resolved) m.set(c.frameId, (m.get(c.frameId) ?? 0) + 1)
    return m
  }, [comments])
  const openProposals = new Set(proposals.filter((p) => p.status === 'open').map((p) => p.frameId))
  const myJobs = jobs.filter((j) => j.createdBy === userId && j.decision === 'pending' && j.status !== 'canceled')
  const activeJobs = myJobs.filter(isJobActive)
  const readyJobs = myJobs.filter((j) => j.status === 'ready')

  const onSelect = (id: string) => (e: React.MouseEvent) => {
    ws.select(id, e.shiftKey ? 'range' : e.metaKey || e.ctrlKey ? 'toggle' : 'single', ids)
  }

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const all = ordered.map((f) => f.id)
    const from = all.indexOf(String(e.active.id))
    const to = all.indexOf(String(e.over.id))
    const next = arrayMove(all, from, to)
    const target = ordered.find((f) => f.id === e.over!.id)!
    const moved = ordered.find((f) => f.id === e.active.id)!
    try {
      await reorderFrames(project.id, userId, next, moved.sceneId !== target.sceneId ? { frameId: moved.id, sceneId: target.sceneId } : undefined)
    } catch (err) {
      toastError(err)
    }
  }

  useHotkeys(
    (e) => {
      if (ws.viewerId || ws.presenting || ws.diffRevisionId) return
      const i = ids.indexOf(ws.focusId ?? '')
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        const n = ids[Math.max(0, Math.min(ids.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)))]
        if (n) ws.select(n, e.shiftKey ? 'range' : 'single', ids)
      } else if ((e.key === 'a' || e.key === 'A') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        ws.set({ selection: ids, focusId: ids.at(-1) })
      } else if (e.key === 'Escape') ws.set({ selection: [], focusId: undefined })
      else if (e.key === 'Enter' && ws.focusId) ws.set({ viewerId: ws.focusId })
      else if ((e.key === 'e' || e.key === 'E') && ws.selection.length && can(role, 'ai')) ws.openPanel('ai')
      else if ((e.key === 'c' || e.key === 'C') && ws.focusId && !e.ctrlKey && !e.metaKey) ws.openPanel('comments')
      else if (e.key === 'p' || e.key === 'P') ws.set({ presenting: true })
      else if (e.key === '?') setHelp(true)
      else if (e.key === 'Delete' && ws.focusId && can(role, 'edit')) {
        const f = ordered.find((x) => x.id === ws.focusId)
        if (f) void removeFrame(f, userId)
      }
    },
    [ids, ws.focusId, ws.selection, ws.viewerId, ws.presenting, ws.diffRevisionId, role],
  )

  const approveSelection = async () => {
    try {
      for (const id of ws.selection) await reviewFrame(id, userId, 'approved')
      toast(`${ws.selection.length} ${ws.selection.length === 1 ? 'quadro aprovado' : 'quadros aprovados'}`, { tone: 'ok' })
    } catch (e) {
      toastError(e)
    }
  }

  const sections = scenes
    .map((s) => ({ scene: s, frames: visible.filter((f) => f.sceneId === s.id) }))
    .filter((s) => s.frames.length || ws.statusFilter === 'all')

  return (
    <main className="relative flex min-w-0 flex-1 flex-col bg-bg">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface/60 px-3 backdrop-blur">
        <IconButton label={ws.leftOpen ? 'Ocultar estrutura' : 'Mostrar estrutura'} onClick={() => ws.set({ leftOpen: !ws.leftOpen })} active={ws.leftOpen}>
          <PanelLeft className="size-4" />
        </IconButton>
        {ws.selection.length > 1 ? (
          <div className="pop-in flex items-center gap-2 rounded-lg bg-accent-soft py-1 pr-1 pl-3">
            <span className="text-[12.5px] font-semibold text-accent">{ws.selection.length} selecionados</span>
            {can(role, 'ai') && (
              <Button size="sm" accent icon={<Sparkles className="size-3.5" />} onClick={() => ws.openPanel('ai')}>
                Editar com IA
              </Button>
            )}
            {can(role, 'approve') && (
              <Button size="sm" icon={<CheckCircle2 className="size-3.5" />} onClick={approveSelection}>
                Aprovar
              </Button>
            )}
            <IconButton size="sm" label="Limpar seleção (Esc)" onClick={() => ws.set({ selection: [] })}>
              <X className="size-3.5" />
            </IconButton>
          </div>
        ) : (
          <div className="truncate text-[12.5px] text-muted">
            <b className="font-semibold text-fg">{ordered.length} quadros</b> · {ordered.reduce((s, f) => s + f.duration, 0)}s · {scenes.length} cenas
            <span className="ml-2 hidden xl:inline">— Shift/Ctrl+clique para selecionar vários</span>
          </div>
        )}
        <div className="flex-1" />
        {can(role, 'decide') && openProposals.size > 0 && (
          <Button size="sm" variant="subtle" className="text-accent" onClick={() => ws.openPanel('ai')}>
            <span className="flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">{openProposals.size}</span>
            {openProposals.size === 1 ? 'proposta do cliente' : 'propostas do cliente'}
          </Button>
        )}
        <Segmented
          size="sm"
          value={ws.view}
          onChange={(v) => ws.set({ view: v })}
          options={[
            { value: 'grid', label: <LayoutGrid className="size-3.5" />, title: 'Grade' },
            { value: 'strip', label: <Rows3 className="size-3.5" />, title: 'Sequência horizontal' },
          ]}
        />
        {ws.view === 'grid' && (
          <input
            type="range"
            min={200}
            max={520}
            step={20}
            value={ws.zoom}
            onChange={(e) => ws.set({ zoom: Number(e.target.value) })}
            aria-label="Zoom dos quadros"
            className="hidden w-24 accent-[var(--accent)] md:block"
          />
        )}
        <IconButton label="Atalhos de teclado (?)" onClick={() => setHelp(true)} className="hidden md:inline-flex">
          <Keyboard className="size-4" />
        </IconButton>
        {can(role, 'edit') && scenes[0] && (
          <Button
            size="sm"
            icon={<Plus className="size-3.5" />}
            onClick={() => {
              const f = ordered.find((x) => x.id === ws.focusId)
              void addFrame(project.id, f?.sceneId ?? scenes.at(-1)!.id, userId, f?.order)
            }}
          >
            Quadro
          </Button>
        )}
        <IconButton label={ws.rightOpen ? 'Ocultar painel' : 'Mostrar painel'} onClick={() => ws.set({ rightOpen: !ws.rightOpen })} active={ws.rightOpen}>
          <PanelRight className="size-4" />
        </IconButton>
      </div>

      <div
        className="min-h-0 flex-1 overflow-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) ws.set({ selection: [], focusId: undefined })
        }}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            {ws.view === 'grid' ? (
              <div className="space-y-8 p-5 pb-28">
                {sections.map(({ scene, frames }) => (
                  <section key={scene.id} aria-label={scene.heading}>
                    <div className="mb-3 flex items-baseline gap-3">
                      <span className="font-mono text-[11px] font-medium text-muted">CENA {String(scene.number).padStart(2, '0')}</span>
                      <h2 className="text-[13.5px] font-semibold tracking-tight">{scene.heading}</h2>
                      {TIME_LABEL[scene.timeOfDay] && <span className="text-[12px] text-muted">{TIME_LABEL[scene.timeOfDay]}</span>}
                      <span className="text-[12px] text-muted">· {frames.length} quadros</span>
                      {scene.sequence && <span className="ml-auto hidden text-[12px] text-muted md:block">{scene.sequence}</span>}
                    </div>
                    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${ws.zoom}px, 1fr))` }}>
                      {frames.map((f) => (
                        <FrameCard
                          key={f.id}
                          frame={f}
                          number={frameNumber(ordered, f.id)}
                          selected={ws.selection.includes(f.id)}
                          job={latestJob(jobs, f.id)}
                          comments={commentCount.get(f.id) ?? 0}
                          proposal={openProposals.has(f.id)}
                          onSelect={onSelect(f.id)}
                        />
                      ))}
                      {can(role, 'edit') && ws.statusFilter === 'all' && (
                        <button
                          onClick={() => addFrame(project.id, scene.id, userId, frames.at(-1)?.order)}
                          className="flex aspect-video items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong text-[12.5px] text-muted transition-colors hover:border-accent hover:text-accent"
                        >
                          <Plus className="size-4" /> Adicionar quadro
                        </button>
                      )}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto p-5 pb-28">
                {visible.map((f, i) => {
                  const sceneStart = i === 0 || visible[i - 1].sceneId !== f.sceneId
                  const scene = scenes.find((s) => s.id === f.sceneId)
                  return (
                    <div key={f.id} className={cx('flex flex-col gap-2', sceneStart && i > 0 && 'border-l border-line pl-4')}>
                      <div className="h-4 font-mono text-[11px] text-muted">{sceneStart && scene ? `CENA ${scene.number} · ${scene.heading}` : ''}</div>
                      <FrameCard
                        strip
                        frame={f}
                        number={frameNumber(ordered, f.id)}
                        selected={ws.selection.includes(f.id)}
                        job={latestJob(jobs, f.id)}
                        comments={commentCount.get(f.id) ?? 0}
                        proposal={openProposals.has(f.id)}
                        onSelect={onSelect(f.id)}
                      />
                      {f.dialogue && <p className="line-clamp-3 w-[340px] text-[12px] whitespace-pre-line text-fg-2 italic">{f.dialogue}</p>}
                    </div>
                  )
                })}
              </div>
            )}
          </SortableContext>
        </DndContext>
      </div>

      {(activeJobs.length > 0 || readyJobs.length > 0) && !(ws.rightOpen && ws.panel === 'ai') && (
        <div className="slide-up pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
          <button
            onClick={() => ws.openPanel('ai')}
            className="pointer-events-auto flex items-center gap-3 rounded-full bg-fg py-2 pr-2 pl-4 text-[13px] text-bg shadow-lg transition-transform hover:scale-[1.02]"
          >
            <Sparkles className={cx('size-4', activeJobs.length > 0 && 'animate-pulse')} />
            {activeJobs.length > 0 ? (
              <span>
                IA trabalhando em {activeJobs.length} {activeJobs.length === 1 ? 'quadro' : 'quadros'}
                {readyJobs.length > 0 && ` · ${readyJobs.length} prontos`}
                <span className="ml-1 opacity-60">— continue trabalhando</span>
              </span>
            ) : (
              <span>
                {readyJobs.length} {readyJobs.length === 1 ? 'prévia pronta' : 'prévias prontas'} para revisar
              </span>
            )}
            <span className="rounded-full bg-accent px-3 py-1 text-[12px] font-semibold text-white">Revisar</span>
          </button>
        </div>
      )}

      <Modal open={help} onClose={() => setHelp(false)} title="Atalhos de teclado" width={420}>
        <ul className="space-y-2 text-[13px]">
          {(
            [
              [['←', '→'], 'Navegar entre quadros'],
              [['Shift', '←/→'], 'Estender seleção'],
              [['Ctrl', 'A'], 'Selecionar todos'],
              [['Enter'], 'Ampliar quadro'],
              [['E'], 'Editar seleção com IA'],
              [['C'], 'Comentar'],
              [['P'], 'Modo apresentação'],
              [['Del'], 'Excluir quadro'],
              [['Esc'], 'Limpar seleção / fechar'],
            ] as [string[], string][]
          ).map(([keys, label]) => (
            <li key={label} className="flex items-center justify-between">
              <span className="text-fg-2">{label}</span>
              <span className="flex gap-1">
                {keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Modal>
    </main>
  )
}
