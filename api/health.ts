import type { z } from 'zod'
import type { healthResponse } from '../src/lib/ai/contract.js'
import { TEXT_MODEL } from '../src/lib/ai/server.js'
import { getKV } from '../src/server/kv.js'

/** What this deployment can do: AI (a key is set) and collaboration (a store is set). Never reveals secrets. */
export function GET() {
  const body: z.infer<typeof healthResponse> = { ai: !!process.env.OPENAI_API_KEY, textModel: TEXT_MODEL, collab: !!getKV() }
  return Response.json(body, { headers: { 'Cache-Control': 'no-store' } })
}
