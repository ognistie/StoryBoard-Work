import type { PublicUser } from '../lib/collab/contract.js'
import { HttpError, randomToken, readCookie, safeEqual, SESSION_COOKIE, SESSION_DAYS, sha256, toBase64Url } from './http.js'
import { one, parseJSON, type KV } from './kv.js'

// Accounts are email + password. Passwords are hashed with PBKDF2-SHA256 (Web Crypto),
// sessions are random tokens kept only as a SHA-256 hash, so a leaked store reveals neither.

interface StoredUser extends PublicUser {
  salt: string
  hash: string
  createdAt: number
}

const PBKDF2_ITERATIONS = 120_000

const userKey = (id: string) => `user:${id}`
const emailKey = (email: string) => `user-email:${email}`
const sessionKey = (tokenHash: string) => `session:${tokenHash}`

async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: PBKDF2_ITERATIONS }, key, 256)
  return toBase64Url(new Uint8Array(bits))
}

const toPublic = ({ id, email, name }: StoredUser): PublicUser => ({ id, email, name })

export async function getUser(kv: KV, id: string): Promise<PublicUser | null> {
  const user = parseJSON<StoredUser>(await one(kv, ['GET', userKey(id)]))
  return user && toPublic(user)
}

export async function getUsers(kv: KV, ids: string[]): Promise<Map<string, PublicUser>> {
  if (!ids.length) return new Map()
  const rows = await kv.pipeline(ids.map((id) => ['GET', userKey(id)]))
  const out = new Map<string, PublicUser>()
  rows.forEach((raw) => {
    const user = parseJSON<StoredUser>(raw)
    if (user) out.set(user.id, toPublic(user))
  })
  return out
}

export async function findUserIdByEmail(kv: KV, email: string): Promise<string | null> {
  return one<string | null>(kv, ['GET', emailKey(email)])
}

export async function signup(kv: KV, input: { email: string; name: string; password: string }): Promise<PublicUser> {
  const id = `usr_${randomToken(9)}`
  const salt = randomToken(16)
  const user: StoredUser = { id, email: input.email, name: input.name, salt, hash: await hashPassword(input.password, salt), createdAt: Date.now() }
  // The account exists before the email points to it, so a failure in between never leaves an email with no account.
  await one(kv, ['SET', userKey(id), JSON.stringify(user)])
  // NX claims the email atomically: two sign-ups with the same email cannot both win.
  const claimed = await one(kv, ['SET', emailKey(input.email), id, 'NX'])
  if (claimed !== 'OK') {
    await one(kv, ['DEL', userKey(id)])
    throw new HttpError(409, 'Já existe uma conta com este e-mail. Entre com sua senha.')
  }
  return toPublic(user)
}

export async function login(kv: KV, input: { email: string; password: string }): Promise<PublicUser> {
  const fail = new HttpError(401, 'E-mail ou senha incorretos.')
  const id = await findUserIdByEmail(kv, input.email)
  // Hash anyway when the account does not exist, so timing does not reveal which emails have accounts.
  const user = id ? parseJSON<StoredUser>(await one(kv, ['GET', userKey(id)])) : null
  const hash = await hashPassword(input.password, user?.salt ?? 'no-account')
  if (!user || !safeEqual(hash, user.hash)) throw fail
  return toPublic(user)
}

export async function createSession(kv: KV, userId: string): Promise<string> {
  const token = randomToken(32)
  await one(kv, ['SET', sessionKey(await sha256(token)), userId, 'EX', SESSION_DAYS * 86400])
  return token
}

export async function endSession(kv: KV, request: Request) {
  const token = readCookie(request, SESSION_COOKIE)
  if (token) await one(kv, ['DEL', sessionKey(await sha256(token))])
}

/** The signed-in user, or null. */
export async function currentUser(kv: KV, request: Request): Promise<PublicUser | null> {
  const token = readCookie(request, SESSION_COOKIE)
  if (!token || token.length > 100) return null
  const userId = await one<string | null>(kv, ['GET', sessionKey(await sha256(token))])
  return userId ? getUser(kv, userId) : null
}

export async function requireUser(kv: KV, request: Request): Promise<PublicUser> {
  const user = await currentUser(kv, request)
  if (!user) throw new HttpError(401, 'Entre com seu e-mail para continuar.')
  return user
}
