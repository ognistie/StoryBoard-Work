import { authRequest, type AuthState } from '../src/lib/collab/contract.js'
import { createSession, currentUser, endSession, login, signup } from '../src/server/auth.js'
import { clientIp, endpoint, json, rateLimit, readJSON, sessionCookie } from '../src/server/http.js'
import { googleEnabled } from '../src/server/google.js'
import { getKV, requireKV } from '../src/server/kv.js'

/** Who is signed in, and whether this deployment has collaboration (a store) at all. */
export const GET = endpoint(async (request) => {
  const kv = getKV()
  const state: AuthState = { user: kv ? await currentUser(kv, request) : null, collab: !!kv, google: !!kv && googleEnabled() }
  return json(state, { headers: { 'Cache-Control': 'no-store' } })
})

export const POST = endpoint(async (request) => {
  const kv = requireKV()
  const body = await readJSON(request, authRequest)
  if (body.action === 'logout') {
    await endSession(kv, request)
    return json({ user: null, collab: true, google: googleEnabled() } satisfies AuthState, { headers: { 'Set-Cookie': sessionCookie(request, null) } })
  }
  // Slows down password guessing per network and per address.
  await rateLimit(`auth-ip:${clientIp(request)}`, 30, 600, kv)
  if (body.action === 'login') await rateLimit(`auth-email:${body.email}`, 10, 900, kv)
  const user = body.action === 'signup' ? await signup(kv, body) : await login(kv, body)
  const token = await createSession(kv, user.id)
  return json({ user, collab: true, google: googleEnabled() } satisfies AuthState, { headers: { 'Set-Cookie': sessionCookie(request, token) } })
})
