import type { z } from 'zod'

/** How revisions name the AI that wrote them. The model itself is chosen in server.ts. */
export const openaiProvider = { label: 'OpenAI', model: 'gpt-6.1-sol' } as const

/** Calls a function in api/ and parses its answer with the contract schema. A failed call throws the server's message. */
export async function post<Response extends z.ZodType>(task: string, body: unknown, response: Response, signal: AbortSignal): Promise<z.infer<Response>> {
  const res = await fetch(`/api/${task}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })
  const json = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(json.error ?? `A IA respondeu HTTP ${res.status}`)
  return response.parse(json)
}
