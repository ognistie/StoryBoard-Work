import { z } from 'zod'
import { CAMERA_MOVES, SHOT_TYPES } from '../types.js'

// Wire contract between the browser and the functions in api/.
// Both sides parse with these schemas, so a change here reaches both.

const plannedFrameSchema = z.object({
  title: z.string(),
  description: z.string().describe('Descrição visual objetiva do quadro, 1 a 2 frases.'),
  action: z.string(),
  dialogue: z.string().describe('Falas no formato NOME: fala. Vazio se não houver fala.'),
  shot: z.enum(SHOT_TYPES).describe('Enquadramento. "motion" é cena de motion graphics; "conjunto" é plano de conjunto (grupo inteiro).'),
  movement: z.enum(CAMERA_MOVES).describe('Movimento de câmera. "estatico" é câmera fixa; "tracking" é travelling; "push-in" é aproximação lenta.'),
  characters: z.array(z.string()),
  duration: z.int().describe('Duração em segundos.'),
})
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

/**
 * Default text model. gpt-6-luna is the cheapest current OpenAI model (USD 0.10 in / 0.50 out per
 * million tokens, Oct 2026) and handles these short structured tasks. OPENAI_TEXT_MODEL overrides it.
 */
export const DEFAULT_TEXT_MODEL = 'gpt-6-luna'

const sceneBriefSchema = z.object({
  number: z.int(),
  title: z.string(),
  description: z.string(),
  dialogue: z.string(),
  duration: z.number(),
  shot: z.string(),
  movement: z.string(),
})

export const assistantRequest = z.object({
  projectName: z.string().max(200),
  format: z.string().max(20),
  briefing: z.string().max(8000),
  scenes: z.array(sceneBriefSchema).max(12),
  /** Recent chat, oldest first, so the answer follows the conversation. */
  history: z.array(z.object({ author: z.string().max(80), text: z.string().max(2000) })).max(12),
  question: z.string().min(1).max(2000),
})
export const assistantResponse = z.object({
  answer: z.string().describe('Resposta curta em PT-BR, no máximo 5 frases ou uma lista curta.'),
  suggestions: z
    .array(
      z.object({
        sceneNumber: z.int().describe('Número da cena (1 = primeira).'),
        instruction: z.string().describe('Pedido curto e direto para refazer a cena, em PT-BR. Ex.: "Trocar para close na mão".'),
      }),
    )
    .max(3)
    .describe('Mudanças concretas em cenas que a equipe pode aplicar com um clique. Vazio quando a pergunta não pede mudança.'),
})

export const healthResponse = z.object({ ai: z.boolean(), textModel: z.string(), collab: z.boolean() })
