import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../lib/db'
import { uid } from '../lib/ids'
import {
  acceptCandidate,
  addComment,
  commitFrame,
  createFrame,
  createProject,
  createScene,
  createShareLink,
  decideProposal,
  frameNeedsRevalidation,
  putImage,
  redeemShareLink,
  restoreRevision,
  revokeShareLink,
  reviewFrame,
  StaleRevisionError,
  updateFrame,
} from '../lib/repo'
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

async function readyJob(projectId: string, frameId: string, createdBy: string) {
  const frame = (await db.frames.get(frameId))!
  const candidateImageId = await putImage(new Blob(['b']), 10, 10)
  const id = uid('job')
  await db.jobs.add({
    id,
    projectId,
    frameId,
    batchId: 'b',
    kind: 'edit',
    baseRevisionId: frame.headRevisionId,
    instruction: 'Adicionar uma pessoa à direita',
    keepConsistency: true,
    status: 'ready',
    decision: 'pending',
    candidateImageId,
    newDescription: 'Plano médio com duas pessoas',
    createdBy,
    createdAt: Date.now(),
  })
  return { id, candidateImageId }
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

describe('approvals', () => {
  it('ties approval to an exact revision and flags revalidation after a change', async () => {
    const { frameId } = await setup()
    await reviewFrame(frameId, CLIENT, 'approved')
    let frame = (await db.frames.get(frameId))!
    expect(frame.status).toBe('approved')
    const approval = await db.approvals.where('frameId').equals(frameId).first()
    expect(approval!.revisionId).toBe(frame.headRevisionId)

    await updateFrame(frameId, EDITOR, { description: 'Nova' })
    await commitFrame(frameId, EDITOR, 'Ajuste', 'manual')
    frame = (await db.frames.get(frameId))!
    expect(frame.status).toBe('review')
    expect(frameNeedsRevalidation(frame)).toBe(true)
  })

  it('commits pending working-copy edits before approving', async () => {
    const { frameId } = await setup()
    await updateFrame(frameId, EDITOR, { title: 'Editado' })
    await reviewFrame(frameId, PRODUCER, 'approved')
    const frame = (await db.frames.get(frameId))!
    expect(frame.dirty).toBe(false)
    expect((await db.revisions.get(frame.approvedRevisionId!))!.snapshot.title).toBe('Editado')
  })
})

describe('AI candidates', () => {
  it('editor acceptance commits a new revision and keeps the original image in history', async () => {
    const { projectId, frameId } = await setup()
    const before = (await db.frames.get(frameId))!.imageId
    const { id, candidateImageId } = await readyJob(projectId, frameId, EDITOR)
    expect(await acceptCandidate(id, EDITOR)).toBe('committed')
    const frame = (await db.frames.get(frameId))!
    expect(frame.imageId).toBe(candidateImageId)
    const revs = await db.revisions.where('frameId').equals(frameId).sortBy('number')
    expect(revs[0].snapshot.imageId).toBe(before)
    expect(revs[1].kind).toBe('ai-edit')
  })

  it('client acceptance becomes a proposal; approved image is untouched until a producer decides', async () => {
    const { projectId, frameId } = await setup()
    await reviewFrame(frameId, CLIENT, 'approved')
    const approvedImage = (await db.frames.get(frameId))!.imageId
    const { id } = await readyJob(projectId, frameId, CLIENT)
    expect(await acceptCandidate(id, CLIENT)).toBe('proposed')
    expect((await db.frames.get(frameId))!.imageId).toBe(approvedImage)

    const proposal = (await db.proposals.where('frameId').equals(frameId).first())!
    await expect(decideProposal(proposal.id, CLIENT, true)).rejects.toBeInstanceOf(PermissionError)
    await decideProposal(proposal.id, PRODUCER, true)
    const head = (await db.revisions.get((await db.frames.get(frameId))!.headRevisionId!))!
    expect(head).toMatchObject({ kind: 'proposal', authorId: CLIENT, proposalId: proposal.id })
  })

  it('refuses to silently overwrite a frame that changed during generation', async () => {
    const { projectId, frameId } = await setup()
    const { id } = await readyJob(projectId, frameId, EDITOR)
    await updateFrame(frameId, PRODUCER, { description: 'Edição concorrente' })
    await commitFrame(frameId, PRODUCER, 'Concorrente', 'manual')
    await expect(acceptCandidate(id, EDITOR)).rejects.toBeInstanceOf(StaleRevisionError)
    expect((await db.jobs.get(id))!.stale).toBe(true)
    expect(await acceptCandidate(id, EDITOR, { force: true })).toBe('committed')
    expect(await db.revisions.where('frameId').equals(frameId).count()).toBe(3)
  })
})

describe('permissions and sharing', () => {
  it('blocks clients from editing and outsiders from commenting', async () => {
    const { projectId, frameId } = await setup()
    await expect(updateFrame(frameId, CLIENT, { title: 'x' })).rejects.toBeInstanceOf(PermissionError)
    await expect(addComment(projectId, frameId, OUTSIDER, 'oi')).rejects.toBeInstanceOf(PermissionError)
    await expect(addComment(projectId, frameId, CLIENT, 'Ótimo!')).resolves.toBeTypeOf('string')
  })

  it('share links grant the configured role and stop working once revoked', async () => {
    const { projectId } = await setup()
    const link = await createShareLink(projectId, PRODUCER, 'viewer', 7, 'Leitura')
    await expect(createShareLink(projectId, CLIENT, 'editor', 7, 'x')).rejects.toBeInstanceOf(PermissionError)
    await redeemShareLink(link.token, OUTSIDER)
    expect((await db.projects.get(projectId))!.members).toContainEqual({ userId: OUTSIDER, role: 'viewer' })
    await revokeShareLink(link.id, PRODUCER)
    await expect(redeemShareLink(link.token, 'u_other')).rejects.toThrow(/revogado/)
  })
})
