import type { Asset, Project, Region, ShotType, SketchSpec, TimeOfDay, CameraMove } from '../types'
import type { ParsedScene } from '../context'

export interface RefImage {
  blob: Blob
  label: string
}

export interface ImageResult {
  blob: Blob
  width: number
  height: number
  sketch?: SketchSpec
  /** Honest note shown to the user (e.g. demo mode did not understand part of the request). */
  note?: string
}

export interface EditRequest {
  image: Blob
  sketch?: SketchSpec
  prompt: string // structured prompt (see context.buildEditPrompt)
  instruction: string // raw user delta
  region?: Region
  references: RefImage[]
  characters: Asset[]
  aspect: Project['aspect']
  signal: AbortSignal
  onPreview?: (r: ImageResult) => void
}

export interface GenerateRequest {
  prompt: string
  description: string
  shot: ShotType
  timeOfDay: TimeOfDay
  characters: Asset[]
  references: RefImage[]
  aspect: Project['aspect']
  signal: AbortSignal
  onPreview?: (r: ImageResult) => void
}

export interface PlannedFrame {
  title: string
  description: string
  action: string
  dialogue: string
  shot: ShotType
  movement: CameraMove
  characters: string[]
  duration: number
}

export interface Capabilities {
  editImage: boolean
  generateImage: boolean
  /** 'native' = real mask support; 'guided' = region passed as visual/textual guidance; 'none' */
  maskedRegion: 'native' | 'guided' | 'none'
  progressivePreview: boolean
  text: boolean
}

/** Provider abstraction. Not every provider supports every capability. */
export interface AIProvider {
  id: string
  label: string
  model: string
  isDemo: boolean
  capabilities: Capabilities
  editImage(req: EditRequest): Promise<ImageResult>
  generateImage(req: GenerateRequest): Promise<ImageResult>
  rewriteDescription(base: string, instruction: string, signal: AbortSignal): Promise<string>
  describeImage(image: Blob, signal: AbortSignal): Promise<string>
  planShots(scenes: ParsedScene[], styleHint: string, signal: AbortSignal): Promise<{ sceneNumber: number; frames: PlannedFrame[] }[]>
}
