import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

// Server-only. Imported by the functions in api/, never by the browser bundle.
// Relative imports in this chain keep the .js extension: Vercel runs api/ as Node ESM.

/** Reads OPENAI_API_KEY from the function's environment. */
export const model = openai('gpt-6.1-sol')

/**
 * Wraps a task as a POST handler. A body that fails `schema` gets a 400.
 * A failed model call gets a 502 with the provider's message, so the browser can show it.
 */
export function handle<Schema extends z.ZodType>(schema: Schema, run: (input: z.infer<Schema>, signal: AbortSignal) => Promise<unknown>) {
  return async (request: Request) => {
    const parsed = schema.safeParse(await request.json().catch(() => undefined))
    if (!parsed.success) return Response.json({ error: z.prettifyError(parsed.error) }, { status: 400 })
    try {
      return Response.json(await run(parsed.data, request.signal))
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 502 })
    }
  }
}
