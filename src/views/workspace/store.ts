import { create } from 'zustand'
import type { FrameStatus } from '../../lib/types'

export type PanelTab = 'ai' | 'details' | 'comments' | 'context' | 'history'
export type TopTab = 'storyboard' | 'script' | 'context' | 'assets' | 'history' | 'team'

interface WorkspaceUI {
  tab: TopTab
  selection: string[]
  focusId?: string
  anchorId?: string
  panel: PanelTab
  rightOpen: boolean
  leftOpen: boolean
  view: 'grid' | 'strip'
  zoom: number // card min width in px
  statusFilter: FrameStatus | 'all'
  viewerId?: string
  compareId?: string // frame id whose latest candidate/previous version to compare
  diffRevisionId?: string
  presenting: boolean
  shareOpen: boolean
  pinMode: boolean
  showCamera: boolean
  aiPrefill?: string
  set: (patch: Partial<WorkspaceUI>) => void
  select: (id: string, mode: 'single' | 'toggle' | 'range', ordered?: string[]) => void
  openPanel: (panel: PanelTab, frameId?: string) => void
  reset: () => void
}

const wide = (min: number) => typeof window === 'undefined' || window.innerWidth >= min

const initial = () => ({
  tab: 'storyboard' as TopTab,
  selection: [] as string[],
  focusId: undefined,
  anchorId: undefined,
  panel: 'details' as PanelTab,
  rightOpen: wide(1024),
  leftOpen: wide(1280),
  view: 'grid' as const,
  zoom: 300,
  statusFilter: 'all' as const,
  viewerId: undefined,
  compareId: undefined,
  diffRevisionId: undefined,
  presenting: false,
  shareOpen: false,
  pinMode: false,
  showCamera: true,
  aiPrefill: undefined,
})

export const useWS = create<WorkspaceUI>((set, get) => ({
  ...initial(),
  set: (patch) => set(patch),
  select: (id, mode, ordered = []) => {
    const { selection, anchorId } = get()
    if (mode === 'toggle') {
      const next = selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id]
      set({ selection: next, focusId: next.includes(id) ? id : next.at(-1), anchorId: id })
    } else if (mode === 'range' && anchorId && ordered.length) {
      const a = ordered.indexOf(anchorId)
      const b = ordered.indexOf(id)
      const [lo, hi] = a < b ? [a, b] : [b, a]
      set({ selection: ordered.slice(lo, hi + 1), focusId: id })
    } else {
      set({ selection: [id], focusId: id, anchorId: id })
    }
  },
  openPanel: (panel, frameId) => {
    const s = get()
    const patch: Partial<WorkspaceUI> = { panel, rightOpen: true }
    if (frameId && !s.selection.includes(frameId)) Object.assign(patch, { selection: [frameId], focusId: frameId, anchorId: frameId })
    else if (frameId) patch.focusId = frameId
    set(patch)
  },
  reset: () => set(initial()),
}))
