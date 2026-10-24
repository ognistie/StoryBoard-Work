import type { Table } from 'dexie'
import { create } from 'zustand'
import { db } from '../db'
import { rememberPeople } from '../session'
import type { Project } from '../types'
import { api, ApiError } from './api'
import { NOT_MEMBER, projectResponse, PUSH_BATCH, pullResponse, pushResponse, SYNC_TABLES, type Change, type RemoteProject, type SyncTable } from './contract'

/**
 * Keeps shared projects in sync with the server.
 *
 * Push: every record of the project is hashed and compared with the hash agreed at the last
 * sync (db.syncState). What differs goes up; what disappeared goes up as a deletion. Images and
 * file contents go first, through api/blob, so a teammate never pulls a frame without its picture.
 * Pull: the server's changes after the last sequence number come down and are written locally,
 * except records changed here and not pushed yet (they win on the next push: last write wins).
 *
 * A cycle is push, then pull. It runs after local changes (debounced), every few seconds while
 * the tab is visible, and when the tab comes back.
 */

type Rec = Record<string, unknown> & { id: string }

const POLL_MS = 4000
const DEBOUNCE_MS = 500

const key = (table: string, id: string) => `${table}:${id}`

/**
 * cyrb53 over the JSON, plus its length: cheap, 53 bits, and only compared with itself.
 * A collision would hide one edit from the push, so 32 bits would be too few for long projects.
 */
export function hashRecord(data: unknown): string {
  const s = JSON.stringify(data)
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return `${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)}.${s.length}`
}

const table = (name: SyncTable) => db.table(name) as Table<Rec, string>

/** Every synced record of a project, as it should look on the server. */
export async function collect(projectId: string): Promise<Map<string, { table: SyncTable; data: Rec }>> {
  const out = new Map<string, { table: SyncTable; data: Rec }>()
  const add = (t: SyncTable, data: Rec) => out.set(key(t, data.id), { table: t, data })
  const project = await db.projects.get(projectId)
  if (!project) return out
  add('projects', project as unknown as Rec)
  for (const t of SYNC_TABLES) {
    if (t === 'projects' || t === 'docVersions') continue
    for (const r of await table(t).where('projectId').equals(projectId).toArray()) add(t, r)
  }
  const docIds = [...out.values()].filter((r) => r.table === 'docs').map((r) => r.data.id)
  if (docIds.length)
    // Older doc versions do not carry their project; the server needs it to check where a record belongs.
    for (const v of await db.docVersions.where('docId').anyOf(docIds).toArray()) add('docVersions', { ...v, projectId } as unknown as Rec)
  return out
}

/** Images and file contents the project's records point to. */
function binariesOf(records: Iterable<{ table: SyncTable; data: Rec }>) {
  const images = new Set<string>()
  const blobs = new Set<string>()
  for (const { table: t, data } of records) {
    if (t === 'frames' || t === 'assets') data.imageId && images.add(data.imageId as string)
    if (t === 'revisions') {
      const snap = data.snapshot as { imageId?: string } | undefined
      if (snap?.imageId) images.add(snap.imageId)
    }
    if (t === 'projects' && data.coverImageId) images.add(data.coverImageId as string)
    if (t === 'fileVersions') blobs.add(data.blobId as string)
  }
  return { images, blobs }
}

// ---------------------------------------------------------------- status for the UI

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'offline' | 'error'
  error?: string
  /** Members seen in the last 30 seconds. */
  online: string[]
  lastSyncedAt?: number
}

export const useSync = create<{ byProject: Record<string, SyncStatus> }>(() => ({ byProject: {} }))

function setStatus(projectId: string, patch: Partial<SyncStatus>) {
  useSync.setState((s) => ({ byProject: { ...s.byProject, [projectId]: { ...(s.byProject[projectId] ?? { state: 'idle', online: [] }), ...patch } } }))
}

// ---------------------------------------------------------------- push

async function uploadBinary(projectId: string, id: string, blob: Blob) {
  const res = await fetch(`/api/blob?project=${encodeURIComponent(projectId)}&id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    body: blob,
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new ApiError(res.status, body.error ?? `Falha ao enviar arquivo (HTTP ${res.status}).`)
  }
}

/**
 * Uploads one image or file. A refusal that retrying cannot fix (too big, role without upload)
 * is recorded and skipped, so one bad file never stops the rest of the project from syncing.
 */
async function uploadOnce(projectId: string, table: 'images' | 'blobs', id: string, blob: Blob) {
  try {
    await uploadBinary(projectId, id, blob)
    await db.syncState.put({ key: key(table, id), projectId, hash: 'up' })
  } catch (e) {
    const status = (e as ApiError).status
    if (status !== 413 && status !== 403) throw e
    await db.syncState.put({ key: key(table, id), projectId, hash: 'refused' })
    setStatus(projectId, { error: (e as Error).message })
  }
}

export async function push(projectId: string) {
  const records = await collect(projectId)
  if (!records.size) return
  const states = new Map((await db.syncState.where('projectId').equals(projectId).toArray()).map((s) => [s.key, s.hash]))

  const { images, blobs } = binariesOf(records.values())
  for (const id of images) {
    if (states.has(key('images', id))) continue
    const img = await db.images.get(id)
    if (img) await uploadOnce(projectId, 'images', id, img.blob)
  }
  for (const id of blobs) {
    if (states.has(key('blobs', id))) continue
    const b = await db.blobs.get(id)
    if (b) await uploadOnce(projectId, 'blobs', id, b.blob)
  }

  const changes: (Change & { hash: string | null })[] = []
  for (const [k, { table: t, data }] of records) {
    const hash = hashRecord(data)
    const agreed = states.get(k)
    // A version the server refused stays refused: it is not sent again until it changes.
    if (agreed !== hash && agreed !== `rejected:${hash}`) changes.push({ table: t, id: data.id, data, hash })
  }
  for (const k of states.keys()) {
    const t = k.slice(0, k.indexOf(':'))
    if (t === 'images' || t === 'blobs' || records.has(k)) continue
    changes.push({ table: t as SyncTable, id: k.slice(t.length + 1), data: null, hash: null })
  }
  // The project record first, so the server knows the name before the rest arrives.
  changes.sort((a, b) => Number(b.table === 'projects') - Number(a.table === 'projects'))

  for (let i = 0; i < changes.length; i += PUSH_BATCH) {
    const batch = changes.slice(i, i + PUSH_BATCH)
    const res = await api('sync', pushResponse, { method: 'POST', json: { projectId, changes: batch.map(({ table: t, id, data }) => ({ table: t, id, data })) } })
    const rejected = new Set(res.rejected)
    await db.transaction('rw', db.syncState, async () => {
      for (const c of batch) {
        const k = key(c.table, c.id)
        // A rejected change is marked as agreed too: retrying would only be rejected again.
        if (c.hash === null) await db.syncState.delete(k)
        else await db.syncState.put({ key: k, projectId, hash: rejected.has(k) ? `rejected:${c.hash}` : c.hash })
      }
    })
  }
}

// ---------------------------------------------------------------- pull

let applying = 0

/** Local member list from the server's, with names cached for the UI. */
async function applyMeta(remote: RemoteProject) {
  rememberPeople(remote.members.map((m) => ({ id: m.userId, name: m.name, email: m.email })))
  const project = await db.projects.get(remote.id)
  if (!project) return
  const members = remote.members.map((m) => ({ userId: m.userId, role: m.role }))
  if (JSON.stringify(project.members) === JSON.stringify(members) && project.ownerId === remote.ownerId && project.remote) return
  const next = { ...project, members, ownerId: remote.ownerId, remote: true, example: false }
  applying++
  try {
    await db.projects.put(next)
    // Agreed with the server already: the server rewrites membership on every push anyway.
    await db.syncState.put({ key: key('projects', project.id), projectId: project.id, hash: hashRecord(next) })
  } finally {
    applying--
  }
}

async function applyChanges(projectId: string, changes: Change[]) {
  const belongs = (t: SyncTable, rec: Record<string, unknown>) => (t === 'projects' ? rec.id === projectId : rec.projectId === projectId)
  applying++
  try {
    await db.transaction('rw', [...SYNC_TABLES.map((t) => db.table(t)), db.syncState], async () => {
      for (const c of changes) {
        const k = key(c.table, c.id)
        const t = table(c.table)
        const existing = await t.get(c.id)
        // An id taken by a record of another project here is never overwritten.
        if (existing && !belongs(c.table, c.table === 'docVersions' ? { ...existing, projectId } : existing)) continue
        const state = await db.syncState.get(k)
        // Changed here and not pushed yet: keep the local version, it goes up next.
        if (existing && state && state.hash !== hashRecord(c.table === 'docVersions' ? { ...existing, projectId } : existing)) continue
        // Deleted here and not pushed yet: the deletion goes up next, so the record must not come back.
        if (!existing && state && c.data) continue
        if (!c.data) {
          if (existing) await t.delete(c.id)
          await db.syncState.delete(k)
          continue
        }
        if (!belongs(c.table, c.data)) continue
        await t.put(c.data as Rec)
        await db.syncState.put({ key: k, projectId, hash: hashRecord(c.data) })
      }
    })
  } finally {
    applying--
  }
}

/** Images the server did not have yet, and when we last asked: retried after a minute, not every poll. */
const missingImages = new Map<string, number>()
const RETRY_MISSING_MS = 60_000

/** Downloads the images that pulled records point to and this browser does not have. */
async function fetchMissingImages(projectId: string) {
  const { images } = binariesOf((await collect(projectId)).values())
  for (const id of images) {
    if (Date.now() - (missingImages.get(id) ?? 0) < RETRY_MISSING_MS) continue
    if (await db.images.get(id)) continue
    const res = await fetch(`/api/blob?project=${encodeURIComponent(projectId)}&id=${encodeURIComponent(id)}`, { credentials: 'same-origin' })
    if (!res.ok) {
      missingImages.set(id, Date.now())
      continue
    }
    missingImages.delete(id)
    const blob = await res.blob()
    const bitmap = await createImageBitmap(blob).catch(() => null)
    applying++
    try {
      await db.images.put({ id, blob, width: bitmap?.width ?? 0, height: bitmap?.height ?? 0, createdAt: Date.now() })
      await db.syncState.put({ key: key('images', id), projectId, hash: 'up' })
    } finally {
      applying--
    }
    bitmap?.close()
  }
}

/** Downloads one file's bytes on demand (the folder does not prefetch them). */
export async function fetchBlob(projectId: string, id: string): Promise<Blob | undefined> {
  const local = await db.blobs.get(id)
  if (local) return local.blob
  const res = await fetch(`/api/blob?project=${encodeURIComponent(projectId)}&id=${encodeURIComponent(id)}`, { credentials: 'same-origin' })
  if (!res.ok) return undefined
  const blob = await res.blob()
  applying++
  try {
    await db.blobs.put({ id, blob, createdAt: Date.now() })
    await db.syncState.put({ key: key('blobs', id), projectId, hash: 'up' })
  } finally {
    applying--
  }
  return blob
}

export async function pull(projectId: string) {
  for (;;) {
    const cursor = (await db.syncCursors.get(projectId))?.seq ?? 0
    const res = await api(`sync?project=${encodeURIComponent(projectId)}&since=${cursor}`, pullResponse)
    if (!(await db.projects.get(projectId))) {
      // First pull of a project shared with us: the project record arrives in the changes.
      const rec = res.changes.find((c) => c.table === 'projects' && c.data)
      if (!rec) {
        const now = Date.now()
        applying++
        await db.projects
          .put({ id: projectId, name: res.project.name, client: '', producer: '', ownerId: res.project.ownerId, status: 'pre', style: 'pencil', styleNotes: '', members: [], aspect: '9:16', remote: true, createdAt: now, updatedAt: now } satisfies Project)
          .finally(() => applying--)
      }
    }
    await applyChanges(projectId, res.changes)
    await applyMeta(res.project)
    await db.syncCursors.put({ projectId, seq: res.seq })
    setStatus(projectId, { online: res.online })
    if (!res.more) break
  }
  await fetchMissingImages(projectId)
}

/** Removes a shared project from this browser, after its owner removed us or we left it. */
export async function forgetProject(projectId: string) {
  applying++
  try {
    await db.transaction('rw', [...SYNC_TABLES.map((t) => db.table(t)), db.syncState, db.syncCursors], async () => {
      const docIds = (await db.docs.where('projectId').equals(projectId).primaryKeys()) as string[]
      if (docIds.length) await db.docVersions.where('docId').anyOf(docIds).delete()
      for (const t of SYNC_TABLES) if (t !== 'projects' && t !== 'docVersions') await table(t).where('projectId').equals(projectId).delete()
      await db.projects.delete(projectId)
      await db.syncState.where('projectId').equals(projectId).delete()
      await db.syncCursors.delete(projectId)
    })
  } finally {
    applying--
  }
}

// ---------------------------------------------------------------- the loop

const running = new Map<string, Promise<void>>()
const queued = new Set<string>()

/** One push-then-pull for a project. Concurrent calls wait for the running one and run once more after it. */
export function syncNow(projectId: string): Promise<void> {
  const current = running.get(projectId)
  if (current) {
    queued.add(projectId)
    return current
  }
  const run = (async () => {
    setStatus(projectId, { state: 'syncing' })
    try {
      await push(projectId)
      await pull(projectId)
      setStatus(projectId, { state: 'idle', error: undefined, lastSyncedAt: Date.now() })
    } catch (e) {
      const err = e as ApiError
      // Only the sync route answers 404 for a project we are no longer in; other errors keep the local copy.
      if (err.status === 404 && err.message === NOT_MEMBER) {
        await forgetProject(projectId)
        setStatus(projectId, { state: 'error', error: 'Você não participa mais deste projeto.' })
      } else setStatus(projectId, { state: err.status === 0 ? 'offline' : 'error', error: err.message })
    } finally {
      running.delete(projectId)
      if (queued.delete(projectId)) void syncNow(projectId)
    }
  })()
  running.set(projectId, run)
  return run
}

const watched = new Map<string, number>()
let timer: ReturnType<typeof setTimeout> | undefined
let hooked = false

function schedule(delay: number) {
  clearTimeout(timer)
  timer = setTimeout(tick, delay)
}

function tick() {
  if (document.visibilityState === 'visible') for (const id of watched.keys()) void syncNow(id)
  schedule(POLL_MS)
}

/** Any local write to a synced table schedules a sync of the watched projects. */
function hookTables() {
  if (hooked) return
  hooked = true
  const touch = () => {
    if (!applying && watched.size) schedule(DEBOUNCE_MS)
  }
  for (const t of [...SYNC_TABLES, 'images', 'blobs'] as const) {
    const tbl = db.table(t)
    tbl.hook('creating', touch)
    tbl.hook('updating', touch)
    tbl.hook('deleting', touch)
  }
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && watched.size && schedule(0))
  window.addEventListener('online', () => watched.size && schedule(0))
}

/** Keeps a shared project in sync while something on screen shows it. Returns the stop function. */
export function watchProject(projectId: string): () => void {
  hookTables()
  watched.set(projectId, (watched.get(projectId) ?? 0) + 1)
  schedule(0)
  return () => {
    const n = (watched.get(projectId) ?? 1) - 1
    if (n > 0) watched.set(projectId, n)
    else watched.delete(projectId)
    if (!watched.size) clearTimeout(timer)
  }
}

// ---------------------------------------------------------------- sharing

/** Makes a local project shared: the server registers it with us as owner, then everything uploads. */
export async function shareProject(projectId: string) {
  const project = await db.projects.get(projectId)
  if (!project) throw new Error('Projeto não encontrado.')
  const { project: remote } = await api('projects', projectResponse, { method: 'POST', json: { action: 'create', id: project.id, name: project.name } })
  await db.projects.update(projectId, { remote: true, example: false, ownerId: remote.ownerId, members: remote.members.map((m) => ({ userId: m.userId, role: m.role })) })
  rememberPeople(remote.members.map((m) => ({ id: m.userId, name: m.name, email: m.email })))
  await syncNow(projectId)
}
