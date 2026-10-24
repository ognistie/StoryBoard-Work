import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as authRoute from '../../api/auth'
import * as blobRoute from '../../api/blob'
import * as invitesRoute from '../../api/invites'
import * as projectsRoute from '../../api/projects'
import * as syncRoute from '../../api/sync'
import { signIn } from '../lib/collab/auth'
import { NOT_MEMBER, type PublicUser } from '../lib/collab/contract'
import { collect, hashRecord, pull, push, shareProject, syncNow } from '../lib/collab/sync'
import { db } from '../lib/db'
import { addFile, createFrame, createProject, createScene, putImage, sendMessage } from '../lib/repo'
import { GUEST_ID, roleIn } from '../lib/session'
import { MemoryKV, setKV } from '../server/kv'
import * as server from '../server/projects'
import { signup } from '../server/auth'

// The API routes run in-process: fetch is routed to their handlers, with a cookie jar per "browser".

const ROUTES: Record<string, Record<string, (r: Request) => Response | Promise<Response>>> = {
  auth: authRoute,
  blob: blobRoute,
  invites: invitesRoute,
  projects: projectsRoute,
  sync: syncRoute,
}

let jar = ''
let kv: MemoryKV

async function routedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const url = new URL(String(input), 'http://localhost')
  const name = url.pathname.replace('/api/', '')
  const handler = ROUTES[name]?.[init.method ?? 'GET']
  if (!handler) return new Response('{}', { status: 404 })
  const headers = new Headers(init.headers)
  if (jar) headers.set('cookie', jar)
  const res = await handler(new Request(url, { ...init, headers }))
  const set = res.headers.get('set-cookie')
  if (set) jar = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0]
  return res
}

beforeEach(async () => {
  kv = new MemoryKV()
  setKV(kv)
  jar = ''
  vi.stubGlobal('fetch', routedFetch)
  vi.stubGlobal('document', { visibilityState: 'hidden', addEventListener() {} })
  vi.stubGlobal('createImageBitmap', async () => ({ width: 4, height: 3, close() {} }))
  await Promise.all(db.tables.map((t) => t.clear()))
})

async function localProject(ownerId: string) {
  const projectId = await createProject({ name: 'Payme · Reels', client: 'Payme', producer: '', style: 'pencil', ownerId })
  const sceneId = await createScene(projectId, ownerId, {})
  const imageId = await putImage(new Blob(['png'], { type: 'image/png' }), 4, 3)
  const frameId = await createFrame(projectId, sceneId, ownerId, { title: 'Gancho', imageId })
  return { projectId, sceneId, frameId, imageId }
}

describe('auth', () => {
  it('signs up, keeps the session in an HttpOnly cookie, and logs in again', async () => {
    const user = await signIn({ mode: 'signup', email: 'Ana@Exemplo.com', password: 'segredo123', name: 'Ana' })
    expect(user).toMatchObject({ email: 'ana@exemplo.com', name: 'Ana' })
    expect(jar).toMatch(/^decupa_session=/)
    const me = (await (await routedFetch('/api/auth')).json()) as { user: PublicUser }
    expect(me.user.id).toBe(user!.id)

    jar = ''
    await expect(signIn({ mode: 'login', email: 'ana@exemplo.com', password: 'errada000' })).rejects.toThrow('E-mail ou senha incorretos.')
    await expect(signIn({ mode: 'login', email: 'ana@exemplo.com', password: 'segredo123' })).resolves.toMatchObject({ id: user!.id })
  })

  it('refuses a second account with the same email', async () => {
    await signIn({ mode: 'signup', email: 'ana@exemplo.com', password: 'segredo123', name: 'Ana' })
    jar = ''
    await expect(signIn({ mode: 'signup', email: 'ANA@exemplo.com', password: 'outra1234', name: 'Outra' })).rejects.toThrow(/Já existe uma conta/)
  })

  it('refuses state-changing requests from another site', async () => {
    const res = await routedFetch('/api/auth', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) })
    expect(res.status).toBe(403)
  })

  it('gives projects made as a guest to the account that signs in', async () => {
    const { projectId } = await localProject(GUEST_ID)
    const user = await signIn({ mode: 'signup', email: 'ana@exemplo.com', password: 'segredo123', name: 'Ana' })
    const project = await db.projects.get(projectId)
    expect(roleIn(project, user!.id)).toBe('producer')
    expect(roleIn(project, GUEST_ID)).toBeNull()
  })
})

describe('sharing and sync', () => {
  it('uploads a shared project with its images, and a teammate who accepts the invite pulls it', async () => {
    const ana = (await signIn({ mode: 'signup', email: 'ana@exemplo.com', password: 'segredo123', name: 'Ana' }))!
    const { projectId, imageId } = await localProject(ana.id)
    await sendMessage(projectId, ana.id, 'Bom dia, time!')
    await shareProject(projectId)

    expect((await db.projects.get(projectId))?.remote).toBe(true)
    expect(await server.getBlob(kv, ana, projectId, imageId)).not.toBeNull()

    const res = await routedFetch('/api/invites', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'create', projectId, email: 'bruno@exemplo.com', role: 'editor' }) })
    const { invite, emailed } = (await res.json()) as { invite: { token: string }; emailed: boolean }
    expect(emailed).toBe(false)

    // Bruno, in "another browser": a fresh database and his own cookie.
    await Promise.all(db.tables.map((t) => t.clear()))
    jar = ''
    const bruno = (await signIn({ mode: 'signup', email: 'bruno@exemplo.com', password: 'segredo123', name: 'Bruno' }))!
    const listed = (await (await routedFetch('/api/projects')).json()) as { invites: { token: string }[] }
    expect(listed.invites.map((i) => i.token)).toEqual([invite.token])
    await routedFetch('/api/invites', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'accept', token: invite.token }) })

    await pull(projectId)
    const project = await db.projects.get(projectId)
    expect(project?.name).toBe('Payme · Reels')
    expect(roleIn(project, bruno.id)).toBe('editor')
    expect(await db.frames.where('projectId').equals(projectId).count()).toBe(1)
    expect((await db.messages.where('projectId').equals(projectId).first())?.text).toBe('Bom dia, time!')
    expect(await db.images.get(imageId)).toBeTruthy()
    // Nothing to push right after a pull: the local copy matches what was agreed.
    const states = new Map((await db.syncState.toArray()).map((s) => [s.key, s.hash]))
    for (const [k, r] of await collect(projectId)) expect(states.get(k)).toBe(hashRecord(r.data))
  })

  it('sends edits both ways and keeps local edits that were not pushed yet', async () => {
    const ana = (await signIn({ mode: 'signup', email: 'ana@exemplo.com', password: 'segredo123', name: 'Ana' }))!
    const { projectId, frameId } = await localProject(ana.id)
    await shareProject(projectId)

    // A teammate edits the frame on the server.
    const bruno = await signup(kv, { email: 'bruno@exemplo.com', name: 'Bruno', password: 'segredo123' })
    const inv = await server.createInvite(kv, ana, { projectId, email: bruno.email, role: 'editor' })
    await server.acceptInvite(kv, bruno, inv.token)
    const frame = (await db.frames.get(frameId))!
    await server.push(kv, bruno, projectId, [{ table: 'frames', id: frameId, data: { ...frame, title: 'Gancho do Bruno' } }])

    await syncNow(projectId)
    expect((await db.frames.get(frameId))?.title).toBe('Gancho do Bruno')

    // Ana edits locally; a stale remote version arriving before her push must not overwrite it.
    await db.frames.update(frameId, { title: 'Gancho da Ana' })
    await server.push(kv, bruno, projectId, [{ table: 'frames', id: frameId, data: { ...frame, title: 'Velho' } }])
    await pull(projectId)
    expect((await db.frames.get(frameId))?.title).toBe('Gancho da Ana')
    await push(projectId)
    const { changes } = await server.pull(kv, bruno, projectId, 0)
    expect(changes.find((c) => c.id === frameId)?.data?.title).toBe('Gancho da Ana')
  })

  it('lets a client chat but not edit scenes, and never lets a record claim another project', async () => {
    const ana = await signup(kv, { email: 'ana@exemplo.com', name: 'Ana', password: 'segredo123' })
    const caio = await signup(kv, { email: 'caio@exemplo.com', name: 'Caio', password: 'segredo123' })
    await server.createProject(kv, ana, { id: 'prj_shared', name: 'Compartilhado' })
    const inv = await server.createInvite(kv, ana, { projectId: 'prj_shared', email: caio.email, role: 'client' })
    await server.acceptInvite(kv, caio, inv.token)

    const res = await server.push(kv, caio, 'prj_shared', [
      { table: 'messages', id: 'msg_1', data: { id: 'msg_1', projectId: 'prj_shared', authorId: caio.id, text: 'Oi', createdAt: 1 } },
      { table: 'frames', id: 'frm_1', data: { id: 'frm_1', projectId: 'prj_shared', title: 'x' } },
      { table: 'messages', id: 'msg_2', data: { id: 'msg_2', projectId: 'prj_other', authorId: caio.id, text: 'x', createdAt: 1 } },
    ])
    expect(res.rejected).toEqual(['frames:frm_1', 'messages:msg_2'])

    const outsider = await signup(kv, { email: 'x@exemplo.com', name: 'X', password: 'segredo123' })
    await expect(server.pull(kv, outsider, 'prj_shared', 0)).rejects.toThrow(NOT_MEMBER)
  })

  it('never moves a pull past a push that is still writing', async () => {
    const ana = await signup(kv, { email: 'ana@exemplo.com', name: 'Ana', password: 'segredo123' })
    await server.createProject(kv, ana, { id: 'prj_race', name: 'Corrida' })
    const msg = (id: string) => ({ table: 'messages' as const, id, data: { id, projectId: 'prj_race', authorId: ana.id, text: id, createdAt: 1 } })
    await server.push(kv, ana, 'prj_race', [msg('msg_a')])

    // A slow push took number 2 and has not written yet; a faster one already wrote number 3.
    await kv.pipeline([
      ['ZADD', 'proj:prj_race:pending', 2, `2:${Date.now()}:slow`],
      ['INCRBY', 'proj:prj_race:seq', 1],
    ])
    await server.push(kv, ana, 'prj_race', [msg('msg_c')])
    const first = await server.pull(kv, ana, 'prj_race', 0)
    expect(first.changes.map((c) => c.id)).toEqual(['msg_a'])
    expect(first.seq).toBe(1)

    // The slow push lands: the next pull from the same cursor gets both.
    await kv.pipeline([
      ['HSET', 'proj:prj_race:rec', 'messages:msg_b', JSON.stringify({ seq: 2, data: msg('msg_b').data })],
      ['ZADD', 'proj:prj_race:log', 2, 'messages:msg_b'],
      ['ZREM', 'proj:prj_race:pending', `2:${Date.now()}:slow`],
    ])
    await kv.pipeline([['DEL', 'proj:prj_race:pending']])
    const second = await server.pull(kv, ana, 'prj_race', first.seq)
    expect(second.changes.map((c) => c.id)).toEqual(['msg_b', 'msg_c'])
    expect(second.seq).toBe(3)
  })

  it('keeps an invite accepted while a teammate pushes', async () => {
    const ana = await signup(kv, { email: 'ana@exemplo.com', name: 'Ana', password: 'segredo123' })
    const bruno = await signup(kv, { email: 'bruno@exemplo.com', name: 'Bruno', password: 'segredo123' })
    await server.createProject(kv, ana, { id: 'prj_team', name: 'Time' })
    const inv = await server.createInvite(kv, ana, { projectId: 'prj_team', email: bruno.email, role: 'editor' })
    const pushing = server.push(kv, ana, 'prj_team', [{ table: 'projects', id: 'prj_team', data: { id: 'prj_team', name: 'Time renomeado' } }])
    await server.acceptInvite(kv, bruno, inv.token)
    await pushing
    const [project] = await server.listProjects(kv, bruno.id)
    expect(project.members.map((m) => m.name)).toEqual(['Ana', 'Bruno'])
    expect(project.name).toBe('Time renomeado')
  })

  it('does not resend a change the server refused', async () => {
    const ana = await signup(kv, { email: 'ana@exemplo.com', name: 'Ana', password: 'segredo123' })
    const caio = (await signIn({ mode: 'signup', email: 'caio@exemplo.com', password: 'segredo123', name: 'Caio' }))!
    await server.createProject(kv, ana, { id: 'prj_ro', name: 'Leitura' })
    const inv = await server.createInvite(kv, ana, { projectId: 'prj_ro', email: caio.email, role: 'viewer' })
    await server.acceptInvite(kv, caio, inv.token)
    await pull('prj_ro')
    await db.scenes.add({ id: 'scn_x', projectId: 'prj_ro', number: 1, heading: '', sequence: '', summary: '', timeOfDay: 'day', characters: [], scriptExcerpt: '', order: 0 })
    const posts: string[] = []
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init: RequestInit = {}) => {
      if ((init.method ?? 'GET') === 'POST') posts.push(String(input))
      return routedFetch(input, init)
    })
    await push('prj_ro')
    await push('prj_ro')
    expect(posts).toHaveLength(1)
  })

  it('refuses uploads from roles that cannot edit', async () => {
    const ana = await signup(kv, { email: 'ana@exemplo.com', name: 'Ana', password: 'segredo123' })
    const caio = await signup(kv, { email: 'caio@exemplo.com', name: 'Caio', password: 'segredo123' })
    await server.createProject(kv, ana, { id: 'prj_up', name: 'Upload' })
    const inv = await server.createInvite(kv, ana, { projectId: 'prj_up', email: caio.email, role: 'client' })
    await server.acceptInvite(kv, caio, inv.token)
    await expect(server.putBlob(kv, caio, 'prj_up', 'blob_x', 'image/png', new Uint8Array([1, 2, 3]))).rejects.toThrow(/não permite enviar/)
    await server.putBlob(kv, ana, 'prj_up', 'blob_x', 'image/png', new Uint8Array([1, 2, 3]))
    expect((await server.getBlob(kv, caio, 'prj_up', 'blob_x'))?.bytes).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('keeps every version of a file in the shared folder', async () => {
    const ana = (await signIn({ mode: 'signup', email: 'ana@exemplo.com', password: 'segredo123', name: 'Ana' }))!
    const { projectId } = await localProject(ana.id)
    const fileId = await addFile(projectId, ana.id, { name: 'roteiro.txt', blob: new Blob(['v1'], { type: 'text/plain' }), source: 'upload' })
    expect(await addFile(projectId, ana.id, { name: 'Roteiro.TXT', blob: new Blob(['v2'], { type: 'text/plain' }), source: 'upload' })).toBe(fileId)
    expect((await db.files.get(fileId))?.versionCount).toBe(2)
    await shareProject(projectId)
    const versions = await db.fileVersions.where('fileId').equals(fileId).sortBy('number')
    for (const v of versions) expect(await server.getBlob(kv, ana, projectId, v.blobId)).not.toBeNull()
  })
})
