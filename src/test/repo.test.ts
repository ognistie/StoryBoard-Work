import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../lib/db'
import { commitFrame, createFrame, createNote, createProject, createScene, deleteNote, putImage, restoreRevision, updateFrame, updateNote } from '../lib/repo'
import { PermissionError } from '../lib/session'

const PRODUCER = 'u_marina'
const EDITOR = 'u_rafael'
const CLIENT = 'u_julia'
const OUTSIDER = 'u_caio'

async function setup() {
  const projectId = await createProject({
    name: 'Teste',
    client: 'Cliente',
    producer: 'Produtora',
    style: 'pencil',
    ownerId: PRODUCER,
    members: [
      { userId: PRODUCER, role: 'producer' },
      { userId: EDITOR, role: 'editor' },
      { userId: CLIENT, role: 'client' },
    ],
  })
  const sceneId = await createScene(projectId, PRODUCER, { heading: 'EXT. CASA — DIA', timeOfDay: 'day' })
  const imageId = await putImage(new Blob(['a']), 10, 10)
  const frameId = await createFrame(projectId, sceneId, EDITOR, { title: 'Q1', description: 'Plano médio', imageId })
  return { projectId, sceneId, frameId }
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('revisions', () => {
  it('creates an initial immutable revision for a new frame', async () => {
    const { frameId } = await setup()
    const revs = await db.revisions.where('frameId').equals(frameId).toArray()
    expect(revs).toHaveLength(1)
    expect(revs[0]).toMatchObject({ number: 1, kind: 'initial', authorId: EDITOR })
    expect(revs[0].short).toMatch(/^[0-9a-f]{7}$/)
  })

  it('restoring an old version creates a new revision and keeps history', async () => {
    const { frameId } = await setup()
    const v1 = (await db.frames.get(frameId))!.headRevisionId!
    await updateFrame(frameId, EDITOR, { description: 'Mudou' })
    await commitFrame(frameId, EDITOR, 'Alteração', 'manual')
    const restored = await restoreRevision(v1, EDITOR)
    const revs = await db.revisions.where('frameId').equals(frameId).sortBy('number')
    expect(revs.map((r) => r.number)).toEqual([1, 2, 3])
    expect(restored.restoredFrom).toBe(v1)
    expect((await db.frames.get(frameId))!.description).toBe('Plano médio')
  })
})

describe('permissions', () => {
  it('clients may change their own notes but not those of teammates', async () => {
    const { projectId } = await setup()
    const own = await createNote(projectId, CLIENT, { x: 0, y: 0 })
    const teammate = await createNote(projectId, EDITOR, { x: 0, y: 0 })
    await expect(updateNote(own, CLIENT, { text: 'Minha nota' })).resolves.toBeUndefined()
    await expect(updateNote(teammate, CLIENT, { text: 'Alterada' })).rejects.toThrow(/próprias/)
    await expect(deleteNote(teammate, CLIENT)).rejects.toThrow(/próprias/)
    expect(await db.notes.get(teammate)).toBeTruthy()
  })
  it('blocks clients from editing and outsiders from writing notes', async () => {
    const { projectId, frameId } = await setup()
    await expect(updateFrame(frameId, CLIENT, { title: 'x' })).rejects.toBeInstanceOf(PermissionError)
    await expect(createNote(projectId, OUTSIDER, { x: 0, y: 0 })).rejects.toBeInstanceOf(PermissionError)
    await expect(createNote(projectId, CLIENT, { x: 0, y: 0 })).resolves.toBeTypeOf('string')
  })
})
