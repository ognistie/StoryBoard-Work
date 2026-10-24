// Server-only key-value store behind the collaboration API (auth, projects, sync, files).
// Production uses Upstash Redis over its REST API (plain fetch, no SDK). The Vercel
// marketplace integration sets KV_REST_API_URL / KV_REST_API_TOKEN, optionally behind a
// custom prefix (STORAGE_KV_REST_API_URL); a direct Upstash database sets
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN. Any of them works.
// Local development without those variables falls back to an in-memory store.

export type Command = (string | number)[]

export interface KV {
  /** Runs commands in order and returns each result. A failed command throws. */
  pipeline(commands: Command[]): Promise<unknown[]>
}

export class KVUnavailableError extends Error {
  constructor() {
    super('Colaboração indisponível: o servidor não tem armazenamento configurado (Upstash Redis).')
    this.name = 'KVUnavailableError'
  }
}

class UpstashKV implements KV {
  constructor(
    private url: string,
    private token: string,
  ) {}

  async pipeline(commands: Command[]): Promise<unknown[]> {
    if (!commands.length) return []
    const res = await fetch(`${this.url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands.map((c) => c.map(String))),
    })
    if (!res.ok) throw new Error(`Armazenamento respondeu HTTP ${res.status}`)
    const out = (await res.json()) as { result?: unknown; error?: string }[]
    return out.map((r) => {
      if (r.error) throw new Error(`Armazenamento: ${r.error}`)
      return r.result ?? null
    })
  }
}

type Value = string | Map<string, string> | Set<string> | Map<string, number>

/**
 * Implements the subset of Redis the app uses, with the same reply shapes as Upstash.
 * Only for local development and tests: it lives in one process and forgets on restart.
 */
export class MemoryKV implements KV {
  private data = new Map<string, Value>()
  private expires = new Map<string, number>()

  private live(key: string) {
    const at = this.expires.get(key)
    if (at !== undefined && at <= Date.now()) {
      this.data.delete(key)
      this.expires.delete(key)
    }
    return this.data.get(key)
  }

  private hash(key: string) {
    let v = this.live(key)
    if (!v) this.data.set(key, (v = new Map<string, string>()))
    return v as Map<string, string>
  }

  private set(key: string) {
    let v = this.live(key)
    if (!v) this.data.set(key, (v = new Set<string>()))
    return v as Set<string>
  }

  private zset(key: string) {
    let v = this.live(key)
    if (!v) this.data.set(key, (v = new Map<string, number>()))
    return v as Map<string, number>
  }

  async pipeline(commands: Command[]): Promise<unknown[]> {
    return commands.map((c) => this.run(c.map(String)))
  }

  private run([cmd, key, ...args]: string[]): unknown {
    switch (cmd.toUpperCase()) {
      case 'GET': {
        const v = this.live(key)
        return typeof v === 'string' ? v : null
      }
      case 'SET': {
        const nx = args.includes('NX')
        if (nx && this.live(key) !== undefined) return null
        this.data.set(key, args[0])
        const ex = args.indexOf('EX')
        if (ex >= 0) this.expires.set(key, Date.now() + Number(args[ex + 1]) * 1000)
        else this.expires.delete(key)
        return 'OK'
      }
      case 'DEL': {
        let n = 0
        for (const k of [key, ...args]) if (this.data.delete(k)) n++
        return n
      }
      case 'INCR':
      case 'INCRBY': {
        const next = Number(this.live(key) ?? 0) + (cmd.toUpperCase() === 'INCR' ? 1 : Number(args[0]))
        this.data.set(key, String(next))
        return next
      }
      case 'EXPIRE':
        if (this.live(key) === undefined) return 0
        this.expires.set(key, Date.now() + Number(args[0]) * 1000)
        return 1
      case 'HSET': {
        const h = this.hash(key)
        let added = 0
        for (let i = 0; i < args.length; i += 2) {
          if (!h.has(args[i])) added++
          h.set(args[i], args[i + 1])
        }
        return added
      }
      case 'HSETNX': {
        const h = this.hash(key)
        if (h.has(args[0])) return 0
        h.set(args[0], args[1])
        return 1
      }
      case 'HGET':
        return (this.live(key) as Map<string, string> | undefined)?.get(args[0]) ?? null
      case 'HMGET': {
        const h = this.live(key) as Map<string, string> | undefined
        return args.map((f) => h?.get(f) ?? null)
      }
      case 'HDEL': {
        const h = this.live(key) as Map<string, string> | undefined
        return args.filter((f) => h?.delete(f)).length
      }
      case 'HGETALL': {
        const h = this.live(key) as Map<string, string> | undefined
        return h ? [...h].flat() : []
      }
      case 'SADD': {
        const s = this.set(key)
        const before = s.size
        args.forEach((m) => s.add(m))
        return s.size - before
      }
      case 'SREM': {
        const s = this.live(key) as Set<string> | undefined
        return args.filter((m) => s?.delete(m)).length
      }
      case 'SMEMBERS':
        return [...((this.live(key) as Set<string> | undefined) ?? [])]
      case 'ZADD': {
        const z = this.zset(key)
        let added = 0
        for (let i = 0; i < args.length; i += 2) {
          if (!z.has(args[i + 1])) added++
          z.set(args[i + 1], Number(args[i]))
        }
        return added
      }
      case 'ZREM': {
        const z = this.live(key) as Map<string, number> | undefined
        return args.filter((m) => z?.delete(m)).length
      }
      case 'ZRANGEBYSCORE': {
        const z = (this.live(key) as Map<string, number> | undefined) ?? new Map()
        const bound = (v: string) => (v === '-inf' ? -Infinity : v === '+inf' ? Infinity : Number(v.replace('(', '')))
        const min = bound(args[0])
        const exclusive = args[0].startsWith('(')
        const max = bound(args[1])
        const limit = args.indexOf('LIMIT')
        const rows = [...z].filter(([, s]) => (exclusive ? s > min : s >= min) && s <= max).sort((a, b) => a[1] - b[1])
        const sliced = limit >= 0 ? rows.slice(Number(args[limit + 1]), Number(args[limit + 1]) + Number(args[limit + 2])) : rows
        return args.includes('WITHSCORES') ? sliced.flatMap(([m, s]) => [m, String(s)]) : sliced.map(([m]) => m)
      }
      default:
        throw new Error(`MemoryKV: comando ${cmd} não suportado`)
    }
  }
}

let shared: KV | null | undefined

/** The configured store, or null in production without one (collaboration then stays off). */
/** Finds a REST URL and its token with the same name. Unprefixed names win over prefixed ones. */
export function upstashCredentials(env: Record<string, string | undefined>): { url: string; token: string } | null {
  const urls = Object.keys(env)
    .filter((k) => /(^|_)(KV_REST_API|UPSTASH_REDIS_REST)_URL$/.test(k) && env[k]?.trim())
    .sort((a, b) => a.length - b.length)
  for (const k of urls) {
    const token = env[k.replace(/_URL$/, '_TOKEN')]?.trim()
    if (token) return { url: env[k]!.trim(), token }
  }
  return null
}

export function getKV(): KV | null {
  if (shared !== undefined) return shared
  const env = process.env
  const credentials = upstashCredentials(env)
  if (credentials) shared = new UpstashKV(credentials.url, credentials.token)
  // A memory store on Vercel would be per instance and silently lose data, so it is local only.
  else shared = env.VERCEL ? null : new MemoryKV()
  return shared
}

export function requireKV(): KV {
  const kv = getKV()
  if (!kv) throw new KVUnavailableError()
  return kv
}

/** Replaces the store (tests). */
export function setKV(kv: KV | null) {
  shared = kv
}

export async function one<T = unknown>(kv: KV, command: Command): Promise<T> {
  return (await kv.pipeline([command]))[0] as T
}

export function parseJSON<T>(raw: unknown): T | null {
  if (typeof raw !== 'string') return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
