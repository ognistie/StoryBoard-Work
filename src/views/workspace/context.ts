import { createContext, useContext } from 'react'
import type { Asset, Comment, Frame, GenerationJob, Project, Proposal, Role, Scene } from '../../lib/types'

export interface WorkspaceData {
  project: Project
  scenes: Scene[]
  frames: Frame[]
  /** frames in narrative order (scene, then order) */
  ordered: Frame[]
  assets: Asset[]
  comments: Comment[]
  jobs: GenerationJob[]
  proposals: Proposal[]
  role: Role
  userId: string
}

export const WorkspaceCtx = createContext<WorkspaceData | null>(null)

export function useWD(): WorkspaceData {
  const v = useContext(WorkspaceCtx)
  if (!v) throw new Error('WorkspaceCtx missing')
  return v
}

/** Frames in narrative order: scene order first, then frame order inside the scene. */
export function orderedFrames(frames: Frame[], scenes: Scene[]): Frame[] {
  const so = new Map(scenes.map((s) => [s.id, s.order]))
  return [...frames].sort((a, b) => (so.get(a.sceneId) ?? 999) - (so.get(b.sceneId) ?? 999) || a.order - b.order)
}

/** Index of a frame across the whole project (1-based, for display). */
export function frameNumber(ordered: Frame[], id: string) {
  return String(ordered.findIndex((f) => f.id === id) + 1).padStart(2, '0')
}

export function latestJob(jobs: GenerationJob[], frameId: string): GenerationJob | undefined {
  for (let i = jobs.length - 1; i >= 0; i--) if (jobs[i].frameId === frameId && jobs[i].decision === 'pending' && jobs[i].status !== 'canceled') return jobs[i]
  return undefined
}
