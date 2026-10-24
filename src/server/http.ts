import { z } from 'zod'
import { getKV, KVUnavailableError, one, type KV } from './kv.js'

// Server-only helpers shared by the functions in api/.

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export const json = (body: unknown, init: ResponseInit = {}) => Response.json(body, init)

/**
 * Browsers always send Origin on cross-site requests. A state-changing request whose Origin is
 * another site is refused, so a page elsewhere cannot spend the team's OpenAI credits or act
 * with a member's session cookie. Requests without Origin (same-origin GET, curl) pass.
 */
export function assertSameOrigin(request: Request) {
  if (request.method === 'GET' || request.method === 'HEAD') return
  const origin = request.headers.get('origin')
  if (!origin) return
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host
  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    throw new HttpError(403, 'Origem inválida.')
  }
  if (originHost !== host) throw new HttpError(403, 'Pedido de outro site recusado.')
}

export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local'
}

/**
 * Fixed-window rate limit. Without a store (production misconfigured) it lets the request through:
 * the limit protects the budget, it is not an authorization check.
 */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number, kv: KV | null = getKV()) {
  if (!kv) return
  const key = `rl:${bucket}:${Math.floor(Date.now() / 1000 / windowSeconds)}`
  const [count] = (await kv.pipeline([
    ['INCR', key],
    ['EXPIRE', key, windowSeconds],
  ])) as [number]
  if (count > limit) throw new HttpError(429, 'Muitos pedidos seguidos. Espere um pouco e tente de novo.')
}

export async function readJSON<Schema extends z.ZodType>(request: Request, schema: Schema): Promise<z.infer<Schema>> {
  const parsed = schema.safeParse(await request.json().catch(() => undefined))
  if (!parsed.success) throw new HttpError(400, z.prettifyError(parsed.error))
  return parsed.data
}

/** Wraps a handler: same-origin check, and errors turned into JSON with the right status. */
export function endpoint(run: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      assertSameOrigin(request)
      return await run(request)
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, { status: e.status })
      if (e instanceof KVUnavailableError) return json({ error: e.message }, { status: 503 })
      console.error('[api]', e)
      return json({ error: 'Erro interno no servidor.' }, { status: 500 })
    }
  }
}

// ---------------------------------------------------------------- cookies

export const SESSION_COOKIE = 'decupa_session'
export const SESSION_DAYS = 30

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie') ?? ''
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k !== name) continue
    try {
      return decodeURIComponent(v.join('='))
    } catch {
      return undefined
    }
  }
  return undefined
}

export function sessionCookie(request: Request, token: string | null): string {
  const secure = new URL(request.url).protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https'
  const attrs = ['Path=/', 'HttpOnly', 'SameSite=Lax', secure && 'Secure', token ? `Max-Age=${SESSION_DAYS * 86400}` : 'Max-Age=0'].filter(Boolean)
  return `${SESSION_COOKIE}=${token ?? ''}; ${attrs.join('; ')}`
}

// ---------------------------------------------------------------- crypto (Web Crypto: same code on Node and in tests)

const enc = new TextEncoder()

export function toBase64Url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function randomToken(bytes = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)))
}

export async function sha256(text: string): Promise<string> {
  return toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text))))
}

/** Compares two strings in time that depends only on their length. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export { one }
