import { db } from './db'
import { shortHash, uid } from './ids'
import { assertCan, roleIn, type Capability } from './session'
import type {
  AIRecord,
  ArtStyle,
  Asset,
  ContextDoc,
  DocKind,
  FrameContent,
  Note,
  Project,
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

const CONTENT_KEYS: (keyof FrameContent)[] = [
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

function contentOf(frame: FrameContent): FrameContent {
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

async function logEvent(projectId: string, actorId: string, type: string, message: string, frameId?: string) {
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
  extra: { ai?: AIRecord; restoredFrom?: string; skipAuth?: boolean } = {},
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
      authorId: actorId,
      createdAt: Date.now(),
      message,
      kind,
      snapshot: contentOf(frame),
      ai: extra.ai,
      restoredFrom: extra.restoredFrom,
    }
    await db.revisions.add(rev)
    await db.frames.update(frameId, { headRevisionId: rev.id, dirty: false, updatedAt: Date.now(), updatedBy: actorId })
    if (kind !== 'initial') await logEvent(frame.projectId, rev.authorId, 'revision.committed', `${rev.short} — ${message}`, frameId)
    return rev
  })
}

export async function reorderFrames(projectId: string, actorId: string, orderedIds: string[]) {
  await authorize(projectId, actorId, 'edit')
  await db.transaction('rw', db.frames, async () => {
    for (let i = 0; i < orderedIds.length; i++) await db.frames.update(orderedIds[i], { order: i })
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
  return id
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
