// Domain model. Everything is persisted in the browser (IndexedDB via Dexie).

export type Role = 'admin' | 'producer' | 'editor' | 'client' | 'viewer'

export interface User {
  id: string
  name: string
  org: string
}

interface ProjectMember {
  userId: string
  role: Role
}

type ProjectStatus = 'pre' | 'review' | 'approved' | 'archived'

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
  /** Length asked for in the briefing. The scenes' durations may add up to something else. */
  durationSeconds?: number
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

type FrameStatus = 'draft' | 'review' | 'changes' | 'approved'

export const SHOT_TYPES = ['geral', 'conjunto', 'aberto', 'medio', 'americano', 'close', 'extreme-close', 'detalhe', 'pov', 'ots', 'motion'] as const
export type ShotType = (typeof SHOT_TYPES)[number]

// 'tracking' is the travelling shot; the pills read it as TRAVELLING.
export const CAMERA_MOVES = ['estatico', 'pan', 'tilt', 'dolly', 'push-in', 'tracking', 'truck', 'zoom', 'zoom-out', 'handheld', 'crane', 'time-lapse'] as const
export type CameraMove = (typeof CAMERA_MOVES)[number]

interface Annotation {
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

export type HairStyle = 'short' | 'curly' | 'long' | 'ponytail' | 'cap' | 'bun' | 'spiky'
export type Outfit = 'plain' | 'striped' | 'jacket' | 'collar' | 'dress'

export interface SketchPerson {
  x: number // 0..1 horizontal position
  name?: string
  kind: 'adult' | 'child'
  pose: 'stand' | 'walk' | 'sit' | 'wave'
  facing: 'left' | 'right'
  hair?: HairStyle
  outfit?: Outfit
  beard?: boolean
  expression?: 'smile' | 'neutral' | 'surprised' | 'laugh'
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
  /** The scene's own format. Unset means the project's format. */
  aspect?: Project['aspect']
}

export interface Frame extends FrameContent {
  id: string
  projectId: string
  sceneId: string
  order: number
  status: FrameStatus
  headRevisionId?: string
  dirty: boolean // working copy differs from head revision
  updatedAt: number
  updatedBy: string
}

export type RevisionKind = 'initial' | 'ai-edit' | 'briefing' | 'manual' | 'restore'

/** Where an AI-made revision came from: the request and the model that answered it. */
export interface AIRecord {
  instruction: string
  provider: string
  model: string
  latencyMs?: number
  /** One line from the model saying what it changed. */
  summary?: string
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
}

export interface StoredImage {
  id: string
  blob: Blob
  width: number
  height: number
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

/** A sticky note on the project canvas. Position is in canvas coordinates. */
export interface Note {
  id: string
  projectId: string
  authorId: string
  text: string
  x: number
  y: number
  /** Tilt in degrees, so notes look stuck on by hand. */
  rotation: number
  createdAt: number
  updatedAt: number
}

export type DocKind = 'script' | 'brief' | 'treatment' | 'bible' | 'art' | 'tech' | 'other'

export interface ContextDoc {
  id: string
  projectId: string
  kind: DocKind
  title: string
  fileName?: string
  version: number
  text: string
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

type AssetType = 'character' | 'location' | 'wardrobe' | 'prop' | 'lighting' | 'palette' | 'reference'

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
