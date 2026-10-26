import type { z } from 'zod'

/** Thrown when the server answers with an error. `status` 401 means the session ended. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const OFFLINE = 'Sem conexão com o servidor. Suas mudanças ficam neste navegador e sobem quando a conexão voltar.'

/** Calls a collaboration route and parses the answer with its contract schema. */
export async function api<Schema extends z.ZodType>(path: string, schema: Schema, init: RequestInit & { json?: unknown } = {}): Promise<z.infer<Schema>> {
  const { json, ...rest } = init
  let res: Response
  try {
    res = await fetch(`/api/${path}`, {
      credentials: 'same-origin',
      ...rest,
      signal: AbortSignal.any([...(rest.signal ? [rest.signal] : []), AbortSignal.timeout(20000)]),
      headers: json !== undefined ? { 'Content-Type': 'application/json', ...rest.headers } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    })
  } catch {
    throw new ApiError(0, OFFLINE)
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new ApiError(res.status, body.error ?? (res.status === 404 ? 'Servidor da Decupa não encontrado.' : `O servidor respondeu HTTP ${res.status}.`))
  return schema.parse(body)
}
