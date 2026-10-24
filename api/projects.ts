import { projectsRequest } from '../src/lib/collab/contract.js'
import { requireUser } from '../src/server/auth.js'
import { endpoint, json, readJSON } from '../src/server/http.js'
import { requireKV } from '../src/server/kv.js'
import { createProject, listInvites, listProjects, removeMember, setRole } from '../src/server/projects.js'

/** The signed-in user's shared projects and the invites waiting for them. */
export const GET = endpoint(async (request) => {
  const kv = requireKV()
  const user = await requireUser(kv, request)
  const [projects, invites] = await Promise.all([listProjects(kv, user.id), listInvites(kv, user)])
  return json({ projects, invites }, { headers: { 'Cache-Control': 'no-store' } })
})

export const POST = endpoint(async (request) => {
  const kv = requireKV()
  const user = await requireUser(kv, request)
  const body = await readJSON(request, projectsRequest)
  const project =
    body.action === 'create' ? await createProject(kv, user, body) : body.action === 'set-role' ? await setRole(kv, user, body) : await removeMember(kv, user, body)
  return json({ project })
})
