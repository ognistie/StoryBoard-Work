import { z } from 'zod'
import { CAMERA_MOVES, SHOT_TYPES } from '../types.js'

// Wire contract between the browser and the functions in api/.
// Both sides parse with these schemas, so a change here reaches both.

export const plannedFrameSchema = z.object({
  title: z.string(),
  description: z.string().describe('Descrição visual objetiva do quadro, 1 a 2 frases.'),
  action: z.string(),
  dialogue: z.string().describe('Falas no formato NOME: fala. Vazio se não houver fala.'),
  shot: z.enum(SHOT_TYPES).describe('Enquadramento. "motion" é cena de motion graphics; "conjunto" é plano de conjunto (grupo inteiro).'),
  movement: z.enum(CAMERA_MOVES).describe('Movimento de câmera. "estatico" é câmera fixa; "tracking" é travelling; "push-in" é aproximação lenta.'),
  characters: z.array(z.string()),
  duration: z.int().describe('Duração em segundos.'),
})
export type PlannedFrame = z.infer<typeof plannedFrameSchema>

export const planShotsRequest = z.object({
  styleHint: z.string(),
  scenes: z.array(z.object({ sceneNumber: z.int(), heading: z.string(), characters: z.array(z.string()), text: z.string() })),
})
export const planShotsResponse = z.object({
  scenes: z.array(z.object({ sceneNumber: z.int(), frames: z.array(plannedFrameSchema) })),
})

export const rewriteDescriptionRequest = z.object({ base: z.string(), instruction: z.string() })
export const describeImageRequest = z.object({ image: z.string().describe('Data URL da imagem.') })
export const descriptionResponse = z.object({ description: z.string() })

export const FORMATS = ['9:16', '1:1', '16:9'] as const
export const MAX_SCENES = 6
/** Characters of an attached document sent to the model; the rest stays only in the project. */
export const MAX_ATTACHMENT_CHARS = 12000

export const planBriefingRequest = z.object({
  briefing: z.string().min(1),
  format: z.enum(FORMATS),
  durationSeconds: z.int().positive(),
  attachment: z
    .discriminatedUnion('kind', [
      z.object({ kind: z.literal('text'), name: z.string(), text: z.string().max(MAX_ATTACHMENT_CHARS) }),
      z.object({ kind: z.literal('image'), name: z.string(), dataUrl: z.string() }),
    ])
    .optional(),
})
export const planBriefingResponse = z.object({
  projectName: z.string().describe('Formato "Cliente · Título curto".'),
  scenes: z.array(plannedFrameSchema).min(1).max(MAX_SCENES),
})

/** The fields of a scene the model may rewrite. */
export const sceneFieldsSchema = plannedFrameSchema.pick({ title: true, description: true, action: true, dialogue: true, shot: true, movement: true, duration: true })

export const REVISE_FOCUSES = ['all', 'drawing', 'dialogue', 'shorter'] as const

const neighbourSchema = z.object({ title: z.string(), description: z.string(), dialogue: z.string() })

export const reviseSceneRequest = z.object({
  format: z.string(),
  briefing: z.string(),
  scene: sceneFieldsSchema,
  before: neighbourSchema.optional(),
  after: neighbourSchema.optional(),
  instruction: z.string().min(1),
  focus: z.enum(REVISE_FOCUSES),
})
export const reviseSceneResponse = z.object({
  scene: sceneFieldsSchema,
  summary: z.string().describe('Uma linha, em PT-BR, dizendo o que mudou.'),
})

export const applyBriefingRequest = z.object({
  format: z.string(),
  oldBriefing: z.string(),
  newBriefing: z.string().min(1),
  scenes: z.array(sceneFieldsSchema.extend({ id: z.string() })).min(1),
})
export const applyBriefingResponse = z.object({
  changes: z.array(
    z.object({
      id: z.string(),
      scene: sceneFieldsSchema,
      reason: z.string().describe('Motivo curto, em PT-BR, ligado ao que mudou no briefing.'),
    }),
  ),
})
