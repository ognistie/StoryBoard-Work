import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../../api/google'
import { googleAccount, login, signup } from '../server/auth'
import { MemoryKV, setKV } from '../server/kv'

let kv: MemoryKV
beforeEach(() => {
  kv = new MemoryKV()
  setKV(kv)
  vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client')
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret')
  vi.stubEnv('GOOGLE_REDIRECT_URI', 'http://localhost/api/google')
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

async function start(returnTo = '#/convite/token_123') {
  const res = await GET(new Request(`http://localhost/api/google?returnTo=${encodeURIComponent(returnTo)}`))
  const target = new URL(res.headers.get('Location')!)
  const cookie = res.headers.get('Set-Cookie')!.split(';')[0]
  return { res, target, cookie, callback: `http://localhost/api/google?code=one-time-code&state=${target.searchParams.get('state')}` }
}

describe('Google authorization code login', () => {
  it('uses PKCE, a browser-bound HttpOnly cookie, and the configured callback', async () => {
    const { res, target } = await start()
    expect(res.status).toBe(302)
    expect(target.origin).toBe('https://accounts.google.com')
    expect(target.searchParams.get('code_challenge_method')).toBe('S256')
    expect(target.searchParams.get('redirect_uri')).toBe('http://localhost/api/google')
    expect(res.headers.get('Set-Cookie')).toContain('HttpOnly')
    expect(target.searchParams.has('client_secret')).toBe(false)
  })

  it('rejects a callback without the browser cookie before contacting Google', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const { callback } = await start()
    expect((await GET(new Request(callback))).status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('creates a session, preserves the invite and prevents callback replay', async () => {
    const { callback, cookie } = await start()
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ access_token: 'opaque-access-token' })).mockResolvedValueOnce(Response.json({ sub: 'google-subject', email: 'ana@example.test', email_verified: true, name: 'Ana' }))
    vi.stubGlobal('fetch', fetch)
    const response = await GET(new Request(callback, { headers: { cookie } }))
    expect(response.headers.get('Location')).toBe('/?auth_result=ok#/convite/token_123')
    expect(response.headers.getSetCookie().some((c) => c.startsWith('decupa_session=') && c.includes('HttpOnly'))).toBe(true)
    expect((await GET(new Request(callback, { headers: { cookie } }))).status).toBe(400)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('refuses an unverified email and does not issue a session', async () => {
    const { callback, cookie } = await start()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ access_token: 'token' })).mockResolvedValueOnce(Response.json({ sub: 'sub', email: 'ana@example.test', email_verified: false })))
    const response = await GET(new Request(callback, { headers: { cookie } }))
    expect(response.headers.get('Location')).toContain('google_failed')
    expect(response.headers.getSetCookie().some((c) => c.startsWith('decupa_session='))).toBe(false)
  })

  it('never silently links an existing password account', async () => {
    await signup(kv, { email: 'ana@example.test', name: 'Ana', password: 'senha123456' })
    await expect(googleAccount(kv, { subject: 'sub', email: 'ana@example.test', name: 'Outra' })).rejects.toMatchObject({ status: 409 })
    await expect(login(kv, { email: 'ana@example.test', password: 'senha123456' })).resolves.toMatchObject({ name: 'Ana' })
  })

  it('returns the same identity for repeat Google logins; password cannot log in to it', async () => {
    const input = { subject: 'sub', email: 'ana@example.test', name: 'Ana' }
    const user = await googleAccount(kv, input)
    expect((await googleAccount(kv, input)).id).toBe(user.id)
    await expect(login(kv, { email: input.email, password: 'anything' })).rejects.toMatchObject({ status: 401 })
  })

  it('rejects an external return URL', async () => {
    const { target, cookie } = await start('https://evil.example/')
    const response = await GET(new Request(`http://localhost/api/google?error=access_denied&state=${target.searchParams.get('state')}`, { headers: { cookie } }))
    expect(response.headers.get('Location')).toBe('/?auth_result=google_cancelled#/')
  })

  it('reports missing Google configuration explicitly', async () => {
    vi.stubEnv('GOOGLE_CLIENT_SECRET', '')
    expect((await GET(new Request('http://localhost/api/google'))).status).toBe(503)
  })
})
