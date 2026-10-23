import { closestCenter, DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, Plus } from 'lucide-react'
import { useState } from 'react'
import { FrameImage } from '../../components/FrameImage'
import { cx, IconButton, STATUS_META, toastError } from '../../components/ui'
import { createScene, reorderFrames } from '../../lib/repo'
import { can } from '../../lib/session'
import type { Frame, FrameStatus } from '../../lib/types'
import { addFrame } from './actions'
import { frameNumber, useWD } from './context'
import { useWS } from './store'

const FILTERS: { value: FrameStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'review', label: 'Revisão' },
  { value: 'changes', label: 'Ajustes' },
  { value: 'approved', label: 'Aprovados' },
]

export function Sidebar() {
  const { project, scenes, ordered, role, userId } = useWD()
  const ws = useWS()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const editable = can(role, 'edit')
  const visible = ws.statusFilter === 'all' ? ordered : ordered.filter((f) => f.status === ws.statusFilter)
  const counts = Object.fromEntries(FILTERS.map((f) => [f.value, f.value === 'all' ? ordered.length : ordered.filter((x) => x.status === f.value).length]))

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const all = ordered.map((f) => f.id)
    const next = arrayMove(all, all.indexOf(String(e.active.id)), all.indexOf(String(e.over.id)))
    const target = ordered.find((f) => f.id === e.over!.id)!
    const moved = ordered.find((f) => f.id === e.active.id)!
    try {
      await reorderFrames(project.id, userId, next, moved.sceneId !== target.sceneId ? { frameId: moved.id, sceneId: target.sceneId } : undefined)
    } catch (err) {
      toastError(err)
    }
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-surface" aria-label="Estrutura narrativa">
      <div className="border-b border-line p-3">
        <div className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">Filtrar por status</div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => ws.set({ statusFilter: f.value })}
              className={cx(
                'h-6 rounded-md px-2 text-[11.5px] font-medium transition-colors',
                ws.statusFilter === f.value ? 'bg-fg text-bg' : 'bg-surface-2 text-fg-2 hover:bg-surface-3',
              )}
            >
              {f.label} <span className="opacity-60">{counts[f.value]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={visible.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            {scenes.map((s) => {
              const frames = visible.filter((f) => f.sceneId === s.id)
              if (!frames.length && ws.statusFilter !== 'all') return null
              const open = !collapsed[s.id]
              return (
                <div key={s.id} className="mb-1">
                  <div className="group flex items-center gap-1 rounded-lg px-1.5 py-1 hover:bg-surface-2">
                    <button className="flex min-w-0 flex-1 items-center gap-1.5 text-left" onClick={() => setCollapsed((c) => ({ ...c, [s.id]: open }))} aria-expanded={open}>
                      <ChevronDown className={cx('size-3.5 shrink-0 text-muted transition-transform', !open && '-rotate-90')} />
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-semibold">
                          {s.number}. {s.heading}
                        </span>
                        {s.sequence && <span className="block truncate text-[11px] text-muted">{s.sequence}</span>}
                      </span>
                    </button>
                    {editable && (
                      <IconButton size="sm" label="Adicionar quadro na cena" className="opacity-0 group-hover:opacity-100" onClick={() => addFrame(project.id, s.id, userId, frames.at(-1)?.order)}>
                        <Plus className="size-3.5" />
                      </IconButton>
                    )}
                  </div>
                  {open && (
                    <ul className="mt-0.5 space-y-0.5 pl-2">
                      {frames.map((f) => (
                        <Row key={f.id} frame={f} number={frameNumber(ordered, f.id)} selected={ws.selection.includes(f.id)} disabled={!editable} ids={visible.map((x) => x.id)} />
                      ))}
                      {!frames.length && <li className="px-2 py-1.5 text-[11.5px] text-muted">Sem quadros</li>}
                    </ul>
                  )}
                </div>
              )
            })}
          </SortableContext>
        </DndContext>
      </div>
      {editable && (
        <div className="border-t border-line p-2">
          <button
            onClick={async () => {
              try {
                const id = await createScene(project.id, userId, { heading: `NOVA CENA`, sequence: '' })
                await addFrame(project.id, id, userId)
              } catch (e) {
                toastError(e)
              }
            }}
            className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[12.5px] text-muted hover:bg-surface-2 hover:text-fg"
          >
            <Plus className="size-3.5" /> Nova cena
          </button>
        </div>
      )}
    </aside>
  )
}

function Row({ frame, number, selected, disabled, ids }: { frame: Frame; number: string; selected: boolean; disabled: boolean; ids: string[] }) {
  const ws = useWS()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: frame.id, disabled })
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cx(isDragging && 'relative z-10 opacity-70')}>
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => {
          ws.select(frame.id, e.shiftKey ? 'range' : e.metaKey || e.ctrlKey ? 'toggle' : 'single', ids)
          document.querySelector(`[data-frame-id="${frame.id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        }}
        onDoubleClick={() => ws.set({ viewerId: frame.id })}
        className={cx('flex w-full items-center gap-2 rounded-lg p-1 text-left transition-colors', selected ? 'bg-accent-soft' : 'hover:bg-surface-2')}
      >
        <FrameImage imageId={frame.imageId} alt="" className="w-16 shrink-0 rounded-md border border-line" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="font-mono text-[10.5px] text-muted">{number}</span>
            <span className={cx('size-1.5 rounded-full', STATUS_META[frame.status].dot)} />
          </span>
          <span className={cx('block truncate text-[12px] font-medium', selected && 'text-accent')}>{frame.title}</span>
        </span>
      </button>
    </li>
  )
}
