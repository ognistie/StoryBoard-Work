import { describe, expect, it } from 'vitest'
import { upstashCredentials } from '../server/kv'

describe('upstashCredentials', () => {
  it('reads the names the Vercel integration and Upstash create', () => {
    expect(upstashCredentials({ KV_REST_API_URL: 'https://a', KV_REST_API_TOKEN: 't' })).toEqual({ url: 'https://a', token: 't' })
    expect(upstashCredentials({ UPSTASH_REDIS_REST_URL: 'https://b', UPSTASH_REDIS_REST_TOKEN: 't' })).toEqual({ url: 'https://b', token: 't' })
  })

  it('accepts a custom prefix and pairs the URL with the token of the same name', () => {
    const env = { STORAGE_KV_REST_API_URL: 'https://c', STORAGE_KV_REST_API_TOKEN: 't', STORAGE_KV_REST_API_READ_ONLY_TOKEN: 'ro' }
    expect(upstashCredentials(env)).toEqual({ url: 'https://c', token: 't' })
    expect(upstashCredentials({ STORAGE_KV_REST_API_URL: 'https://c', OTHER_KV_REST_API_TOKEN: 't' })).toBeNull()
  })

  it('prefers unprefixed names and ignores blank values', () => {
    const env = { X_KV_REST_API_URL: 'https://x', X_KV_REST_API_TOKEN: 'x', KV_REST_API_URL: ' https://a\n', KV_REST_API_TOKEN: 'a ' }
    expect(upstashCredentials(env)).toEqual({ url: 'https://a', token: 'a' })
    expect(upstashCredentials({ KV_REST_API_URL: '', KV_REST_API_TOKEN: 't' })).toBeNull()
  })
})
