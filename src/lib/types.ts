// Domain model. Everything is persisted in the browser (IndexedDB via Dexie).

export type Role = 'admin' | 'producer' | 'editor' | 'client' | 'viewer'

export interface User {
  id: string
  name: string
  title: string
  org: string
  color: string
}

export interface ProjectMember {
  userId: string
  role: Role
}

export type ProjectStatus = 'pre' | 'review' | 'approved' | 'archived'

export type ArtStyle = 'pencil' | 'sketch' | 'concept' | 'cinematic' | 'custom'

export interface Project {
  id: string
  name: string
  client: string
  producer: string
  ownerId: string
  status: ProjectStatus
  style: ArtStyle
  styleNotes: string
  members: ProjectMember[]
  coverImageId?: string
  aspect: '16:9' | '2.39:1' | '9:16' | '1:1'
  createdAt: number
  updatedAt: number
}

export interface Scene {
  id: string
  projectId: string
  number: number
  heading: string // e.g. "EXT. CASA NOVA — DIA"
  sequence: string
  summary: string
  timeOfDay: TimeOfDay
  characters: string[] // character asset names present in the script for this scene
  scriptExcerpt: string
  order: number
}

export type TimeOfDay = 'day' | 'night' | 'sunset' | 'unknown'

export type FrameStatus = 'draft' | 'review' | 'changes' | 'approved'

export type ShotType =
  | 'geral'
  | 'aberto'
  | 'medio'
  | 'americano'
  | 'close'
  | 'extreme-close'
  | 'detalhe'
  | 'pov'
  | 'ots'

export type CameraMove = 'estatico' | 'pan' | 'tilt' | 'dolly' | 'tracking' | 'truck' | 'zoom' | 'handheld' | 'crane'

export interface Annotation {
  id: string
  kind: 'arrow' | 'note'
  x1: number
  y1: number
  x2: number
  y2: number
  label?: string
  color: string
}

/** Parameters for the local demo renderer (procedural pencil sketch). */
export interface SketchSpec {
  setting: 'house' | 'living' | 'kitchen' | 'street' | 'garden' | 'office' | 'car' | 'empty'
  time: TimeOfDay
  shot: ShotType
  people: SketchPerson[]
  props: string[]
  weather?: 'rain' | 'none'
  seed: number
}

export interface SketchPerson {
  x: number // 0..1 horizontal position
  name?: string
  kind: 'adult' | 'child'
  pose: 'stand' | 'walk' | 'sit' | 'wave'
  facing: 'left' | 'right'
}

/** Editable content of a frame. A revision stores an immutable copy of this. */
export interface FrameContent {
  title: string
  description: string // "prompt-base": short, objective description of the shot
  action: string
  dialogue: string
  shot: ShotType
  angle: string
  movement: CameraMove
  composition: string
  duration: number // seconds
  characters: string[]
  location: string
  lighting: string
  notes: string
  imageId?: string
  sketch?: SketchSpec
  annotations: Annotation[]
}

export interface Frame extends FrameContent {
  id: string
  projectId: string
  sceneId: string
  order: number
  status: FrameStatus
  headRevisionId?: string
  approvedRevisionId?: string
  dirty: boolean // working copy differs from head revision
  contextOutdated?: boolean // script changed after this frame was versioned
  updatedAt: number
  updatedBy: string
}

export type RevisionKind = 'initial' | 'ai-edit' | 'ai-generate' | 'manual' | 'restore' | 'upload' | 'proposal'

export interface ContextRef {
  docId: string
  docTitle: string
  docVersion: number
  section: string
  excerpt: string
  score: number
}

export interface AIRecord {
  instruction: string
  basePrompt: string
  structuredPrompt: string
  provider: string
  model: string
  isDemo: boolean
  contextRefs: ContextRef[]
  region?: Region
  exception?: string // justification when the user overrode a script conflict
  latencyMs?: number
}

export interface Revision {
  id: string
  short: string
  projectId: string
  frameId: string
  parentId?: string
  number: number
  authorId: string
  createdAt: number
  message: string
  kind: RevisionKind
  snapshot: FrameContent
  ai?: AIRecord
  restoredFrom?: string
  proposalId?: string
}

export interface StoredImage {
  id: string
  blob: Blob
  width: number
  height: number
  createdAt: number
}

export interface Region {
  x: number
  y: number
  w: number
  h: number
}

export type JobStatus = 'queued' | 'preparing' | 'generating' | 'refining' | 'ready' | 'error' | 'canceled'
export type JobDecision = 'pending' | 'accepted' | 'proposed' | 'discarded'

export interface GenerationJob {
  id: string
  projectId: string
  frameId: string
  batchId: string
  kind: 'edit' | 'generate'
  baseRevisionId?: string
  instruction: string
  region?: Region
  keepConsistency: boolean
  exception?: string
  status: JobStatus
  decision: JobDecision
  previewImageId?: string
  candidateImageId?: string
  candidateSketch?: SketchSpec
  newDescription?: string
  ai?: AIRecord
  error?: string
  stale?: boolean
  createdBy: string
  createdAt: number
  firstPreviewMs?: number
  totalMs?: number
}

export interface Proposal {
  id: string
  projectId: string
  frameId: string
  jobId: string
  baseRevisionId?: string
  candidateImageId: string
  candidateSketch?: SketchSpec
  newDescription: string
  instruction: string
  ai?: AIRecord
  authorId: string
  status: 'open' | 'accepted' | 'rejected'
  decidedBy?: string
  decidedAt?: number
  note?: string
  createdAt: number
}

export interface Approval {
  id: string
  projectId: string
  frameId: string
  revisionId: string
  userId: string
  decision: 'approved' | 'changes'
  comment?: string
  createdAt: number
}

export interface Comment {
  id: string
  projectId: string
  frameId: string
  revisionId?: string
  authorId: string
  text: string
  pin?: { x: number; y: number }
  parentId?: string
  resolved: boolean
  createdAt: number
}

export type DocKind = 'script' | 'brief' | 'treatment' | 'bible' | 'art' | 'tech' | 'other'

export interface DocChunk {
  id: string
  section: string
  text: string
}

export interface ContextDoc {
  id: string
  projectId: string
  kind: DocKind
  title: string
  fileName?: string
  version: number
  text: string
  chunks: DocChunk[]
  confidential: boolean
  createdAt: number
  updatedAt: number
  updatedBy: string
}

export interface ContextDocVersion {
  id: string
  docId: string
  version: number
  text: string
  createdAt: number
  authorId: string
}

export type AssetType = 'character' | 'location' | 'wardrobe' | 'prop' | 'lighting' | 'palette'

export interface Asset {
  id: string
  projectId: string
  type: AssetType
  name: string
  description: string
  imageId?: string
  createdAt: number
}

export interface ProjectEvent {
  id: string
  projectId: string
  frameId?: string
  actorId: string
  type: string
  message: string
  createdAt: number
}

export interface ShareLink {
  id: string
  projectId: string
  token: string
  role: Role
  label: string
  expiresAt: number
  revoked: boolean
  createdAt: number
  createdBy: string
}

export interface Snapshot {
  id: string
  projectId: string
  name: string
  authorId: string
  createdAt: number
  frames: { frameId: string; revisionId?: string; order: number }[]
}
