import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ReactFlow,
  useReactFlow,
  useViewport,
  type Edge,
  type Node,
  type NodeChange,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toastError } from '../../components/ui'
import { createNote, reorderFrames, updateNote } from '../../lib/repo'
import { useWD } from './context'
import { BriefingNode, type BriefingNodeType } from './nodes/BriefingNode'
import { NoteNode, type NoteNodeType } from './nodes/NoteNode'
import { SceneNode, type SceneNodeType } from './nodes/SceneNode'
import { DEFAULT_CARD_WIDTH, FORMAT_LABEL } from './scene'
import { useWS } from './store'

type CanvasNode = BriefingNodeType | SceneNodeType | NoteNodeType

const nodeTypes: NodeTypes = { briefing: BriefingNode, scene: SceneNode, note: NoteNode }

// Layout in canvas units, from the Paper design: the briefing sits above a row of scenes 28 apart.
const BRIEFING_AT = { x: 90, y: 162.5 }
const ROW_Y = 368
const ROW_GAP = 28
const NOTE_ID = 'note:'

/** Places the canvas origin where the Paper design shows it, at 80%. Offsets the panel's 16px inset, 72px header and 1px border. */
const DEFAULT_VIEWPORT = { x: -17, y: -73, zoom: 0.8 }

function useLayout() {
  const { project, ordered, revisions, briefing, notes, userId } = useWD()
  const { selectedId, widths } = useWS()

  return useMemo(() => {
    const byFrame = new Map<string, typeof revisions>()
    for (const r of revisions) byFrame.set(r.frameId, [...(byFrame.get(r.frameId) ?? []), r])

    const selectedIndex = ordered.findIndex((f) => f.id === selectedId)
    let x = BRIEFING_AT.x
    const scenes: SceneNodeType[] = ordered.map((frame, i) => {
      const width = widths[frame.id] ?? DEFAULT_CARD_WIDTH[frame.aspect ?? project.aspect]
      const node: SceneNodeType = {
        id: frame.id,
        type: 'scene',
        position: { x, y: ROW_Y },
        width,
        selected: frame.id === selectedId,
        data: {
          frame,
          number: i + 1,
          revisions: byFrame.get(frame.id) ?? [],
          projectAspect: project.aspect,
          width,
          selected: frame.id === selectedId,
          activeIn: selectedIndex >= 0 && (i === selectedIndex || i === selectedIndex + 1),
          activeOut: selectedIndex >= 0 && (i === selectedIndex || i === selectedIndex - 1),
          hasIn: true,
          hasOut: i < ordered.length - 1,
          userId,
        },
      }
      x += width + ROW_GAP
      return node
    })

    // The badge counts the scenes rewritten since the briefing's latest version was saved.
    const redone = briefing ? new Set(revisions.filter((r) => r.kind === 'briefing' && r.createdAt >= briefing.updatedAt).map((r) => r.frameId)).size : 0
    const seconds = ordered.reduce((sum, f) => sum + f.duration, 0)
    const brief: BriefingNodeType = {
      id: 'briefing',
      type: 'briefing',
      position: BRIEFING_AT,
      selectable: false,
      draggable: false,
      data: {
        projectId: project.id,
        userId,
        briefing,
        chips: [FORMAT_LABEL[project.aspect], `${seconds}s`, `${ordered.length} ${ordered.length === 1 ? 'cena' : 'cenas'}`],
        redone,
      },
    }

    const noteNodes: NoteNodeType[] = notes.map((note) => ({ id: NOTE_ID + note.id, type: 'note', position: { x: note.x, y: note.y }, selectable: false, data: { note, userId } }))

    const edges: Edge[] = ordered.slice(1).map((frame, i) => {
      const source = ordered[i].id
      const active = source === selectedId || frame.id === selectedId
      return { id: `${source}->${frame.id}`, source, target: frame.id, type: 'straight', focusable: false, style: { stroke: active ? '#0071E3' : '#D4D4D8', strokeWidth: 1.5 } }
    })

    return { nodes: [brief, ...scenes, ...noteNodes] as CanvasNode[], edges }
  }, [project, ordered, revisions, briefing, notes, userId, selectedId, widths])
}

/** The scene board: briefing on top, scenes in a row, sticky notes anywhere. */
export function SceneCanvas() {
  const { project, ordered, userId } = useWD()
  const layout = useLayout()
  const [nodes, setNodes] = useState<CanvasNode[]>(layout.nodes)

  // React Flow measures nodes into `measured`; keep that when the data behind them changes.
  useEffect(() => {
    setNodes((prev) => {
      const measured = new Map(prev.map((n) => [n.id, n.measured]))
      return layout.nodes.map((n) => ({ ...n, measured: measured.get(n.id) })) as CanvasNode[]
    })
  }, [layout.nodes])

  const onNodesChange = useCallback((changes: NodeChange<CanvasNode>[]) => {
    for (const c of changes)
      if (c.type === 'dimensions' && c.resizing && c.dimensions) useWS.getState().set({ widths: { ...useWS.getState().widths, [c.id]: Math.round(c.dimensions.width) } })
    setNodes((prev) => applyNodeChanges(changes, prev))
  }, [])

  const onNodeDragStop = useCallback(
    async (_: unknown, node: Node) => {
      try {
        if (node.id.startsWith(NOTE_ID)) {
          await updateNote(node.id.slice(NOTE_ID.length), userId, { x: node.position.x, y: node.position.y })
          return
        }
        if (node.type !== 'scene') return
        // A scene drops into the slot its centre landed on.
        const centre = (n: Node) => n.position.x + (n.width ?? n.measured?.width ?? 0) / 2
        const rest = layout.nodes.filter((n) => n.type === 'scene' && n.id !== node.id)
        const slot = rest.filter((n) => centre(n) < centre(node)).length
        const ids = rest.map((n) => n.id)
        ids.splice(slot, 0, node.id)
        if (ids.some((id, i) => id !== ordered[i]?.id)) await reorderFrames(project.id, userId, ids)
      } catch (e) {
        toastError(e)
      } finally {
        // Snap back into the row, whether or not the order changed.
        setNodes((prev) => prev.map((n) => (n.id === node.id ? { ...n, position: layout.nodes.find((l) => l.id === n.id)?.position ?? n.position } : n)))
      }
    },
    [layout.nodes, ordered, project.id, userId],
  )

  return (
    <ReactFlow<CanvasNode>
      nodes={nodes}
      edges={layout.edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onNodeDragStop={onNodeDragStop}
      onNodeClick={(_, n) => n.type === 'scene' && useWS.getState().set({ selectedId: n.id })}
      defaultViewport={DEFAULT_VIEWPORT}
      minZoom={0.3}
      maxZoom={2}
      panOnScroll
      zoomOnPinch
      selectionOnDrag={false}
      nodesConnectable={false}
      elementsSelectable
      deleteKeyCode={null}
      attributionPosition="bottom-right"
    >
      {/* 30 canvas units at 80% is the 24px grid of the design. */}
      <Background variant={BackgroundVariant.Dots} gap={30} size={1.25} color="rgba(0,0,0,0.1)" bgColor="#FAFAFA" />
    </ReactFlow>
  )
}

const FLOATING = 'flex h-11 items-center rounded-[22px] border border-[#E4E4E7] bg-white/92 shadow-[0_1px_2px_#0000000A,0_8px_24px_#0000000F] backdrop-blur-xl backdrop-saturate-[1.8]'

/** Zoom out, level, zoom in. */
export function ZoomControl() {
  const { zoomIn, zoomOut, zoomTo } = useReactFlow()
  const { zoom } = useViewport()
  return (
    <div className={`${FLOATING} gap-0.5 px-1`}>
      <button aria-label="Diminuir zoom" onClick={() => void zoomOut()} className="flex size-9 items-center justify-center rounded-[18px] hover:bg-black/5">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <path d="M3 7h8" fill="none" stroke="#1D1D1F" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <button onClick={() => void zoomTo(DEFAULT_VIEWPORT.zoom)} title="Voltar a 80%" className="w-11 text-center text-[13px] leading-4 font-medium text-black tabular-nums">
        {Math.round(zoom * 100)}%
      </button>
      <button aria-label="Aumentar zoom" onClick={() => void zoomIn()} className="flex size-9 items-center justify-center rounded-[18px] hover:bg-black/5">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <path d="M3 7h8M7 3v8" fill="none" stroke="#1D1D1F" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

/** Drops a new sticky note in the middle of what is on screen. */
export function AddNoteButton() {
  const { project, userId } = useWD()
  const { screenToFlowPosition } = useReactFlow()
  const add = async () => {
    try {
      const panel = document.querySelector('.react-flow')?.getBoundingClientRect()
      // A little scatter, so notes added in a row do not hide each other.
      const scatter = () => Math.round(Math.random() * 60 - 30)
      const at = panel ? screenToFlowPosition({ x: panel.left + panel.width / 2 - 84 + scatter(), y: panel.top + panel.height / 3 + scatter() }) : { x: 0, y: 0 }
      await createNote(project.id, userId, at)
    } catch (e) {
      toastError(e)
    }
  }
  return (
    <button onClick={() => void add()} className={`${FLOATING} gap-2 pr-4 pl-3 hover:bg-white`}>
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <path d="M3 4.5C3 3.67 3.67 3 4.5 3h9c.83 0 1.5.67 1.5 1.5V11l-4 4H4.5C3.67 15 3 14.33 3 13.5v-9z" fill="#FBE98C" stroke="#B45309" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M15 11h-2.5c-.83 0-1.5.67-1.5 1.5V15" fill="none" stroke="#B45309" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
      <span className="text-[14px] leading-[18px] font-medium text-[#18181B]">Nota</span>
    </button>
  )
}
