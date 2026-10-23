import Dexie, { type EntityTable } from 'dexie'
import type {
  Approval,
  Asset,
  Comment,
  ContextDoc,
  ContextDocVersion,
  Frame,
  Note,
  Project,
  ProjectEvent,
  Revision,
  Scene,
  StoredImage,
} from './types'

/**
 * Browser-local database. Dexie propagates mutations across tabs of the same
 * origin, so open tabs see each other's changes without a server.
 */
class StoryboardDB extends Dexie {
  projects!: EntityTable<Project, 'id'>
  scenes!: EntityTable<Scene, 'id'>
  frames!: EntityTable<Frame, 'id'>
  revisions!: EntityTable<Revision, 'id'>
  images!: EntityTable<StoredImage, 'id'>
  approvals!: EntityTable<Approval, 'id'>
  comments!: EntityTable<Comment, 'id'>
  docs!: EntityTable<ContextDoc, 'id'>
  docVersions!: EntityTable<ContextDocVersion, 'id'>
  assets!: EntityTable<Asset, 'id'>
  events!: EntityTable<ProjectEvent, 'id'>
  notes!: EntityTable<Note, 'id'>

  constructor(name = 'frameline') {
    super(name)
    this.version(1).stores({
      projects: 'id, updatedAt, status',
      scenes: 'id, projectId, order',
      frames: 'id, projectId, sceneId, order',
      revisions: 'id, frameId, projectId, createdAt',
      images: 'id',
      jobs: 'id, projectId, frameId, batchId, status, createdAt',
      proposals: 'id, projectId, frameId, status',
      approvals: 'id, frameId, projectId, revisionId',
      comments: 'id, projectId, frameId, createdAt',
      docs: 'id, projectId',
      docVersions: 'id, docId',
      assets: 'id, projectId',
      events: 'id, projectId, createdAt',
      shareLinks: 'id, projectId, &token',
      snapshots: 'id, projectId',
    })
    this.version(2).stores({ notes: 'id, projectId' })
    // Image-editing jobs, client proposals, share links and snapshots left the app.
    this.version(3).stores({ jobs: null, proposals: null, shareLinks: null, snapshots: null })
  }
}

export const db = new StoryboardDB()
