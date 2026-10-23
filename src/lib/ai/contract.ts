import { z } from 'zod'
import { CAMERA_MOVES, SHOT_TYPES } from '../types.js'

// Wire contract between the browser and the functions in api/.
// Both sides parse with these schemas, so a change here reaches both.

export const plannedFrameSchema = z.object({
  title: z.string(),
  description: z.string().describe('Descrição visual objetiva do quadro, 1 a 2 frases.'),
  action: z.string(),
  dialogue: z.string().describe('Falas no formato NOME: fala. Vazio se não houver fala.'),
  shot: z.enum(SHOT_TYPES),
  movement: z.enum(CAMERA_MOVES),
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
