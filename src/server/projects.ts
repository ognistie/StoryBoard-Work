import { canWrite, MAX_BLOB_BYTES, NOT_MEMBER, type Change, type Invite, type Member, type PublicUser, type RemoteProject, type ShareRole } from '../lib/collab/contract.js'
import { getUser, getUsers, hasVerifiedEmail } from './auth.js'
import { HttpError, randomToken } from './http.js'
import { one, parseJSON, type KV } from './kv.js'

// Shared projects on the server. A project is a log of records: every write gets the next
// sequence number, and a client pulls what changed after the last number it saw.
// Last write wins per record; revisions, images and file versions are append-only, so the
// history itself never conflicts.
//
// Name, members and "updated at" live in separate keys, and each member is one hash field.
// Every change writes only its own key or field, so a push that renames the project and an invite
// accepted at the same moment can never undo each other.

/** Facts of a shared project that never change. */
interface StoredMeta {
  id: string
  ownerId: string
  createdAt: number
}

/** A project as the server reads it: the fixed facts plus the name and members kept in their own keys. */
interface StoredProject extends StoredMeta {
  name: string
  members: { userId: string; role: ShareRole }[]
}

interface StoredInvite {
  token: string
  projectId: string
  email: string
  role: ShareRole
  invitedBy: string
  createdAt: number
}

const INVITE_DAYS = 14
const ONLINE_MS = 30_000
const PULL_LIMIT = 300
/** A push that has not finished after this long crashed; its marker stops holding pulls back. */
const PENDING_MS = 60_000

const k = {
  project: (id: string) => `proj:${id}`,
  name: (id: string) => `proj:${id}:name`,
  /** Hash userId -> "role:joinedAt". One field per person, so joining, leaving and renaming never overwrite each other. */
  members: (id: string) => `proj:${id}:members`,
  userProjects: (userId: string) => `user-projects:${userId}`,
  seq: (id: string) => `proj:${id}:seq`,
  /** Hash "table:id" -> the latest version of each record. */
  records: (id: string) => `proj:${id}:rec`,
  /** Sorted set "table:id" scored by the sequence number of its latest write. */
  log: (id: string) => `proj:${id}:log`,
  /** Pushes still writing, scored by the lowest sequence number they can get. */
  pending: (id: string) => `proj:${id}:pending`,
  /** Last time anything was pushed: the project's "updated at" for lists. */
  touched: (id: string) => `proj:${id}:touched`,
  presence: (id: string) => `proj:${id}:presence`,
  invite: (token: string) => `invite:${token}`,
  emailInvites: (email: string) => `invites-email:${email}`,
  blob: (projectId: string, id: string) => `blob:${projectId}:${id}`,
}

const readCommands = (id: string) => [
  ['GET', k.project(id)],
  ['GET', k.name(id)],
  ['HGETALL', k.members(id)],
  ['GET', k.touched(id)],
]

/** Builds a project from the replies to readCommands; null when it does not exist. */
function parseProject([meta, name, members, touched]: unknown[]): { project: StoredProject; touched: number } | null {
  const m = parseJSON<StoredMeta>(meta)
  if (!m) return null
  const pairs = (members as string[] | null) ?? []
  const list: { userId: string; role: ShareRole; joined: number }[] = []
  for (let i = 0; i < pairs.length; i += 2) {
    const [role, joined] = pairs[i + 1].split(':')
    list.push({ userId: pairs[i], role: role as ShareRole, joined: Number(joined) })
  }
  list.sort((a, b) => a.joined - b.joined)
  return {
    project: { ...m, name: typeof name === 'string' ? name : '', members: list.map(({ userId, role }) => ({ userId, role })) },
    touched: Number(touched ?? 0),
  }
}

async function loadProject(kv: KV, id: string) {
  return parseProject(await kv.pipeline(readCommands(id)))
}

/** The project and the caller's role in it. Non-members get 404, so ids do not leak which projects exist. */
export async function access(kv: KV, projectId: string, userId: string): Promise<{ project: StoredProject; role: ShareRole; touched: number }> {
  const loaded = await loadProject(kv, projectId)
  const role = loaded?.project.members.find((m) => m.userId === userId)?.role
  if (!loaded || !role) throw new HttpError(404, NOT_MEMBER)
  return { ...loaded, role }
}

export async function toRemote(kv: KV, project: StoredProject, touched = 0): Promise<RemoteProject> {
  const users = await getUsers(
    kv,
    project.members.map((m) => m.userId),
  )
  const members: Member[] = project.members.flatMap((m) => {
    const u = users.get(m.userId)
    return u ? [{ userId: m.userId, email: u.email, name: u.name, role: m.role }] : []
  })
  return { id: project.id, name: project.name, ownerId: project.ownerId, members, createdAt: project.createdAt, updatedAt: Math.max(project.createdAt, touched) }
}

export async function listProjects(kv: KV, userId: string): Promise<RemoteProject[]> {
  const ids = await one<string[]>(kv, ['SMEMBERS', k.userProjects(userId)])
  if (!ids.length) return []
  const rows = await kv.pipeline(ids.flatMap(readCommands))
  const remote = await Promise.all(
    ids.flatMap((_, i) => {
      const loaded = parseProject(rows.slice(4 * i, 4 * i + 4))
      return loaded && loaded.project.members.some((m) => m.userId === userId) ? [toRemote(kv, loaded.project, loaded.touched)] : []
    }),
  )
  return remote.sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Shares a local project: the caller becomes its owner. Sharing it again is a no-op for the owner. */
export async function createProject(kv: KV, user: PublicUser, input: { id: string; name: string }): Promise<RemoteProject> {
  const existing = await loadProject(kv, input.id)
  if (existing) {
    if (existing.project.ownerId !== user.id && !existing.project.members.some((m) => m.userId === user.id)) throw new HttpError(409, 'Este projeto já foi compartilhado por outra pessoa.')
    return toRemote(kv, existing.project, existing.touched)
  }
  const now = Date.now()
  const meta: StoredMeta = { id: input.id, ownerId: user.id, createdAt: now }
  // NX: two tabs sharing the same project at once create it only once.
  const created = await one(kv, ['SET', k.project(meta.id), JSON.stringify(meta), 'NX'])
  if (created !== 'OK') return createProject(kv, user, input)
  await kv.pipeline([
    ['SET', k.name(meta.id), input.name],
    ['HSET', k.members(meta.id), user.id, `producer:${now}`],
    ['SADD', k.userProjects(user.id), meta.id],
  ])
  return toRemote(kv, { ...meta, name: input.name, members: [{ userId: user.id, role: 'producer' }] })
}

function assertManager(project: StoredProject, userId: string) {
  const role = project.members.find((m) => m.userId === userId)?.role
  if (role !== 'producer') throw new HttpError(403, 'Só quem tem papel de Produção gerencia as pessoas do projeto.')
}

export async function setRole(kv: KV, user: PublicUser, input: { projectId: string; userId: string; role: ShareRole }) {
  const { project } = await access(kv, input.projectId, user.id)
  assertManager(project, user.id)
  if (input.userId === project.ownerId) throw new HttpError(400, 'O papel de quem criou o projeto não muda.')
  const current = await one<string | null>(kv, ['HGET', k.members(project.id), input.userId])
  if (!current) throw new HttpError(404, 'Pessoa não encontrada no projeto.')
  await one(kv, ['HSET', k.members(project.id), input.userId, `${input.role}:${current.split(':')[1]}`])
  const loaded = await loadProject(kv, project.id)
  return toRemote(kv, loaded!.project, loaded!.touched)
}

/** Removes a member. Anyone may remove themself (leave); producers may remove others, never the owner. */
export async function removeMember(kv: KV, user: PublicUser, input: { projectId: string; userId: string }) {
  const { project } = await access(kv, input.projectId, user.id)
  if (input.userId !== user.id) assertManager(project, user.id)
  if (input.userId === project.ownerId) throw new HttpError(400, 'Quem criou o projeto não pode sair dele.')
  await kv.pipeline([
    ['HDEL', k.members(project.id), input.userId],
    ['SREM', k.userProjects(input.userId), project.id],
  ])
  const loaded = await loadProject(kv, project.id)
  return toRemote(kv, loaded!.project, loaded!.touched)
}

// ---------------------------------------------------------------- invites

async function toInvite(kv: KV, inv: StoredInvite): Promise<Invite | null> {
  const [loaded, by] = await Promise.all([loadProject(kv, inv.projectId), getUser(kv, inv.invitedBy)])
  if (!loaded) return null
  return { token: inv.token, projectId: inv.projectId, projectName: loaded.project.name, email: inv.email, role: inv.role, invitedByName: by?.name ?? 'Alguém', createdAt: inv.createdAt }
}

export async function createInvite(kv: KV, user: PublicUser, input: { projectId: string; email: string; role: ShareRole }): Promise<Invite> {
  const { project } = await access(kv, input.projectId, user.id)
  assertManager(project, user.id)
  if (input.email === user.email) throw new HttpError(400, 'Você já participa deste projeto.')
  const users = await getUsers(
    kv,
    project.members.map((m) => m.userId),
  )
  if ([...users.values()].some((u) => u.email === input.email)) throw new HttpError(400, 'Essa pessoa já participa do projeto.')
  const inv: StoredInvite = { token: randomToken(18), projectId: project.id, email: input.email, role: input.role, invitedBy: user.id, createdAt: Date.now() }
  await kv.pipeline([
    ['SET', k.invite(inv.token), JSON.stringify(inv), 'EX', INVITE_DAYS * 86400],
    ['SADD', k.emailInvites(inv.email), inv.token],
    ['EXPIRE', k.emailInvites(inv.email), INVITE_DAYS * 86400],
  ])
  return (await toInvite(kv, inv))!
}

/** Pending invites sent to the user's email. Expired ones drop out of the list. */
export async function listInvites(kv: KV, user: PublicUser): Promise<Invite[]> {
  // An unverified password signup must not reveal somebody else's secret invitation links.
  // These accounts join through the link delivered by the owner/email instead.
  if (!(await hasVerifiedEmail(kv, user.id))) return []
  const tokens = await one<string[]>(kv, ['SMEMBERS', k.emailInvites(user.email)])
  if (!tokens.length) return []
  const rows = await kv.pipeline(tokens.map((t) => ['GET', k.invite(t)]))
  const stale = tokens.filter((_, i) => !rows[i])
  if (stale.length) await one(kv, ['SREM', k.emailInvites(user.email), ...stale])
  const invites = await Promise.all(rows.map((raw) => parseJSON<StoredInvite>(raw)).flatMap((inv) => (inv ? [toInvite(kv, inv)] : [])))
  return invites.filter((i): i is Invite => !!i).sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * Invites belong to the addressed email; forwarding a link must not grant another account access.
 * HSETNX never lowers an existing role.
 */
export async function acceptInvite(kv: KV, user: PublicUser, token: string): Promise<RemoteProject> {
  const inv = parseJSON<StoredInvite>(await one(kv, ['GET', k.invite(token)]))
  if (!inv) throw new HttpError(404, 'Este convite expirou ou já foi usado.')
  if (inv.email !== user.email) throw new HttpError(403, 'Entre com o e-mail que recebeu este convite.')
  if (!(await loadProject(kv, inv.projectId))) throw new HttpError(404, 'O projeto deste convite não existe mais.')
  const issuer = await access(kv, inv.projectId, inv.invitedBy)
  assertManager(issuer.project, inv.invitedBy)
  await kv.pipeline([
    ['HSETNX', k.members(inv.projectId), user.id, `${inv.role}:${Date.now()}`],
    ['SADD', k.userProjects(user.id), inv.projectId],
    ['DEL', k.invite(token)],
    ['SREM', k.emailInvites(inv.email), token],
  ])
  const loaded = await loadProject(kv, inv.projectId)
  return toRemote(kv, loaded!.project, loaded!.touched)
}

export async function declineInvite(kv: KV, user: PublicUser, token: string) {
  const inv = parseJSON<StoredInvite>(await one(kv, ['GET', k.invite(token)]))
  if (!inv) return
  if (inv.email !== user.email) throw new HttpError(403, 'Este convite é de outra pessoa.')
  await kv.pipeline([
    ['DEL', k.invite(token)],
    ['SREM', k.emailInvites(inv.email), token],
  ])
}

// ---------------------------------------------------------------- sync

interface StoredRecord {
  seq: number
  data: Record<string, unknown> | null
}

/**
 * Checks that a pushed record belongs where it claims. Without this a member could plant a record
 * whose projectId points at another project in a teammate's browser.
 */
function validRecord(projectId: string, c: Change): boolean {
  if (!c.data) return true
  if (c.data.id !== c.id) return false
  return c.table === 'projects' ? c.id === projectId : c.data.projectId === projectId
}

/**
 * Writes changes with the next sequence numbers. Numbers are taken before the records land, so a
 * concurrent pull could see a later push finished while this one is still writing, move its cursor
 * past this push's numbers and never get them. To prevent that, the push first leaves a marker
 * scored with a number no higher than any it will get; pulls stop below the lowest marker.
 */
export async function push(kv: KV, user: PublicUser, projectId: string, changes: Change[]): Promise<{ seq: number; rejected: string[] }> {
  const { project, role } = await access(kv, projectId, user.id)
  const rejected: string[] = []
  const previous = role === 'client' ? await kv.pipeline(changes.map((c) => ['HGET', k.records(projectId), `${c.table}:${c.id}`])) : []
  const accepted = changes.filter((c, index) => {
    const owns = (data: Record<string, unknown> | null | undefined) => !!data && (data.authorId === user.id || (c.table === 'messages' && data.authorId === 'ai' && data.askedBy === user.id))
    const prior = parseJSON<StoredRecord>(previous[index])
    const ownsComment = role !== 'client' || ((!prior?.data || owns(prior.data)) && (c.data ? owns(c.data) : owns(prior?.data)))
    const ok = canWrite(role, c.table) && validRecord(projectId, c) && ownsComment && !(c.table === 'projects' && !c.data)
    if (!ok) rejected.push(`${c.table}:${c.id}`)
    return ok
  })
  if (!accepted.length) return { seq: Number((await one(kv, ['GET', k.seq(projectId)])) ?? 0), rejected }

  const before = Number((await one(kv, ['GET', k.seq(projectId)])) ?? 0)
  const marker = `${before + 1}:${Date.now()}:${randomToken(6)}`
  const [, last] = (await kv.pipeline([
    ['ZADD', k.pending(projectId), before + 1, marker],
    ['INCRBY', k.seq(projectId), accepted.length],
  ])) as [number, number]
  const first = last - accepted.length + 1
  let rename: string | undefined
  const commands: (string | number)[][] = []
  accepted.forEach((c, i) => {
    let data = c.data
    // Membership lives in the project meta, never in the synced record.
    if (c.table === 'projects' && data) {
      data = { ...data, ownerId: project.ownerId, members: project.members, remote: true, example: false }
      if (typeof data.name === 'string' && data.name.trim() && data.name !== project.name) rename = data.name.slice(0, 120)
    }
    const field = `${c.table}:${c.id}`
    commands.push(['HSET', k.records(projectId), field, JSON.stringify({ seq: first + i, data } satisfies StoredRecord)])
    commands.push(['ZADD', k.log(projectId), first + i, field])
  })
  if (rename) commands.push(['SET', k.name(projectId), rename])
  commands.push(['SET', k.touched(projectId), Date.now()])
  commands.push(['ZREM', k.pending(projectId), marker])
  try {
    await kv.pipeline(commands)
  } catch (e) {
    // The writes failed: the marker must not hold pulls back for a minute.
    await one(kv, ['ZREM', k.pending(projectId), marker]).catch(() => undefined)
    throw e
  }
  return { seq: last, rejected }
}

export async function pull(kv: KV, user: PublicUser, projectId: string, since: number) {
  const { project, touched } = await access(kv, projectId, user.id)
  const now = Date.now()
  // The counter is read before the markers: a push that starts in between only takes numbers above it.
  const [seqRaw, pending, presence] = (await kv.pipeline([
    ['GET', k.seq(projectId)],
    ['ZRANGEBYSCORE', k.pending(projectId), '-inf', '+inf', 'WITHSCORES'],
    ['HGETALL', k.presence(projectId)],
    ['HSET', k.presence(projectId), user.id, now],
  ])) as [string | null, string[], string[], number]

  let cap = Number(seqRaw ?? 0)
  const crashed: string[] = []
  for (let i = 0; i < pending.length; i += 2) {
    const startedAt = Number(pending[i].split(':')[1])
    if (now - startedAt > PENDING_MS) crashed.push(pending[i])
    else cap = Math.min(cap, Number(pending[i + 1]) - 1)
  }
  if (crashed.length) await one(kv, ['ZREM', k.pending(projectId), ...crashed])

  const changes: Change[] = []
  let seq = since
  let more = false
  if (cap > since) {
    const scored = await one<string[]>(kv, ['ZRANGEBYSCORE', k.log(projectId), `(${since}`, cap, 'WITHSCORES', 'LIMIT', 0, PULL_LIMIT + 1])
    const fields: string[] = []
    const scores: number[] = []
    for (let i = 0; i < scored.length; i += 2) {
      fields.push(scored[i])
      scores.push(Number(scored[i + 1]))
    }
    more = fields.length > PULL_LIMIT
    const page = fields.slice(0, PULL_LIMIT)
    const rows = page.length ? await one<(string | null)[]>(kv, ['HMGET', k.records(projectId), ...page]) : []
    page.forEach((field, i) => {
      const rec = parseJSON<StoredRecord>(rows[i])
      if (!rec) return
      const at = field.indexOf(':')
      changes.push({ table: field.slice(0, at) as Change['table'], id: field.slice(at + 1), data: rec.data })
    })
    // A full page stops at its last number; otherwise everything up to the cap was seen.
    seq = more ? scores[PULL_LIMIT - 1] : cap
  }

  const online: string[] = []
  for (let i = 0; i < presence.length; i += 2) if (now - Number(presence[i + 1]) < ONLINE_MS && project.members.some((m) => m.userId === presence[i])) online.push(presence[i])
  return { seq, changes, more, project: await toRemote(kv, project, touched), online }
}

// ---------------------------------------------------------------- blobs (images and file contents)

function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

/** Images and file contents. Only roles that edit may upload: a client could otherwise fill the store. */
export async function putBlob(kv: KV, user: PublicUser, projectId: string, id: string, mime: string, bytes: Uint8Array) {
  const { role } = await access(kv, projectId, user.id)
  if (!canWrite(role, 'files')) throw new HttpError(403, 'Seu papel neste projeto não permite enviar arquivos.')
  if (bytes.byteLength > MAX_BLOB_BYTES) throw new HttpError(413, 'Arquivo maior que 3 MB.')
  // NX: blobs are content for an id that never changes, so the first upload stays.
  await one(kv, ['SET', k.blob(projectId, id), JSON.stringify({ mime, data: toBase64(bytes) }), 'NX'])
}

export async function getBlob(kv: KV, user: PublicUser, projectId: string, id: string): Promise<{ mime: string; bytes: Uint8Array } | null> {
  await access(kv, projectId, user.id)
  const blob = parseJSON<{ mime: string; data: string }>(await one(kv, ['GET', k.blob(projectId, id)]))
  if (!blob) return null
  const bin = atob(blob.data)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return { mime: blob.mime, bytes }
}
