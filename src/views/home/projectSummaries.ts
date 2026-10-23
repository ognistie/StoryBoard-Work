import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db'
import { roleIn } from '../../lib/session'
import type { Project } from '../../lib/types'

/** What the home screen shows for a project: its first drawings and its runtime. */
export interface ProjectSummary {
  project: Project
  imageIds: string[]
  sceneCount: number
  seconds: number
}

/** The user's projects, most recently updated first. */
export function useProjectSummaries(userId: string): ProjectSummary[] | undefined {
  return useLiveQuery(async () => {
    const projects = (await db.projects.orderBy('updatedAt').reverse().toArray()).filter((p) => roleIn(p, userId))
    return Promise.all(
      projects.map(async (project) => {
        const frames = await db.frames.where('projectId').equals(project.id).sortBy('order')
        return {
          project,
          imageIds: frames.flatMap((f) => (f.imageId ? [f.imageId] : [])),
          sceneCount: frames.length,
          seconds: frames.reduce((sum, f) => sum + f.duration, 0),
        }
      }),
    )
  }, [userId])
}
