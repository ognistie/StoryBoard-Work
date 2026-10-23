import { create } from 'zustand'

export type InspectorTab = 'versions' | 'sheet'

interface WorkspaceUI {
  selectedId?: string
  inspectorTab: InspectorTab
  /** Revision shown on a scene card while browsing with ‹ ›. Unset means the current version. */
  browsing: Record<string, string>
  /** Card widths the user set by resizing, per scene. Unset means the default for its format. */
  widths: Record<string, number>
  set: (patch: Partial<Omit<WorkspaceUI, 'set' | 'reset'>>) => void
  reset: () => void
}

const initial = () => ({ selectedId: undefined, inspectorTab: 'versions' as InspectorTab, browsing: {}, widths: {} })

export const useWS = create<WorkspaceUI>((set) => ({
  ...initial(),
  set: (patch) => set(patch),
  reset: () => set(initial()),
}))
