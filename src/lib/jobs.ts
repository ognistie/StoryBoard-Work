import { getProvider } from './ai'
import type { RefImage } from './ai/types'
import { buildEditPrompt, buildGeneratePrompt, mentionedCharacters, retrieve } from './context'
import { db } from './db'
import { uid } from './ids'
import { putImage } from './repo'
import { assertCan, roleIn } from './session'
import { useSettings } from './settings'
import type { Asset, ContextDoc, GenerationJob, Region } from './types'

/**
 * Asynchronous generation queue. Jobs are persisted (so every tab sees their
 * status live) and executed in this tab with limited concurrency. The current
 * image is never touched: results are stored as candidates until accepted.
 */

const CONCURRENCY = 2
const queue: string[] = []
const running = new Map<string, AbortController>()

export interface EditBatchInput {
  projectId: string
  frameIds: string[]
  instruction: string
  region?: Region
  keepConsistency: boolean
  exception?: string
  actorId: string
  forceGenerate?: boolean
}

export async function startEditBatch(input: EditBatchInput): Promise<string> {
  const project = await db.projects.get(input.projectId)
  assertCan(roleIn(project, input.actorId), 'ai')
  const s = useSettings.getState()
  if (s.used + input.frameIds.length > s.budget) throw new Error(`Orçamento de gerações atingido (${s.used}/${s.budget}). Ajuste em Configurações.`)
  const batchId = uid('batch')
  const frames = await db.frames.bulkGet(input.frameIds)
  const jobs: GenerationJob[] = frames.filter(Boolean).map((f) => ({
    id: uid('job'),
    projectId: input.projectId,
    frameId: f!.id,
    batchId,
    kind: f!.imageId && !input.forceGenerate ? 'edit' : 'generate',
    baseRevisionId: f!.headRevisionId,
    instruction: input.instruction,
    region: input.region,
    keepConsistency: input.keepConsistency,
    exception: input.exception,
    status: 'queued',
    decision: 'pending',
    createdBy: input.actorId,
    createdAt: Date.now(),
  }))
  await db.jobs.bulkAdd(jobs)
  jobs.forEach((j) => enqueue(j.id))
  return batchId
}

/** Generate images for frames from their descriptions (used after script import). */
export async function startGenerateBatch(projectId: string, frameIds: string[], actorId: string): Promise<string> {
  return startEditBatch({ projectId, frameIds, instruction: 'Gerar imagem a partir da descrição', keepConsistency: true, actorId, forceGenerate: true })
}

export async function retryJob(jobId: string): Promise<string> {
  const old = await db.jobs.get(jobId)
  if (!old) throw new Error('Job não encontrado')
  const frame = await db.frames.get(old.frameId)
  const job: GenerationJob = {
    ...old,
    id: uid('job'),
    status: 'queued',
    decision: 'pending',
    baseRevisionId: frame?.headRevisionId,
    previewImageId: undefined,
    candidateImageId: undefined,
    candidateSketch: undefined,
    error: undefined,
    stale: false,
    createdAt: Date.now(),
    firstPreviewMs: undefined,
    totalMs: undefined,
  }
  await db.jobs.add(job)
  await db.jobs.update(jobId, { decision: 'discarded' })
  enqueue(job.id)
  return job.id
}

export function cancelJob(jobId: string) {
  const ctrl = running.get(jobId)
  if (ctrl) ctrl.abort()
  else {
    const i = queue.indexOf(jobId)
    if (i >= 0) queue.splice(i, 1)
    void db.jobs.update(jobId, { status: 'canceled' })
  }
}

function enqueue(id: string) {
  queue.push(id)
  pump()
}

function pump() {
  while (running.size < CONCURRENCY && queue.length) {
    const id = queue.shift()!
    const ctrl = new AbortController()
    running.set(id, ctrl)
    void run(id, ctrl.signal).finally(() => {
      running.delete(id)
      pump()
    })
  }
}

async function loadRefs(chars: Asset[]): Promise<RefImage[]> {
  const out: RefImage[] = []
  for (const c of chars.slice(0, 3)) {
    if (!c.imageId) continue
    const img = await db.images.get(c.imageId)
    if (img) out.push({ blob: img.blob, label: `${c.name} — ${c.description}` })
  }
  return out
}

async function run(jobId: string, signal: AbortSignal) {
  const t0 = performance.now()
  const set = (patch: Partial<GenerationJob>) => db.jobs.update(jobId, patch)
  try {
    const job = await db.jobs.get(jobId)
    if (!job) return
    await set({ status: 'preparing' })
    const [project, frame] = await Promise.all([db.projects.get(job.projectId), db.frames.get(job.frameId)])
    if (!project || !frame) throw new Error('Quadro não encontrado.')
    const role = roleIn(project, job.createdBy)
    const scene = await db.scenes.get(frame.sceneId)
    const allDocs = await db.docs.where('projectId').equals(job.projectId).toArray()
    // Confidential documents never reach prompts requested by people who cannot read them.
    const docs: ContextDoc[] = role === 'client' || role === 'viewer' ? allDocs.filter((d) => !d.confidential) : allDocs
    const assets = await db.assets.where('projectId').equals(job.projectId).toArray()
    const chars = mentionedCharacters(`${job.instruction} ${job.kind === 'generate' ? frame.characters.join(' ') : ''}`, assets)
    const query = `${frame.description} ${frame.action} ${job.instruction} ${scene?.heading ?? ''} ${chars.map((c) => c.name).join(' ')}`
    const refs = job.keepConsistency ? retrieve(docs, query, 4, scene?.heading) : []
    const provider = getProvider()
    const references = await loadRefs(chars)
    const base = frame.imageId ? await db.images.get(frame.imageId) : undefined
    const onPreview = async (r: { blob: Blob; width: number; height: number }) => {
      const previewImageId = await putImage(r.blob, r.width, r.height)
      await set({ previewImageId, status: 'refining', firstPreviewMs: Math.round(performance.now() - t0) })
    }

    let structuredPrompt: string
    await set({ status: 'generating' })
    let result
    if (job.kind === 'edit' && base) {
      structuredPrompt = buildEditPrompt({ project, frame, scene, instruction: job.instruction, refs, characters: chars, region: job.region, keepConsistency: job.keepConsistency, exception: job.exception })
      const [img, desc] = await Promise.all([
        provider.editImage({
          image: base.blob,
          sketch: frame.sketch,
          prompt: structuredPrompt,
          instruction: job.instruction,
          region: job.region,
          references,
          characters: chars,
          aspect: project.aspect,
          signal,
          onPreview,
        }),
        provider.rewriteDescription(frame.description, job.instruction, signal),
      ])
      result = { img, desc }
    } else {
      const frameChars = assets.filter((a) => a.type === 'character' && frame.characters.some((c) => c.toLowerCase() === a.name.toLowerCase()))
      structuredPrompt = buildGeneratePrompt({ project, frame, scene, refs, characters: frameChars })
      const img = await provider.generateImage({
        prompt: structuredPrompt,
        description: `${frame.description} ${frame.action}`,
        shot: frame.shot,
        timeOfDay: scene?.timeOfDay ?? 'unknown',
        characters: frameChars,
        references: await loadRefs(frameChars),
        aspect: project.aspect,
        signal,
        onPreview,
      })
      result = { img, desc: frame.description }
    }
    useSettings.getState().countUsage()
    const candidateImageId = await putImage(result.img.blob, result.img.width, result.img.height)
    const latest = await db.frames.get(job.frameId)
    const totalMs = Math.round(performance.now() - t0)
    await set({
      status: 'ready',
      candidateImageId,
      candidateSketch: result.img.sketch,
      newDescription: result.desc,
      totalMs,
      error: result.img.note,
      stale: !!latest && latest.headRevisionId !== job.baseRevisionId,
      ai: {
        instruction: job.instruction,
        basePrompt: frame.description,
        structuredPrompt,
        provider: provider.label,
        model: provider.model,
        isDemo: provider.isDemo,
        contextRefs: refs,
        region: job.region,
        exception: job.exception,
        latencyMs: totalMs,
      },
    })
    console.info(`[jobs] ${jobId} pronto em ${totalMs}ms (prévia: ${(await db.jobs.get(jobId))?.firstPreviewMs ?? '—'}ms)`)
  } catch (e) {
    const err = e as Error
    if (err.name === 'AbortError') await set({ status: 'canceled' })
    else await set({ status: 'error', error: err.message || String(err), totalMs: Math.round(performance.now() - t0) })
  }
}

/** Jobs left mid-flight by a closed tab are marked as interrupted. */
export async function recoverOrphanJobs() {
  const cutoff = Date.now() - 3 * 60_000
  await db.jobs
    .where('status')
    .anyOf('queued', 'preparing', 'generating', 'refining')
    .filter((j) => j.createdAt < cutoff && !running.has(j.id))
    .modify({ status: 'error', error: 'Geração interrompida (aba fechada). Tente novamente.' })
}

export const isJobActive = (j: GenerationJob) => ['queued', 'preparing', 'generating', 'refining'].includes(j.status)
