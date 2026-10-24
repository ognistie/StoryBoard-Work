import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { clientIp, endpoint, HttpError, rateLimit } from '../../server/http.js'
import { DEFAULT_TEXT_MODEL } from './contract.js'

// Server-only. Imported by the functions in api/, never by the browser bundle.
// Relative imports in this chain keep the .js extension: Vercel runs api/ as Node ESM.

export const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || DEFAULT_TEXT_MODEL

/** Reads OPENAI_API_KEY from the function's environment. */
export const model = openai(TEXT_MODEL)

/** AI calls per minute per network. Keeps one visitor from spending the week's budget in an afternoon. */
const AI_PER_MINUTE = 20

/**
 * Wraps a task as a POST handler. A body that fails `schema` gets a 400, a request from another
 * site a 403, too many requests a 429. A failed model call gets a 502 with the provider's message,
 * so the browser can show it.
 */
export function handle<Schema extends z.ZodType>(schema: Schema, run: (input: z.infer<Schema>, signal: AbortSignal) => Promise<unknown>) {
  return endpoint(async (request) => {
    if (!process.env.OPENAI_API_KEY) throw new HttpError(503, 'A IA está sem chave no servidor (OPENAI_API_KEY).')
    const parsed = schema.safeParse(await request.json().catch(() => undefined))
    if (!parsed.success) throw new HttpError(400, z.prettifyError(parsed.error))
    await rateLimit(`ai:${clientIp(request)}`, AI_PER_MINUTE, 60)
    try {
      return Response.json(await run(parsed.data, request.signal))
    } catch (e) {
      throw new HttpError(502, (e as Error).message)
    }
  })
}
