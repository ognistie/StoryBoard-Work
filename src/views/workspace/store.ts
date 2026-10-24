import { create } from 'zustand'

export type InspectorTab = 'versions' | 'sheet'

/** What the right-hand panel shows: the selected scene, the project chat, or the project folder. */
export type SidePanel = 'scene' | 'chat' | 'files'

interface WorkspaceUI {
  selectedId?: string
  inspectorTab: InspectorTab
  panel: SidePanel
  /** Revision shown on a scene card while browsing with ‹ ›. Unset means the current version. */
  browsing: Record<string, string>
  /** Card widths the user set by resizing, per scene. Unset means the default for its format. */
  widths: Record<string, number>
  set: (patch: Partial<Omit<WorkspaceUI, 'set' | 'reset'>>) => void
  reset: () => void
}

const initial = () => ({ selectedId: undefined, inspectorTab: 'versions' as InspectorTab, panel: 'scene' as SidePanel, browsing: {}, widths: {} })

export const useWS = create<WorkspaceUI>((set) => ({
  ...initial(),
  set: (patch) => set(patch),
  reset: () => set(initial()),
}))
