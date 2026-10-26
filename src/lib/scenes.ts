import type { z } from 'zod'
import { applyBriefingResponse, reviseSceneResponse, sceneFieldsSchema, type applyBriefingRequest, type REVISE_FOCUSES, type reviseSceneRequest } from './ai/contract'
import { openaiProvider, post } from './ai/openai'
import { db } from './db'
import { commitFrame, putImage, saveDoc, StaleRevisionError, updateFrame } from './repo'
import { assertCan, roleIn } from './session'
import { sketchToBlob } from './sketch'
import { specFromDescription } from './sketchOps'
import type { AIRecord, Frame, FrameContent, Project, RevisionKind } from './types'

// A "cena" in the Decupa UI is a Frame in the data model.

export type ReviseFocus = (typeof REVISE_FOCUSES)[number]
export type SceneFields = z.infer<typeof sceneFieldsSchema>

const SCENE_FIELDS = Object.keys(sceneFieldsSchema.shape) as (keyof SceneFields)[]
/** What the drawing depicts. A change here makes the old drawing wrong. */
const VISUAL_FIELDS: (keyof SceneFields)[] = ['description', 'action', 'shot', 'movement']

/** The fields each focus lets the model change. Everything else stays as it was. */
const FOCUS_FIELDS: Record<ReviseFocus, (keyof SceneFields)[]> = {
  all: SCENE_FIELDS,
  drawing: ['description', 'shot', 'movement'],
  dialogue: ['dialogue'],
  shorter: ['description', 'action', 'dialogue', 'duration'],
}

export function sceneFieldsOf(content: FrameContent): SceneFields {
  return Object.fromEntries(SCENE_FIELDS.map((k) => [k, content[k]])) as SceneFields
}

/** Keeps from `proposed` only the fields `focus` allows. A "shorter" result that is not shorter is an error. */
export function applyFocus(current: SceneFields, proposed: SceneFields, focus: ReviseFocus): SceneFields {
  const next = { ...current, ...Object.fromEntries(FOCUS_FIELDS[focus].map((k) => [k, proposed[k]])) }
  if (focus === 'shorter' && next.duration >= current.duration) throw new Error('A IA não encurtou a cena. Tente de novo.')
  return next
}

/**
 * The scene fields that differ between two versions, in display order.
 * The versions panel diffs a revision's snapshot against its parent's snapshot with this.
 */
export function changedSceneFields(before: SceneFields, after: SceneFields): { field: keyof SceneFields; before: SceneFields[keyof SceneFields]; after: SceneFields[keyof SceneFields] }[] {
  return SCENE_FIELDS.filter((k) => before[k] !== after[k]).map((field) => ({ field, before: before[field], after: after[field] }))
}

export function changesDrawing(before: SceneFields, after: SceneFields): boolean {
  return VISUAL_FIELDS.some((k) => before[k] !== after[k])
}

/** Only a drawing from the local renderer may be replaced. A real image (no sketch spec) always stays. */
export function canRedraw(frame: Pick<FrameContent, 'sketch' | 'imageId'>): boolean {
  return !!frame.sketch || !frame.imageId
}

/** Said on the revision when the text asked for a new drawing but the scene keeps its real image. */
export const KEPT_IMAGE_NOTE = 'Desenho mantido: imagem original.'

/** Draws a scene with the local sketch renderer. The app never generates images with AI. */
export async function drawScene(scene: Pick<SceneFields, 'description' | 'action' | 'shot' | 'movement'>, _deliveryAspect: Project['aspect']): Promise<Pick<FrameContent, 'sketch' | 'imageId'>> {
  // The board is always landscape; the project's distribution format remains separate metadata.
  const sketch = specFromDescription(`${scene.description} ${scene.action}`, { shot: scene.shot, movement: scene.movement, aspect: '16:9' })
  const image = await sketchToBlob(sketch)
  return { sketch, imageId: await putImage(image.blob, image.width, image.height) }
}

async function briefDoc(projectId: string) {
  return db.docs.where('projectId').equals(projectId).filter((d) => d.kind === 'brief').first()
}

async function loadProject(projectId: string, userId: string) {
  const project = await db.projects.get(projectId)
  if (!project) throw new Error('Projeto não encontrado.')
  assertCan(roleIn(project, userId), 'edit')
  return project
}

function aiRecord(instruction: string, latencyMs: number, summary: string): AIRecord {
  return { instruction, provider: openaiProvider.label, model: openaiProvider.model, latencyMs, summary }
}

/** Saves `fields` as a new version. When the visual fields changed, redraws the scene unless its image is a real one. */
async function commitSceneVersion(frame: Frame, project: Project, fields: SceneFields, wantsRedraw: boolean, userId: string, message: string, kind: RevisionKind, ai: AIRecord, prepared?: Pick<FrameContent, 'sketch' | 'imageId'>) {
  const redraw = wantsRedraw && canRedraw(frame)
  const drawing = prepared ?? (redraw ? await drawScene(fields, frame.aspect ?? project.aspect) : {})
  const summary = wantsRedraw && !redraw ? [ai.summary, KEPT_IMAGE_NOTE].filter(Boolean).join(' ') : ai.summary
  // Compare and save atomically, after rendering: a teammate's edit must not be overwritten.
  await db.transaction('rw', db.frames, db.revisions, db.events, db.projects, async () => {
    const latest = await db.frames.get(frame.id)
    if (!latest || latest.headRevisionId !== frame.headRevisionId || latest.updatedAt !== frame.updatedAt || latest.imageId !== frame.imageId || JSON.stringify(sceneFieldsOf(latest)) !== JSON.stringify(sceneFieldsOf(frame))) throw new StaleRevisionError()
    await updateFrame(frame.id, userId, { ...fields, ...drawing })
    await commitFrame(frame.id, userId, message, kind, { ai: { ...ai, summary } })
  })
}

/** Rewrites one scene from a short instruction. Creates a new revision (kind 'ai-edit') whose message is the instruction. */
export async function reviseScene(input: { frameId: string; instruction: string; focus: ReviseFocus; userId: string }): Promise<void> {
  const instruction = input.instruction.trim()
  if (!instruction) throw new Error('Descreva o que mudar nesta cena.')
  const frame = await db.frames.get(input.frameId)
  if (!frame) throw new Error('Cena não encontrada.')
  const project = await loadProject(frame.projectId, input.userId)
  const [frames, brief] = await Promise.all([db.frames.where('projectId').equals(project.id).sortBy('order'), briefDoc(project.id)])
  const index = frames.findIndex((f) => f.id === frame.id)
  const neighbour = (f?: Frame) => f && { title: f.title, description: f.description, dialogue: f.dialogue }
  const current = sceneFieldsOf(frame)

  const startedAt = performance.now()
  const response = await post(
    'revise-scene',
    {
      format: frame.aspect ?? project.aspect,
      briefing: brief?.text ?? '',
      scene: current,
      before: neighbour(frames[index - 1]),
      after: neighbour(frames[index + 1]),
      instruction,
      focus: input.focus,
    } satisfies z.infer<typeof reviseSceneRequest>,
    reviseSceneResponse,
    new AbortController().signal,
  )
  const latencyMs = Math.round(performance.now() - startedAt)

  const next = applyFocus(current, response.scene, input.focus)
  if (!changedSceneFields(current, next).length) throw new Error('A IA devolveu a cena sem mudanças. Tente outro pedido.')
  // The model took seconds; someone may have saved a version meanwhile.
  if ((await db.frames.get(frame.id))?.headRevisionId !== frame.headRevisionId) throw new StaleRevisionError()

  // "Só o diálogo" and "Mais curta" never touch the drawing.
  const wantsRedraw = (input.focus === 'all' || input.focus === 'drawing') && changesDrawing(current, next)
  await commitSceneVersion(frame, project, next, wantsRedraw, input.userId, instruction, 'ai-edit', aiRecord(instruction, latencyMs, response.summary))
}

/**
 * Saves a new briefing version and rewrites only the scenes it affects.
 * Each changed scene gets a revision of kind 'briefing' whose message is the model's reason; the UI labels the kind "Briefing mudou".
 * Returns the changed frame ids.
 */
export async function applyBriefingChange(input: { projectId: string; briefing: string; userId: string }): Promise<string[]> {
  const project = await loadProject(input.projectId, input.userId)
  const briefing = input.briefing.trim()
  if (!briefing) throw new Error('Escreva o briefing antes de salvar.')
  const [doc, frames] = await Promise.all([briefDoc(project.id), db.frames.where('projectId').equals(project.id).sortBy('order')])
  if (doc?.text.trim() === briefing) return []
  const saveBriefing = () =>
    saveDoc(project.id, input.userId, { id: doc?.id, title: doc?.title ?? 'Briefing', kind: 'brief', text: briefing, confidential: doc?.confidential ?? false })
  if (!frames.length) {
    await saveBriefing()
    return []
  }

  const startedAt = performance.now()
  const response = await post(
    'apply-briefing',
    {
      format: project.aspect,
      oldBriefing: doc?.text ?? '',
      newBriefing: briefing,
      scenes: frames.map((f) => ({ id: f.id, ...sceneFieldsOf(f) })),
    } satisfies z.infer<typeof applyBriefingRequest>,
    applyBriefingResponse,
    new AbortController().signal,
  )
  const latencyMs = Math.round(performance.now() - startedAt)

  const byId = new Map(frames.map((f) => [f.id, f]))
  const ids = response.changes.map((c) => c.id)
  if (ids.some((id) => !byId.has(id)) || new Set(ids).size !== ids.length) throw new Error('A IA devolveu cenas que não existem neste projeto. Tente de novo.')

  const changes = response.changes.filter((change) => changedSceneFields(sceneFieldsOf(byId.get(change.id)!), change.scene).length)
  // Canvas rendering and blob storage happen before opening an IndexedDB transaction.
  const prepared = await Promise.all(changes.map(async (change) => {
    const frame = byId.get(change.id)!
    const redraw = changesDrawing(sceneFieldsOf(frame), change.scene) && canRedraw(frame)
    return redraw ? drawScene(change.scene, frame.aspect ?? project.aspect) : {}
  }))
  return db.transaction('rw', [db.frames, db.revisions, db.events, db.projects, db.docs, db.docVersions], async () => {
    const latestBrief = await briefDoc(project.id)
    if (latestBrief?.id !== doc?.id || latestBrief?.version !== doc?.version || latestBrief?.text !== doc?.text) throw new StaleRevisionError()
    // Saving the brief and all changed scenes is one unit: a stale scene rolls back everything.
    await saveBriefing()
    for (const [i, change] of changes.entries()) {
      const frame = byId.get(change.id)!
      await commitSceneVersion(frame, project, change.scene, changesDrawing(sceneFieldsOf(frame), change.scene), input.userId, change.reason, 'briefing', aiRecord(briefing, latencyMs, change.reason), prepared[i])
    }
    return changes.map((c) => c.id)
  })
}
