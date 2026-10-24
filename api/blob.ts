import { MAX_BLOB_BYTES } from '../src/lib/collab/contract.js'
import { requireUser } from '../src/server/auth.js'
import { endpoint, HttpError } from '../src/server/http.js'
import { requireKV } from '../src/server/kv.js'
import { getBlob, putBlob } from '../src/server/projects.js'

// Contents of images and files of a shared project. An id never gets new content, so reads cache for good.

function params(request: Request) {
  const url = new URL(request.url)
  const projectId = url.searchParams.get('project') ?? ''
  const id = url.searchParams.get('id') ?? ''
  if (!/^[\w-]{3,64}$/.test(projectId) || !/^[\w-]{3,64}$/.test(id)) throw new HttpError(400, 'Parâmetros inválidos.')
  return { projectId, id }
}

export const GET = endpoint(async (request) => {
  const kv = requireKV()
  const user = await requireUser(kv, request)
  const { projectId, id } = params(request)
  const blob = await getBlob(kv, user, projectId, id)
  if (!blob) throw new HttpError(404, 'Arquivo não encontrado.')
  // Uploads come from members, so their type is not trusted: only raster images render inline.
  // Anything else (HTML, SVG with scripts…) downloads as bytes and can never run on this origin.
  const inline = /^image\/(png|jpe?g|webp|gif|avif)$/i.test(blob.mime)
  return new Response(blob.bytes, {
    headers: {
      'Content-Type': inline ? blob.mime : 'application/octet-stream',
      'Content-Disposition': inline ? 'inline' : 'attachment',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  })
})

export const PUT = endpoint(async (request) => {
  const kv = requireKV()
  const user = await requireUser(kv, request)
  const { projectId, id } = params(request)
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BLOB_BYTES) throw new HttpError(413, 'Arquivo maior que 3 MB.')
  const bytes = new Uint8Array(await request.arrayBuffer())
  const mime = (request.headers.get('content-type') ?? 'application/octet-stream').slice(0, 100)
  await putBlob(kv, user, projectId, id, mime, bytes)
  return new Response(null, { status: 204 })
})
