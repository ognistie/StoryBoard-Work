import Dexie, { type EntityTable } from 'dexie'
import type {
  Approval,
  Asset,
  Comment,
  ContextDoc,
  ContextDocVersion,
  Frame,
  GenerationJob,
  Note,
  Project,
  ProjectEvent,
  Proposal,
  Revision,
  Scene,
  ShareLink,
  Snapshot,
  StoredImage,
} from './types'

/**
 * Browser-local database. Dexie propagates mutations across tabs of the same
 * origin, so two windows (e.g. "Produtora" and "Cliente") see each other's
 * changes in real time without a server.
 */
export class StoryboardDB extends Dexie {
  projects!: EntityTable<Project, 'id'>
  scenes!: EntityTable<Scene, 'id'>
  frames!: EntityTable<Frame, 'id'>
  revisions!: EntityTable<Revision, 'id'>
  images!: EntityTable<StoredImage, 'id'>
  jobs!: EntityTable<GenerationJob, 'id'>
  proposals!: EntityTable<Proposal, 'id'>
  approvals!: EntityTable<Approval, 'id'>
  comments!: EntityTable<Comment, 'id'>
  docs!: EntityTable<ContextDoc, 'id'>
  docVersions!: EntityTable<ContextDocVersion, 'id'>
  assets!: EntityTable<Asset, 'id'>
  events!: EntityTable<ProjectEvent, 'id'>
  shareLinks!: EntityTable<ShareLink, 'id'>
  snapshots!: EntityTable<Snapshot, 'id'>
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
  }
}

export const db = new StoryboardDB()
