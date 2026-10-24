import type { z } from 'zod'
import { DEFAULT_TEXT_MODEL } from './contract'

/** How revisions name the AI that wrote them. The server picks the model; api/health tells which (lib/health.ts). */
export const openaiProvider: { label: string; model: string } = { label: 'OpenAI', model: DEFAULT_TEXT_MODEL }

/** Calls a function in api/ and parses its answer with the contract schema. A failed call throws the server's message. */
export async function post<Response extends z.ZodType>(task: string, body: unknown, response: Response, signal: AbortSignal): Promise<z.infer<Response>> {
  let res: globalThis.Response
  try {
    res = await fetch(`/api/${task}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new Error('Sem conexão com a IA. Confira a internet e tente de novo.')
  }
  const json = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(json.error ?? `A IA respondeu HTTP ${res.status}`)
  return response.parse(json)
}
