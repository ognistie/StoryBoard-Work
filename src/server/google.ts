import { z } from 'zod'
import { createSession, googleAccount } from './auth.js'
import { clientIp, HttpError, randomToken, rateLimit, readCookie, safeEqual, sessionCookie, sha256 } from './http.js'
import { one, requireKV } from './kv.js'

const STATE_COOKIE = 'decupa_google_state'
export const googleEnabled = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
const profileSchema = z.object({ sub: z.string().min(1).max(255), email: z.email(), email_verified: z.literal(true), name: z.string().trim().min(1).max(200).optional() })
const stateSchema = z.object({ verifier: z.string(), redirect: z.string().url(), returnTo: z.string() })

function stateCookie(request: Request, state: string | null) {
  return sessionCookie(request, state).replace('decupa_session=', `${STATE_COOKIE}=`).replace(/Max-Age=\d+/, `Max-Age=${state ? 600 : 0}`)
}

/** Authorization-code flow with PKCE and a single-use, browser-bound state. */
export async function googleLogin(request: Request): Promise<Response> {
  const kv = requireKV()
  if (!googleEnabled()) throw new HttpError(503, 'Login Google ainda não configurado. Entre com e-mail e senha.')
  const url = new URL(request.url)
  const redirect = process.env.GOOGLE_REDIRECT_URI || `${url.origin}/api/google`
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  if (!code && !error) {
    await rateLimit(`google:${clientIp(request)}`, 20, 600, kv)
    const state = randomToken()
    const verifier = randomToken(48)
    const candidate = url.searchParams.get('returnTo') || '#/'
    const returnTo = /^#\/(?:p|convite)\/[A-Za-z0-9_-]+$/.test(candidate) ? candidate : '#/'
    await one(kv, ['SET', `google-state:${await sha256(state)}`, JSON.stringify({ verifier, redirect, returnTo }), 'EX', 600])
    const target = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    target.search = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: redirect, response_type: 'code', scope: 'openid email profile', state, code_challenge: await sha256(verifier), code_challenge_method: 'S256', prompt: 'select_account' }).toString()
    return new Response(null, { status: 302, headers: { Location: target.href, 'Set-Cookie': stateCookie(request, state), 'Cache-Control': 'no-store' } })
  }
  const state = url.searchParams.get('state') || ''
  const cookie = readCookie(request, STATE_COOKIE)
  if (!cookie || !state || state.length > 100 || !safeEqual(cookie, state)) throw new HttpError(400, 'Login expirado ou inválido. Volte ao Decupa e tente novamente.')
  const key = `google-state:${await sha256(state)}`
  const raw = await one<string | null>(kv, ['GET', key])
  if (!raw || await one(kv, ['SET', `${key}:used`, '1', 'NX', 'EX', 600]) !== 'OK') throw new HttpError(400, 'Este login já foi usado ou expirou.')
  await one(kv, ['DEL', key])
  const saved = stateSchema.parse(JSON.parse(raw))
  const headers = new Headers({ 'Cache-Control': 'no-store' })
  headers.append('Set-Cookie', stateCookie(request, null))
  let result = 'google_failed'
  if (!error && code) {
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(15000),
        body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: saved.redirect, grant_type: 'authorization_code', code_verifier: saved.verifier }),
      })
      if (!tokenRes.ok) throw new Error('Google não autorizou o login.')
      const tokens = z.object({ access_token: z.string().min(1) }).parse(await tokenRes.json())
      // Identity comes from Google's authenticated userinfo endpoint, never an unsigned JWT.
      const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` }, signal: AbortSignal.timeout(15000) })
      if (!profileRes.ok) throw new Error('Google não confirmou o perfil.')
      const profile = profileSchema.parse(await profileRes.json())
      const user = await googleAccount(kv, { subject: profile.sub, email: profile.email.toLowerCase(), name: (profile.name || profile.email.split('@')[0]).slice(0, 60) })
      headers.append('Set-Cookie', sessionCookie(request, await createSession(kv, user.id)))
      result = 'ok'
    } catch (e) {
      if (e instanceof HttpError && e.status === 409) result = 'google_existing_account'
      // Do not log tokens, codes or the provider's response.
      console.error('[google-login]', e instanceof HttpError ? e.status : 'provider-failed')
    }
  } else result = 'google_cancelled'
  headers.set('Location', `/?auth_result=${result}${saved.returnTo}`)
  return new Response(null, { status: 302, headers })
}
