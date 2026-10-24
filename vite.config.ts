/// <reference types="vitest" />
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Server-side variables read from .env.local in development. Never bundled into the browser. */
const SERVER_ENV = ['OPENAI_', 'KV_', 'UPSTASH_', 'RESEND_', 'INVITE_']

/**
 * Serves the Vercel functions in api/ during `bun run dev`, so AI and collaboration work locally
 * without the Vercel CLI. Without Upstash variables the server keeps its data in memory.
 * Production uses the real Vercel functions.
 */
function apiDev(): Plugin {
  return {
    name: 'decupa-api-dev',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv('development', process.cwd(), SERVER_ENV)
      for (const [k, v] of Object.entries(env)) process.env[k] ??= v
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const match = req.url?.match(/^\/api\/([a-z0-9-]+)(?:\?.*)?$/)
        if (!match) return next()
        try {
          const mod = (await server.ssrLoadModule(`/api/${match[1]}.ts`)) as Record<string, (r: Request) => Response | Promise<Response>>
          const handler = mod[req.method ?? 'GET']
          if (!handler) {
            res.statusCode = 405
            return res.end()
          }
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
          const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
          const abort = new AbortController()
          res.on('close', () => !res.writableFinished && abort.abort())
          const response = await handler(new Request(`http://${req.headers.host ?? 'localhost'}${req.url}`, { method: req.method, headers, body: hasBody ? Buffer.concat(chunks) : undefined, signal: abort.signal }))
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          const cookies = response.headers.getSetCookie()
          if (cookies.length) res.setHeader('Set-Cookie', cookies)
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (e) {
          const err = e as Error
          res.setHeader('Content-Type', 'application/json')
          if (/Failed to load url|does not exist/i.test(err.message)) {
            res.statusCode = 404
            return res.end(JSON.stringify({ error: `Rota /api/${match[1]} não existe.` }))
          }
          server.ssrFixStacktrace(err)
          res.statusCode = 500
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiDev()],
  server: { watch: { ignored: ['**/.vercel/**'] } },
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
})
