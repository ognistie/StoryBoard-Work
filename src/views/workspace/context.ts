import { createContext, useContext } from 'react'
import type { ContextDoc, Frame, Note, Project, Revision, Role, Scene } from '../../lib/types'

export interface WorkspaceData {
  project: Project
  scenes: Scene[]
  /** Frames in narrative order: scene order first, then order inside the scene. */
  ordered: Frame[]
  /** Every revision of the project, oldest first. */
  revisions: Revision[]
  briefing?: ContextDoc
  notes: Note[]
  role: Role
  userId: string
}

export const WorkspaceCtx = createContext<WorkspaceData | null>(null)

export function useWD(): WorkspaceData {
  const v = useContext(WorkspaceCtx)
  if (!v) throw new Error('WorkspaceCtx missing')
  return v
}

export function orderedFrames(frames: Frame[], scenes: Scene[]): Frame[] {
  const so = new Map(scenes.map((s) => [s.id, s.order]))
  return [...frames].sort((a, b) => (so.get(a.sceneId) ?? 999) - (so.get(b.sceneId) ?? 999) || a.order - b.order)
}
