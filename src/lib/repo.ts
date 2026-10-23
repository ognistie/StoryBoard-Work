import { db } from './db'
import { shortHash, token, uid } from './ids'
import { assertCan, roleIn, userById, type Capability } from './session'
import { chunkText, parseScript } from './context'
import type {
  AIRecord,
  ArtStyle,
  Asset,
  ContextDoc,
  DocKind,
  Frame,
  FrameContent,
  GenerationJob,
  Note,
  Project,
  Proposal,
  Revision,
  RevisionKind,
  Role,
  Scene,
} from './types'

/**
 * All mutations go through this module. Each one authorizes the actor against
 * the project membership before touching the database, and records an audit
 * event. Revisions and images are append-only (never edited in place).
 */

export class StaleRevisionError extends Error {
  constructor() {
    super('Este quadro recebeu uma nova versão enquanto a IA trabalhava.')
    this.name = 'StaleRevisionError'
  }
}

export const CONTENT_KEYS: (keyof FrameContent)[] = [
  'title',
  'description',
  'action',
  'dialogue',
  'shot',
  'angle',
  'movement',
  'composition',
  'duration',
  'characters',
  'location',
  'lighting',
  'notes',
  'imageId',
  'sketch',
  'annotations',
  'aspect',
]

export function contentOf(frame: FrameContent): FrameContent {
  const out = {} as Record<string, unknown>
  for (const k of CONTENT_KEYS) out[k] = structuredClone(frame[k])
  return out as unknown as FrameContent
}

export function emptyContent(partial: Partial<FrameContent> = {}): FrameContent {
  return {
    title: 'Novo quadro',
    description: '',
    action: '',
    dialogue: '',
    shot: 'medio',
    angle: 'Altura dos olhos',
    movement: 'estatico',
    composition: '',
    duration: 3,
    characters: [],
    location: '',
    lighting: '',
    notes: '',
    annotations: [],
    ...partial,
  }
}

async function authorize(projectId: string, actorId: string, cap: Capability): Promise<{ project: Project; role: Role }> {
  const project = await db.projects.get(projectId)
  if (!project) throw new Error('Projeto não encontrado.')
  const role = roleIn(project, actorId)
  assertCan(role, cap)
  return { project, role: role! }
}

export async function logEvent(projectId: string, actorId: string, type: string, message: string, frameId?: string) {
  await db.events.add({ id: uid('ev'), projectId, actorId, type, message, frameId, createdAt: Date.now() })
  await db.projects.update(projectId, { updatedAt: Date.now() })
}

export async function putImage(blob: Blob, width: number, height: number): Promise<string> {
  const id = uid('img')
  await db.images.add({ id, blob, width, height, createdAt: Date.now() })
  return id
}

// ---------------------------------------------------------------- projects

export async function createProject(input: {
  name: string
  client: string
  producer: string
  style: ArtStyle
  ownerId: string
  members?: { userId: string; role: Role }[]
  aspect?: Project['aspect']
  durationSeconds?: number
}): Promise<string> {
  const id = uid('prj')
  const now = Date.now()
  const members = input.members ?? [{ userId: input.ownerId, role: 'producer' as Role }]
  if (!members.some((m) => m.userId === input.ownerId)) members.unshift({ userId: input.ownerId, role: 'producer' })
  await db.projects.add({
    id,
    name: input.name,
    client: input.client,
    producer: input.producer,
    ownerId: input.ownerId,
    status: 'pre',
    style: input.style,
    styleNotes: '',
    members,
    aspect: input.aspect ?? '16:9',
    durationSeconds: input.durationSeconds,
    createdAt: now,
    updatedAt: now,
  })
  await logEvent(id, input.ownerId, 'project.created', `Projeto “${input.name}” criado`)
  return id
}

// ---------------------------------------------------------------- share links

export async function createShareLink(projectId: string, actorId: string, role: Role, days: number, label: string) {
  await authorize(projectId, actorId, 'manage')
  const link = {
    id: uid('lnk'),
    projectId,
    token: token(),
    role,
    label,
    expiresAt: Date.now() + days * 86400_000,
    revoked: false,
    createdAt: Date.now(),
    createdBy: actorId,
  }
  await db.shareLinks.add(link)
  await logEvent(projectId, actorId, 'share.created', `Link de acesso criado (${label})`)
  return link
}

export async function revokeShareLink(linkId: string, actorId: string) {
  const link = await db.shareLinks.get(linkId)
  if (!link) return
  await authorize(link.projectId, actorId, 'manage')
  await db.shareLinks.update(linkId, { revoked: true })
  await logEvent(link.projectId, actorId, 'share.revoked', `Link “${link.label}” revogado`)
}

/** Redeem a share token: the visiting identity joins the project with the link's role. */
export async function redeemShareLink(tok: string, userId: string): Promise<string> {
  const link = await db.shareLinks.where('token').equals(tok).first()
  if (!link || link.revoked) throw new Error('Este link é inválido ou foi revogado.')
  if (link.expiresAt < Date.now()) throw new Error('Este link expirou.')
  const project = await db.projects.get(link.projectId)
  if (!project) throw new Error('Projeto não encontrado.')
  if (!project.members.some((m) => m.userId === userId)) {
    await db.projects.update(project.id, { members: [...project.members, { userId, role: link.role }] })
    await logEvent(project.id, userId, 'member.joined', `${userById(userId).name} entrou pelo link “${link.label}”`)
  }
  return project.id
}

// ---------------------------------------------------------------- scenes & frames

export async function createScene(projectId: string, actorId: string, partial: Partial<Scene>): Promise<string> {
  await authorize(projectId, actorId, 'edit')
  const count = await db.scenes.where('projectId').equals(projectId).count()
  const id = uid('scn')
  await db.scenes.add({
    id,
    projectId,
    number: count + 1,
    heading: `CENA ${count + 1}`,
    sequence: '',
    summary: '',
    timeOfDay: 'unknown',
    characters: [],
    scriptExcerpt: '',
    order: count,
    ...partial,
  })
  return id
}

export async function createFrame(
  projectId: string,
  sceneId: string,
  actorId: string,
  content: Partial<FrameContent>,
  opts: { message?: string; kind?: RevisionKind; ai?: AIRecord; afterOrder?: number; skipAuth?: boolean } = {},
): Promise<string> {
  if (!opts.skipAuth) await authorize(projectId, actorId, 'edit')
  const id = uid('frm')
  const frames = await db.frames.where('projectId').equals(projectId).sortBy('order')
  const order = opts.afterOrder !== undefined ? opts.afterOrder + 0.5 : (frames.at(-1)?.order ?? -1) + 1
  const now = Date.now()
  await db.frames.add({
    ...emptyContent(content),
    id,
    projectId,
    sceneId,
    order,
    status: 'draft',
    dirty: false,
    updatedAt: now,
    updatedBy: actorId,
  })
  await commitFrame(id, actorId, opts.message ?? 'Quadro criado', opts.kind ?? 'initial', { ai: opts.ai, skipAuth: true })
  if (opts.afterOrder !== undefined) await normalizeOrder(projectId)
  return id
}

async function normalizeOrder(projectId: string) {
  const frames = await db.frames.where('projectId').equals(projectId).sortBy('order')
  await db.transaction('rw', db.frames, async () => {
    for (let i = 0; i < frames.length; i++) if (frames[i].order !== i) await db.frames.update(frames[i].id, { order: i })
  })
}

/** Edit the working copy of a frame (not versioned until committed). */
export async function updateFrame(frameId: string, actorId: string, patch: Partial<FrameContent>) {
  const frame = await db.frames.get(frameId)
  if (!frame) return
  await authorize(frame.projectId, actorId, 'edit')
  await db.frames.update(frameId, { ...patch, dirty: true, updatedAt: Date.now(), updatedBy: actorId })
}

/** Create an immutable revision from the frame's current working copy. */
export async function commitFrame(
  frameId: string,
  actorId: string,
  message: string,
  kind: RevisionKind,
  extra: { ai?: AIRecord; restoredFrom?: string; proposalId?: string; skipAuth?: boolean; authorId?: string } = {},
): Promise<Revision> {
  return db.transaction('rw', db.frames, db.revisions, db.events, db.projects, async () => {
    const frame = await db.frames.get(frameId)
    if (!frame) throw new Error('Quadro não encontrado.')
    if (!extra.skipAuth) await authorize(frame.projectId, actorId, 'edit')
    const prev = await db.revisions.where('frameId').equals(frameId).count()
    const rev: Revision = {
      id: uid('rev'),
      short: shortHash(),
      projectId: frame.projectId,
      frameId,
      parentId: frame.headRevisionId,
      number: prev + 1,
      authorId: extra.authorId ?? actorId,
      createdAt: Date.now(),
      message,
      kind,
      snapshot: contentOf(frame),
      ai: extra.ai,
      restoredFrom: extra.restoredFrom,
      proposalId: extra.proposalId,
    }
    await db.revisions.add(rev)
    // A new revision after an approval requires a fresh validation.
    const status = frame.status === 'approved' || frame.status === 'changes' ? 'review' : frame.status
    await db.frames.update(frameId, { headRevisionId: rev.id, dirty: false, status, contextOutdated: false, updatedAt: Date.now(), updatedBy: actorId })
    if (kind !== 'initial') await logEvent(frame.projectId, rev.authorId, 'revision.committed', `${rev.short} — ${message}`, frameId)
    return rev
  })
}

export async function reorderFrames(projectId: string, actorId: string, orderedIds: string[], moved?: { frameId: string; sceneId: string }) {
  await authorize(projectId, actorId, 'edit')
  await db.transaction('rw', db.frames, async () => {
    for (let i = 0; i < orderedIds.length; i++) await db.frames.update(orderedIds[i], { order: i })
    if (moved) await db.frames.update(moved.frameId, { sceneId: moved.sceneId })
  })
}

export async function restoreRevision(revisionId: string, actorId: string) {
  const rev = await db.revisions.get(revisionId)
  if (!rev) throw new Error('Revisão não encontrada.')
  const frame = await db.frames.get(rev.frameId)
  if (!frame) throw new Error('O quadro desta revisão foi removido.')
  await authorize(frame.projectId, actorId, 'edit')
  await db.frames.update(frame.id, { ...structuredClone(rev.snapshot) })
  return commitFrame(frame.id, actorId, `Restaurada a versão ${rev.short} (v${rev.number})`, 'restore', { restoredFrom: rev.id, skipAuth: true })
}

// ---------------------------------------------------------------- AI candidates

/**
 * Accept a generated candidate. Editors/producers commit a revision directly;
 * clients create a proposal that a producer must decide on.
 * Compare-and-set on the base revision prevents silent overwrites.
 */
export async function acceptCandidate(jobId: string, actorId: string, opts: { force?: boolean } = {}): Promise<'committed' | 'proposed'> {
  const job = await db.jobs.get(jobId)
  if (!job || !job.candidateImageId) throw new Error('Resultado indisponível.')
  const frame = await db.frames.get(job.frameId)
  if (!frame) throw new Error('Quadro não encontrado.')
  const { role } = await authorize(frame.projectId, actorId, 'ai')
  if (!opts.force && job.baseRevisionId && frame.headRevisionId !== job.baseRevisionId) {
    await db.jobs.update(jobId, { stale: true })
    throw new StaleRevisionError()
  }
  const canCommit = role === 'admin' || role === 'producer' || role === 'editor'
  if (!canCommit) {
    const proposal: Proposal = {
      id: uid('prp'),
      projectId: frame.projectId,
      frameId: frame.id,
      jobId,
      baseRevisionId: job.baseRevisionId,
      candidateImageId: job.candidateImageId,
      candidateSketch: job.candidateSketch,
      newDescription: job.newDescription ?? frame.description,
      instruction: job.instruction,
      ai: job.ai,
      authorId: actorId,
      status: 'open',
      createdAt: Date.now(),
    }
    await db.proposals.add(proposal)
    await db.jobs.update(jobId, { decision: 'proposed' })
    await db.frames.update(frame.id, { status: frame.status === 'approved' ? 'approved' : 'review' })
    await logEvent(frame.projectId, actorId, 'proposal.created', `Propôs alteração em “${frame.title}”: “${job.instruction}”`, frame.id)
    return 'proposed'
  }
  await db.frames.update(frame.id, {
    imageId: job.candidateImageId,
    sketch: job.candidateSketch ?? frame.sketch,
    description: job.newDescription ?? frame.description,
  })
  await commitFrame(frame.id, actorId, summarizeInstruction(job), job.kind === 'generate' ? 'ai-generate' : 'ai-edit', { ai: job.ai, skipAuth: true })
  await db.jobs.update(jobId, { decision: 'accepted' })
  return 'committed'
}

function summarizeInstruction(job: GenerationJob) {
  const t = job.instruction.trim().replace(/\.$/, '')
  return job.kind === 'generate' ? `Imagem gerada: ${t}` : t.charAt(0).toUpperCase() + t.slice(1)
}

export async function decideProposal(proposalId: string, actorId: string, accept: boolean, note?: string) {
  const prop = await db.proposals.get(proposalId)
  if (!prop || prop.status !== 'open') throw new Error('Proposta não está aberta.')
  const frame = await db.frames.get(prop.frameId)
  if (!frame) throw new Error('Quadro não encontrado.')
  await authorize(prop.projectId, actorId, 'decide')
  const decider = userById(actorId).name
  if (accept) {
    await db.frames.update(frame.id, {
      imageId: prop.candidateImageId,
      sketch: prop.candidateSketch ?? frame.sketch,
      description: prop.newDescription,
    })
    const msg = `${prop.instruction.charAt(0).toUpperCase()}${prop.instruction.slice(1).replace(/\.$/, '')} (aprovado por ${decider})`
    await commitFrame(frame.id, actorId, msg, 'proposal', { ai: prop.ai, proposalId: prop.id, authorId: prop.authorId, skipAuth: true })
  } else {
    await db.frames.update(frame.id, { status: frame.approvedRevisionId === frame.headRevisionId ? 'approved' : 'review' })
  }
  await db.proposals.update(proposalId, { status: accept ? 'accepted' : 'rejected', decidedBy: actorId, decidedAt: Date.now(), note })
  if (note) await addComment(prop.projectId, frame.id, actorId, `${accept ? 'Proposta aceita' : 'Proposta recusada'}: ${note}`, undefined, true)
  await logEvent(prop.projectId, actorId, accept ? 'proposal.accepted' : 'proposal.rejected', `${accept ? 'Aceitou' : 'Recusou'} proposta em “${frame.title}”`, frame.id)
}

// ---------------------------------------------------------------- approvals & comments

export async function reviewFrame(frameId: string, actorId: string, decision: 'approved' | 'changes', comment?: string) {
  const frame = await db.frames.get(frameId)
  if (!frame) return
  await authorize(frame.projectId, actorId, 'approve')
  let headId = frame.headRevisionId
  if (frame.dirty) {
    // Approval must point to an immutable revision.
    const rev = await commitFrame(frameId, actorId, 'Versão registrada para validação', 'manual', { skipAuth: true })
    headId = rev.id
  }
  await db.approvals.add({ id: uid('apv'), projectId: frame.projectId, frameId, revisionId: headId!, userId: actorId, decision, comment, createdAt: Date.now() })
  await db.frames.update(frameId, {
    status: decision === 'approved' ? 'approved' : 'changes',
    approvedRevisionId: decision === 'approved' ? headId : frame.approvedRevisionId,
  })
  if (comment) await addComment(frame.projectId, frameId, actorId, comment, undefined, true)
  const rev = headId ? await db.revisions.get(headId) : undefined
  await logEvent(
    frame.projectId,
    actorId,
    decision === 'approved' ? 'frame.approved' : 'frame.changes',
    `${decision === 'approved' ? 'Aprovou' : 'Solicitou ajustes em'} “${frame.title}” (v${rev?.number ?? '?'} · ${rev?.short ?? ''})`,
    frameId,
  )
}

export async function addComment(projectId: string, frameId: string, actorId: string, text: string, pin?: { x: number; y: number }, skipAuth = false) {
  if (!skipAuth) await authorize(projectId, actorId, 'comment')
  const frame = await db.frames.get(frameId)
  const id = uid('cmt')
  await db.comments.add({ id, projectId, frameId, revisionId: frame?.headRevisionId, authorId: actorId, text, pin, resolved: false, createdAt: Date.now() })
  if (!skipAuth) await logEvent(projectId, actorId, 'comment.added', `Comentou em “${frame?.title ?? 'quadro'}”`, frameId)
  return id
}

// ---------------------------------------------------------------- context documents

export async function saveDoc(
  projectId: string,
  actorId: string,
  input: { id?: string; title: string; kind: DocKind; text: string; confidential: boolean; fileName?: string },
): Promise<string> {
  await authorize(projectId, actorId, 'edit')
  const now = Date.now()
  const existing = input.id ? await db.docs.get(input.id) : undefined
  const id = existing?.id ?? uid('doc')
  const version = existing ? (existing.text === input.text ? existing.version : existing.version + 1) : 1
  const doc: ContextDoc = {
    id,
    projectId,
    kind: input.kind,
    title: input.title,
    fileName: input.fileName ?? existing?.fileName,
    version,
    text: input.text,
    chunks: chunkText(input.text, input.kind),
    confidential: input.confidential,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    updatedBy: actorId,
  }
  await db.docs.put(doc)
  if (!existing || existing.version !== version) {
    await db.docVersions.add({ id: uid('dv'), docId: id, version, text: input.text, createdAt: now, authorId: actorId })
    await logEvent(projectId, actorId, 'doc.saved', `Documento “${input.title}” ${existing ? `atualizado para v${version}` : 'adicionado'}`)
  }
  if (input.kind === 'script' && existing && existing.text !== input.text) await syncScenesFromScript(projectId, input.text)
  return id
}

/** After a script change, update scene metadata and flag frames whose scene text changed. */
export async function syncScenesFromScript(projectId: string, text: string): Promise<number> {
  const parsed = parseScript(text)
  const scenes = await db.scenes.where('projectId').equals(projectId).toArray()
  let flagged = 0
  for (const ps of parsed) {
    const scene = scenes.find((s) => s.number === ps.number)
    if (!scene) continue
    if (scene.scriptExcerpt.trim() !== ps.excerpt.trim()) {
      await db.scenes.update(scene.id, { heading: ps.heading, timeOfDay: ps.timeOfDay, scriptExcerpt: ps.excerpt, characters: ps.characters, summary: ps.summary })
      flagged += await db.frames.where('sceneId').equals(scene.id).modify({ contextOutdated: true })
    }
  }
  return flagged
}

// ---------------------------------------------------------------- assets

export async function saveAsset(projectId: string, actorId: string, asset: Partial<Asset> & { name: string; type: Asset['type'] }) {
  await authorize(projectId, actorId, 'edit')
  const id = asset.id ?? uid('ast')
  const existing = asset.id ? await db.assets.get(asset.id) : undefined
  await db.assets.put({ description: '', createdAt: Date.now(), ...existing, ...asset, id, projectId })
  if (!existing) await logEvent(projectId, actorId, 'asset.added', `Asset “${asset.name}” adicionado`)
  return id
}

// ---------------------------------------------------------------- snapshots

export function frameNeedsRevalidation(frame: Frame) {
  return !!frame.approvedRevisionId && (frame.approvedRevisionId !== frame.headRevisionId || frame.dirty)
}

// ---------------------------------------------------------------- notes

export async function createNote(projectId: string, actorId: string, at: { x: number; y: number }): Promise<string> {
  await authorize(projectId, actorId, 'comment')
  const now = Date.now()
  const note: Note = { id: uid('note'), projectId, authorId: actorId, text: '', x: at.x, y: at.y, rotation: Math.round((Math.random() * 5 - 2.5) * 10) / 10, createdAt: now, updatedAt: now }
  await db.notes.add(note)
  return note.id
}

export async function updateNote(noteId: string, actorId: string, patch: Partial<Pick<Note, 'text' | 'x' | 'y'>>) {
  const note = await db.notes.get(noteId)
  if (!note) return
  await authorize(note.projectId, actorId, 'comment')
  await db.notes.update(noteId, { ...patch, updatedAt: Date.now() })
}

export async function deleteNote(noteId: string, actorId: string) {
  const note = await db.notes.get(noteId)
  if (!note) return
  await authorize(note.projectId, actorId, 'comment')
  await db.notes.delete(noteId)
}
