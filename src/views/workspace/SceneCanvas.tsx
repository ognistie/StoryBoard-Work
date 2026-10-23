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
  type Viewport,
  type XYPosition,
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toastError } from '../../components/ui'
import { reorderFrames, updateNote } from '../../lib/repo'
import { useWD } from './context'
import { useAddNote } from './useAddNote'
import { BriefingNode, type BriefingNodeType } from './nodes/BriefingNode'
import { NoteNode, type NoteNodeType } from './nodes/NoteNode'
import { SceneNode, type SceneNodeType } from './nodes/SceneNode'
import { DEFAULT_CARD_WIDTH, FORMAT_LABEL } from './scene'
import { useWS } from './store'

type CanvasNode = BriefingNodeType | SceneNodeType | NoteNodeType

const nodeTypes: NodeTypes = { briefing: BriefingNode, scene: SceneNode, note: NoteNode }

// Layout in canvas units, from the Paper design: the briefing sits above a row of scenes 28 apart.
const BRIEFING_AT = { x: 90, y: 162.5 }
const ROW_X = 90
const ROW_Y = 368
const ROW_GAP = 28
const NOTE_ID = 'note:'
const BRIEFING_ID = 'briefing'

/** How long neighbours take to slide into a new slot, and the dropped scene to settle. */
const SLIDE_MS = 180
const easeOut = (t: number) => 1 - (1 - t) ** 3

// ---------------------------------------------------------------- default viewport per screen size

type Breakpoint = 'mobile' | 'tablet' | 'desktop'

/**
 * Zoom per screen size, and where the briefing lands inside the canvas panel, in screen pixels.
 * From the Paper artboards "02 — Canvas" (80%), "· Tablet" (55%) and "· Mobile" (50%).
 */
const VIEW: Record<Breakpoint, { zoom: number; briefing: XYPosition; grid: number }> = {
  desktop: { zoom: 0.8, briefing: { x: 55, y: 57 }, grid: 24 },
  tablet: { zoom: 0.55, briefing: { x: 43.5, y: 26 }, grid: 24 },
  mobile: { zoom: 0.5, briefing: { x: 16, y: 70.25 }, grid: 15 },
}

function breakpointOf(width: number): Breakpoint {
  return width < 768 ? 'mobile' : width < 1280 ? 'tablet' : 'desktop'
}

function defaultViewport(bp: Breakpoint): Viewport {
  const { zoom, briefing } = VIEW[bp]
  return { zoom, x: briefing.x - BRIEFING_AT.x * zoom, y: briefing.y - BRIEFING_AT.y * zoom }
}

/** A viewport the user panned or zoomed to, per project. Survives the canvas remounting when the layout changes size. */
const movedViewports = new Map<string, Viewport>()

function isDefault(v: Viewport, bp: Breakpoint) {
  const d = defaultViewport(bp)
  return Math.abs(v.x - d.x) < 1 && Math.abs(v.y - d.y) < 1 && Math.abs(v.zoom - d.zoom) < 0.001
}

/** Renders nothing; keeps `movedViewports` current while the canvas is mounted. */
// Any size's default counts as untouched: when the layout switches size, the old canvas briefly sees the new size.
function ViewportMemory({ projectId }: { projectId: string }) {
  const v = useViewport()
  useEffect(() => {
    if ((Object.keys(VIEW) as Breakpoint[]).some((bp) => isDefault(v, bp))) movedViewports.delete(projectId)
    else movedViewports.set(projectId, v)
  }, [v, projectId])
  return null
}

function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState(() => breakpointOf(window.innerWidth))
  useEffect(() => {
    const on = () => setBp(breakpointOf(window.innerWidth))
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return bp
}

// ---------------------------------------------------------------- briefing position

/** The briefing moves freely; its spot is kept per project in this browser. */
function useBriefingPosition(projectId: string) {
  const key = `decupa.canvas.briefing.${projectId}`
  const [at, setAt] = useState<XYPosition>(() => {
    const saved = localStorage.getItem(key)
    return saved ? (JSON.parse(saved) as XYPosition) : BRIEFING_AT
  })
  const save = useCallback(
    (p: XYPosition) => {
      setAt(p)
      localStorage.setItem(key, JSON.stringify(p))
    },
    [key],
  )
  return [at, save] as const
}

// ---------------------------------------------------------------- layout

/** A scene being dragged, and the slot in the row it would take if dropped now. */
interface SceneDrag {
  id: string
  slot: number
  /** Dropped and waiting for the new order to come back from the database. */
  dropped: boolean
}

function useLayout(briefingAt: XYPosition, drag: SceneDrag | undefined) {
  const { project, ordered, revisions, briefing, notes, userId } = useWD()
  const { selectedId, widths } = useWS()

  return useMemo(() => {
    const byFrame = new Map<string, typeof revisions>()
    for (const r of revisions) byFrame.set(r.frameId, [...(byFrame.get(r.frameId) ?? []), r])

    // While a scene is dragged, the row is laid out as if it were already in its new slot.
    const row = [...ordered]
    if (drag) {
      const from = row.findIndex((f) => f.id === drag.id)
      if (from >= 0) row.splice(drag.slot, 0, ...row.splice(from, 1))
    }

    const selectedIndex = ordered.findIndex((f) => f.id === selectedId)
    let x = ROW_X
    const slotX = new Map<string, number>()
    for (const frame of row) {
      slotX.set(frame.id, x)
      x += (widths[frame.id] ?? DEFAULT_CARD_WIDTH[frame.aspect ?? project.aspect]) + ROW_GAP
    }

    const scenes: SceneNodeType[] = ordered.map((frame, i) => {
      const width = widths[frame.id] ?? DEFAULT_CARD_WIDTH[frame.aspect ?? project.aspect]
      return {
        id: frame.id,
        type: 'scene',
        position: { x: slotX.get(frame.id) ?? ROW_X, y: ROW_Y },
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
    })

    // The badge counts the scenes rewritten since the briefing's latest version was saved.
    const redone = briefing ? new Set(revisions.filter((r) => r.kind === 'briefing' && r.createdAt >= briefing.updatedAt).map((r) => r.frameId)).size : 0
    const seconds = ordered.reduce((sum, f) => sum + f.duration, 0)
    const brief: BriefingNodeType = {
      id: BRIEFING_ID,
      type: 'briefing',
      position: briefingAt,
      selectable: false,
      data: {
        projectId: project.id,
        userId,
        briefing,
        chips: [FORMAT_LABEL[project.aspect], `${seconds}s`, `${ordered.length} ${ordered.length === 1 ? 'cena' : 'cenas'}`],
        redone,
      },
    }

    const noteNodes: NoteNodeType[] = notes.map((note) => ({ id: NOTE_ID + note.id, type: 'note', position: { x: note.x, y: note.y }, selectable: false, data: { note, userId } }))

    const link = { stroke: '#D4D4D8', strokeWidth: 1.5 }
    const edges: Edge[] = ordered.slice(1).map((frame, i) => {
      const source = ordered[i].id
      const active = source === selectedId || frame.id === selectedId
      return { id: `${source}->${frame.id}`, source, target: frame.id, sourceHandle: 'out', targetHandle: 'in', type: 'straight', focusable: false, style: { ...link, stroke: active ? '#0071E3' : link.stroke } }
    })
    if (ordered[0])
      edges.unshift({ id: 'briefing->row', source: BRIEFING_ID, target: ordered[0].id, targetHandle: 'brief', type: 'straight', focusable: false, style: { ...link, strokeDasharray: '3 4', strokeLinecap: 'round' } })

    return { nodes: [brief, ...scenes, ...noteNodes] as CanvasNode[], edges }
  }, [project, ordered, revisions, briefing, notes, userId, selectedId, widths, briefingAt, drag])
}

/** The slot a scene would take: the number of other scenes whose centre lies left of its centre. */
function slotFor(node: Node, scenes: Node[]) {
  const centre = (n: Node) => n.position.x + (n.width ?? n.measured?.width ?? 0) / 2
  return scenes.filter((n) => n.id !== node.id && centre(n) < centre(node)).length
}

// ---------------------------------------------------------------- canvas

/** The scene board: briefing on top, scenes in a row, sticky notes anywhere. */
export function SceneCanvas() {
  const { project, ordered, userId } = useWD()
  const bp = useBreakpoint()
  const [briefingAt, setBriefingAt] = useBriefingPosition(project.id)
  const [drag, setDrag] = useState<SceneDrag>()
  const layout = useLayout(briefingAt, drag)
  const [nodes, setNodes] = useState<CanvasNode[]>(layout.nodes)

  useEffect(() => {
    const clear = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))
      if (e.key === 'Escape' && !typing) useWS.getState().set({ selectedId: undefined })
    }
    document.addEventListener('keydown', clear)
    return () => document.removeEventListener('keydown', clear)
  }, [])

  // The node under the pointer or being resized follows React Flow, never the layout.
  const held = useRef<string>(undefined)
  // Where notes were dropped, until the database echoes the new position back.
  const droppedNotes = useRef(new Map<string, XYPosition>())
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes
  const frame = useRef(0)

  // A dropped scene waits in its new slot until the new order arrives.
  useEffect(() => {
    setDrag((d) => (d?.dropped ? undefined : d))
  }, [ordered])

  // Move every node to its place in the layout. Nodes glide there, so a reorder reads as motion, not a jump.
  useEffect(() => {
    const from = new Map(nodesRef.current.map((n) => [n.id, n]))
    const target = (n: CanvasNode): XYPosition => {
      const dropped = droppedNotes.current.get(n.id)
      if (!dropped) return n.position
      if (dropped.x === n.position.x && dropped.y === n.position.y) droppedNotes.current.delete(n.id)
      return dropped
    }
    const next = layout.nodes.map((n) => ({ ...n, position: target(n), measured: from.get(n.id)?.measured }))
    const glides = next.filter((n) => {
      const p = from.get(n.id)?.position
      return n.id !== held.current && p && (p.x !== n.position.x || p.y !== n.position.y)
    })

    cancelAnimationFrame(frame.current)
    const place = (k: number) =>
      setNodes((prev) => {
        const live = new Map(prev.map((n) => [n.id, n]))
        return next.map((n) => {
          const now = live.get(n.id)
          if (n.id === held.current && now) return { ...n, position: now.position, dragging: now.dragging }
          const start = from.get(n.id)?.position
          if (k >= 1 || !start) return n
          return { ...n, position: { x: start.x + (n.position.x - start.x) * k, y: start.y + (n.position.y - start.y) * k } }
        }) as CanvasNode[]
      })
    if (!glides.length) {
      place(1)
      return
    }
    const t0 = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / SLIDE_MS)
      place(easeOut(t))
      if (t < 1) frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
  }, [layout.nodes])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const onNodesChange = useCallback((changes: NodeChange<CanvasNode>[]) => {
    for (const c of changes)
      if (c.type === 'dimensions' && c.dimensions) {
        held.current = c.resizing ? c.id : held.current === c.id ? undefined : held.current
        if (c.resizing) useWS.getState().set({ widths: { ...useWS.getState().widths, [c.id]: Math.round(c.dimensions.width) } })
      }
    setNodes((prev) => applyNodeChanges(changes, prev))
  }, [])

  const sceneNodes = () => nodesRef.current.filter((n) => n.type === 'scene')

  const onNodeDragStart = useCallback((_: unknown, node: Node) => {
    held.current = node.id
  }, [])

  const onNodeDrag = useCallback((_: unknown, node: Node) => {
    if (node.type !== 'scene') return
    const slot = slotFor(node, sceneNodes())
    setDrag((d) => (d && d.slot === slot ? d : { id: node.id, slot, dropped: false }))
  }, [])

  const onNodeDragStop = useCallback(
    async (_: unknown, node: Node) => {
      held.current = undefined
      try {
        if (node.id === BRIEFING_ID) {
          setBriefingAt(node.position)
          return
        }
        if (node.id.startsWith(NOTE_ID)) {
          droppedNotes.current.set(node.id, node.position)
          await updateNote(node.id.slice(NOTE_ID.length), userId, { x: node.position.x, y: node.position.y })
          return
        }
        if (node.type !== 'scene') return
        const ids = ordered.map((f) => f.id).filter((id) => id !== node.id)
        ids.splice(slotFor(node, sceneNodes()), 0, node.id)
        const changed = ids.some((id, i) => id !== ordered[i]?.id)
        // The scene glides into its slot now; the row keeps that order until the database confirms it.
        setDrag(changed ? { id: node.id, slot: ids.indexOf(node.id), dropped: true } : undefined)
        if (changed) await reorderFrames(project.id, userId, ids)
      } catch (e) {
        setDrag(undefined)
        toastError(e)
      }
    },
    [ordered, project.id, userId, setBriefingAt],
  )

  // Refit the board when the screen size changes, unless the user has panned or zoomed away from the default.
  const { getViewport, setViewport } = useReactFlow()
  const lastBp = useRef(bp)
  useEffect(() => {
    if (bp !== lastBp.current && isDefault(getViewport(), lastBp.current)) void setViewport(defaultViewport(bp), { duration: 200 })
    lastBp.current = bp
  }, [bp, getViewport, setViewport])


  const grid = VIEW[bp].grid / VIEW[bp].zoom

  return (
    <ReactFlow<CanvasNode>
      nodes={nodes}
      edges={layout.edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onNodeDragStart={onNodeDragStart}
      onNodeDrag={onNodeDrag}
      onNodeDragStop={onNodeDragStop}
      onNodeClick={(_, n) => n.type === 'scene' && useWS.getState().set({ selectedId: n.id })}
      onPaneClick={() => useWS.getState().set({ selectedId: undefined })}
      defaultViewport={movedViewports.get(project.id) ?? defaultViewport(bp)}
      minZoom={0.3}
      maxZoom={2}
      panOnScroll
      zoomOnPinch
      // Double-click writes on a note; it must not also zoom.
      zoomOnDoubleClick={false}
      selectionOnDrag={false}
      nodesConnectable={false}
      elementsSelectable
      deleteKeyCode={null}
      // @xyflow/react is MIT licensed; hiding the credit is allowed.
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={grid} size={1.25} color="rgba(0,0,0,0.1)" bgColor="#FAFAFA" />
      <ViewportMemory projectId={project.id} />
    </ReactFlow>
  )
}

const FLOATING = 'flex h-11 items-center rounded-[22px] border border-[#E4E4E7] bg-white/92 shadow-[0_1px_2px_#0000000A,0_8px_24px_#0000000F] backdrop-blur-xl backdrop-saturate-[1.8]'

/** Zoom out, level, zoom in. Clicking the level returns to the default for this screen size. */
export function ZoomControl() {
  const { zoomIn, zoomOut, zoomTo } = useReactFlow()
  const { zoom } = useViewport()
  const home = VIEW[useBreakpoint()].zoom
  return (
    <div className={`${FLOATING} gap-0.5 px-1`}>
      <button aria-label="Diminuir zoom" onClick={() => void zoomOut()} className="flex size-9 items-center justify-center rounded-[18px] hover:bg-black/5">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <path d="M3 7h8" fill="none" stroke="#1D1D1F" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <button onClick={() => void zoomTo(home)} title={`Voltar a ${Math.round(home * 100)}%`} className="w-11 text-center text-[13px] leading-4 font-medium text-black tabular-nums">
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
  const add = useAddNote()
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
