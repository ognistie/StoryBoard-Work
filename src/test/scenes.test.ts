import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../lib/db'
import { createFrame, createProject, createScene, putImage, saveDoc } from '../lib/repo'
import { applyBriefingChange, applyFocus, canRedraw, changedSceneFields, changesDrawing, KEPT_IMAGE_NOTE, reviseScene, sceneFieldsOf, type SceneFields } from '../lib/scenes'
import { PermissionError } from '../lib/session'
import type { SketchSpec } from '../lib/types'

// The sketch renderer needs a real canvas; here it only has to hand back an image.
vi.mock('../lib/sketch', () => ({ sketchToBlob: async () => ({ blob: new Blob(['sketch']), width: 10, height: 10 }) }))

const SKETCH: SketchSpec = { setting: 'empty', time: 'day', shot: 'detalhe', people: [], props: [], seed: 1 }

const scene: SceneFields = {
  title: 'Encaixe',
  description: 'Pílulas viram blocos azuis e se encaixam.',
  action: 'Os blocos formam um mosaico.',
  dialogue: 'LOCUÇÃO: Quatro produtos. Um ecossistema.',
  shot: 'detalhe',
  movement: 'zoom',
  duration: 6,
}

const proposed: SceneFields = {
  title: 'Encaixe seco',
  description: 'Blocos azuis se encaixam com um clique.',
  action: 'Encaixes secos, um a um.',
  dialogue: 'LOCUÇÃO: Tudo no lugar.',
  shot: 'close',
  movement: 'estatico',
  duration: 4,
}

describe('applyFocus', () => {
  it('"all" takes every proposed field', () => {
    expect(applyFocus(scene, proposed, 'all')).toEqual(proposed)
  })

  it('"dialogue" changes only the dialogue', () => {
    expect(applyFocus(scene, proposed, 'dialogue')).toEqual({ ...scene, dialogue: proposed.dialogue })
  })

  it('"drawing" changes only what the drawing shows', () => {
    expect(applyFocus(scene, proposed, 'drawing')).toEqual({ ...scene, description: proposed.description, shot: proposed.shot, movement: proposed.movement })
  })

  it('"shorter" tightens text and duration but keeps title, shot and movement', () => {
    expect(applyFocus(scene, proposed, 'shorter')).toEqual({ ...scene, description: proposed.description, action: proposed.action, dialogue: proposed.dialogue, duration: 4 })
  })

  it('"shorter" fails when the model did not shorten the scene', () => {
    expect(() => applyFocus(scene, { ...proposed, duration: 6 }, 'shorter')).toThrow(/não encurtou/)
  })
})

describe('changedSceneFields', () => {
  it('lists before and after for each changed field, and nothing for an identical scene', () => {
    expect(changedSceneFields(scene, scene)).toEqual([])
    expect(changedSceneFields(scene, { ...scene, dialogue: 'LOCUÇÃO: Outra fala.' })).toEqual([{ field: 'dialogue', before: scene.dialogue, after: 'LOCUÇÃO: Outra fala.' }])
  })
})

describe('canRedraw', () => {
  it('allows replacing a local sketch or an empty frame, never a real image', () => {
    expect(canRedraw({ sketch: SKETCH, imageId: 'img_1' })).toBe(true)
    expect(canRedraw({})).toBe(true)
    expect(canRedraw({ imageId: 'img_1' })).toBe(false)
  })
})

describe('changesDrawing', () => {
  it('is true only when the description, shot or movement changed', () => {
    expect(changesDrawing(scene, { ...scene, dialogue: 'x', duration: 3, title: 'y' })).toBe(false)
    expect(changesDrawing(scene, { ...scene, movement: 'pan' })).toBe(true)
  })
})

// The functions in api/ are stubbed: these tests cover what the browser saves, not the model.
describe('saving AI changes', () => {
  const PRODUCER = 'u_marina'
  const CLIENT = 'u_julia'

  async function project() {
    const projectId = await createProject({ name: 'iugu', client: 'iugu', producer: 'Lumen', style: 'pencil', ownerId: PRODUCER, aspect: '9:16', members: [{ userId: PRODUCER, role: 'producer' }, { userId: CLIENT, role: 'client' }] })
    const sceneId = await createScene(projectId, PRODUCER, { heading: 'ROTEIRO' })
    const imageId = await putImage(new Blob(['real']), 10, 10)
    const frameId = await createFrame(projectId, sceneId, PRODUCER, { ...scene, imageId })
    const otherId = await createFrame(projectId, sceneId, PRODUCER, { ...scene, title: 'Assinatura', sketch: SKETCH, imageId: await putImage(new Blob(['old sketch']), 10, 10) })
    await saveDoc(projectId, PRODUCER, { title: 'Briefing', kind: 'brief', text: 'Briefing antigo', confidential: false })
    return { projectId, frameId, otherId, imageId }
  }

  function answer(json: unknown) {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(json), { status: 200 })))
  }

  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reviseScene commits an ai-edit revision named after the instruction and keeps the real image for "dialogue"', async () => {
    const { frameId, imageId } = await project()
    answer({ scene: proposed, summary: 'Fala mais seca.' })
    await reviseScene({ frameId, instruction: 'Fala mais seca.', focus: 'dialogue', userId: PRODUCER })

    const frame = (await db.frames.get(frameId))!
    expect(sceneFieldsOf(frame)).toEqual({ ...scene, dialogue: proposed.dialogue })
    expect(frame.imageId).toBe(imageId)
    const head = (await db.revisions.get(frame.headRevisionId!))!
    expect(head).toMatchObject({ kind: 'ai-edit', message: 'Fala mais seca.', ai: { summary: 'Fala mais seca.' } })
    const parent = (await db.revisions.get(head.parentId!))!
    expect(changedSceneFields(sceneFieldsOf(parent.snapshot), sceneFieldsOf(head.snapshot)).map((c) => c.field)).toEqual(['dialogue'])
  })

  it('reviseScene "drawing" on a real image keeps the image and says so', async () => {
    const { frameId, imageId } = await project()
    answer({ scene: proposed, summary: 'Close na mão.' })
    await reviseScene({ frameId, instruction: 'Close na mão.', focus: 'drawing', userId: PRODUCER })

    const frame = (await db.frames.get(frameId))!
    expect(frame.shot).toBe(proposed.shot)
    expect(frame.imageId).toBe(imageId)
    expect(frame.sketch).toBeUndefined()
    expect((await db.revisions.get(frame.headRevisionId!))!.ai?.summary).toBe(`Close na mão. ${KEPT_IMAGE_NOTE}`)
  })

  it('reviseScene "drawing" on a local sketch redraws it', async () => {
    const { otherId } = await project()
    const before = (await db.frames.get(otherId))!
    answer({ scene: proposed, summary: 'Close na mão.' })
    await reviseScene({ frameId: otherId, instruction: 'Close na mão.', focus: 'drawing', userId: PRODUCER })

    const frame = (await db.frames.get(otherId))!
    expect(frame.imageId).not.toBe(before.imageId)
    expect(frame.sketch?.shot).toBe('close')
    expect((await db.revisions.get(frame.headRevisionId!))!.ai?.summary).toBe('Close na mão.')
  })

  it('reviseScene refuses a member who cannot edit, before calling the model', async () => {
    const { frameId } = await project()
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await expect(reviseScene({ frameId, instruction: 'x', focus: 'all', userId: CLIENT })).rejects.toBeInstanceOf(PermissionError)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('applyBriefingChange versions the briefing and commits a "briefing" revision only on the scenes that changed', async () => {
    const { projectId, frameId, otherId, imageId } = await project()
    answer({ changes: [{ id: frameId, scene: { ...scene, dialogue: 'LOCUÇÃO: Nova fala.' }, reason: 'Novo foco: gestores sem tempo.' }] })
    const changed = await applyBriefingChange({ projectId, briefing: 'Briefing novo', userId: PRODUCER })

    expect(changed).toEqual([frameId])
    const frame = (await db.frames.get(frameId))!
    expect(frame.imageId).toBe(imageId)
    expect(await db.revisions.get(frame.headRevisionId!)).toMatchObject({ kind: 'briefing', message: 'Novo foco: gestores sem tempo.' })
    expect(await db.revisions.where('frameId').equals(otherId).count()).toBe(1)
    const doc = (await db.docs.where('projectId').equals(projectId).first())!
    expect(doc).toMatchObject({ text: 'Briefing novo', version: 2 })
  })

  it('applyBriefingChange keeps real images and redraws only local sketches when the visuals change', async () => {
    const { projectId, frameId, otherId, imageId } = await project()
    const sketchBefore = (await db.frames.get(otherId))!.imageId
    const visual = { ...scene, description: 'Blocos formam o símbolo.', shot: 'motion' as const }
    answer({ changes: [{ id: frameId, scene: visual, reason: 'Mais gráfico.' }, { id: otherId, scene: { ...visual, title: 'Assinatura' }, reason: 'Mais gráfico.' }] })
    await applyBriefingChange({ projectId, briefing: 'Briefing novo', userId: PRODUCER })

    const real = (await db.frames.get(frameId))!
    expect(real.imageId).toBe(imageId)
    expect((await db.revisions.get(real.headRevisionId!))!.ai?.summary).toBe(`Mais gráfico. ${KEPT_IMAGE_NOTE}`)
    expect((await db.frames.get(otherId))!.imageId).not.toBe(sketchBefore)
  })

  it('applyBriefingChange rejects scene ids that are not in the project and leaves the briefing untouched', async () => {
    const { projectId } = await project()
    answer({ changes: [{ id: 'frm_unknown', scene, reason: 'x' }] })
    await expect(applyBriefingChange({ projectId, briefing: 'Briefing novo', userId: PRODUCER })).rejects.toThrow(/não existem/)
    expect((await db.docs.where('projectId').equals(projectId).first())!.text).toBe('Briefing antigo')
  })
})
