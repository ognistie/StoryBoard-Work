import { pushRequest } from '../src/lib/collab/contract.js'
import { requireUser } from '../src/server/auth.js'
import { endpoint, HttpError, json, readJSON } from '../src/server/http.js'
import { requireKV } from '../src/server/kv.js'
import { pull, push } from '../src/server/projects.js'

/** Changes of a shared project after `since`, plus its members and who is online. */
export const GET = endpoint(async (request) => {
  const kv = requireKV()
  const user = await requireUser(kv, request)
  const url = new URL(request.url)
  const projectId = url.searchParams.get('project') ?? ''
  const since = Number(url.searchParams.get('since') ?? 0)
  if (!projectId || !Number.isFinite(since) || since < 0) throw new HttpError(400, 'Parâmetros inválidos.')
  return json(await pull(kv, user, projectId, since), { headers: { 'Cache-Control': 'no-store' } })
})

export const POST = endpoint(async (request) => {
  const kv = requireKV()
  const user = await requireUser(kv, request)
  const body = await readJSON(request, pushRequest)
  return json(await push(kv, user, body.projectId, body.changes))
})
