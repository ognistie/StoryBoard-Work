import Dexie, { type EntityTable } from 'dexie'
import type {
  Approval,
  Asset,
  ChatMessage,
  Comment,
  ContextDoc,
  ContextDocVersion,
  FileVersion,
  Frame,
  Note,
  Project,
  ProjectEvent,
  ProjectFile,
  Revision,
  Scene,
  StoredBlob,
  StoredImage,
} from './types'

/** What the last sync with the server agreed on, per record: `${table}:${id}` and a hash of its content. */
export interface SyncState {
  key: string
  projectId: string
  hash: string
}

/** Per shared project: the last server sequence number pulled. */
export interface SyncCursor {
  projectId: string
  seq: number
}

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
  messages!: EntityTable<ChatMessage, 'id'>
  files!: EntityTable<ProjectFile, 'id'>
  fileVersions!: EntityTable<FileVersion, 'id'>
  blobs!: EntityTable<StoredBlob, 'id'>
  syncState!: EntityTable<SyncState, 'key'>
  syncCursors!: EntityTable<SyncCursor, 'projectId'>

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
    // Collaboration: project chat, the file folder, and what was last synced with the server.
    this.version(4).stores({
      messages: 'id, projectId, createdAt',
      files: 'id, projectId',
      fileVersions: 'id, projectId, fileId',
      blobs: 'id',
      syncState: 'key, projectId',
      syncCursors: 'projectId',
    })
  }
}

export const db = new StoryboardDB()
