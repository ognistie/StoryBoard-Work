import type { z } from 'zod'
import { MAX_ATTACHMENT_CHARS, planBriefingResponse, type FORMATS, type planBriefingRequest } from './ai/contract'
import { openaiProvider, post } from './ai/openai'
import { extractText, fileToImage } from './fileText'
import { createFrame, createProject, createScene, putImage, saveAsset, saveDoc } from './repo'
import { drawScene } from './scenes'
import { userById } from './session'

export type BriefingFormat = (typeof FORMATS)[number]

const MAX_IMAGE_BYTES = 3 * 1024 * 1024

type Attachment = NonNullable<z.infer<typeof planBriefingRequest>['attachment']>

/** A file attached to the briefing, read once: what goes to the model and what stays in the project. */
interface ReadAttachment {
  request: Attachment
  image?: { blob: Blob; width: number; height: number }
  text?: string
}

async function readAttachment(file: File): Promise<ReadAttachment> {
  if (file.type.startsWith('image/')) {
    // Normalized to a JPEG of at most 1600px, so it fits the 4.5 MB request limit of Vercel Functions.
    const image = await fileToImage(file)
    if (image.blob.size > MAX_IMAGE_BYTES) throw new Error('A imagem anexada passa de 3 MB.')
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(image.blob)
    })
    return { request: { kind: 'image', name: file.name, dataUrl }, image }
  }
  const text = await extractText(file)
  return { request: { kind: 'text', name: file.name, text: text.slice(0, MAX_ATTACHMENT_CHARS) }, text }
}

/**
 * Turns a briefing into a new project: the AI plans up to six scenes, and each becomes a frame
 * whose first version already carries its local sketch. The briefing and the attachment stay with the project.
 */
export async function createProjectFromBriefing(input: { briefing: string; format: BriefingFormat; durationSeconds: number; file?: File; userId: string }): Promise<string> {
  const briefing = input.briefing.trim()
  if (!briefing) throw new Error('Escreva o briefing antes de enviar.')
  const attachment = input.file ? await readAttachment(input.file) : undefined

  const startedAt = performance.now()
  const plan = await post(
    'plan-briefing',
    { briefing, format: input.format, durationSeconds: input.durationSeconds, attachment: attachment?.request } satisfies z.infer<typeof planBriefingRequest>,
    planBriefingResponse,
    new AbortController().signal,
  )
  const latencyMs = Math.round(performance.now() - startedAt)

  const [client] = plan.projectName.split('·').map((part) => part.trim())
  const projectId = await createProject({
    name: plan.projectName,
    client: client || 'Cliente',
    producer: userById(input.userId).org,
    style: 'pencil',
    ownerId: input.userId,
    aspect: input.format,
    durationSeconds: input.durationSeconds,
  })
  await saveDoc(projectId, input.userId, { title: 'Briefing', kind: 'brief', text: briefing, confidential: false })
  if (attachment?.image) {
    const imageId = await putImage(attachment.image.blob, attachment.image.width, attachment.image.height)
    await saveAsset(projectId, input.userId, { type: 'reference', name: attachment.request.name, imageId })
  }
  if (attachment?.text !== undefined) {
    await saveDoc(projectId, input.userId, { title: attachment.request.name, kind: 'other', text: attachment.text, confidential: false, fileName: attachment.request.name })
  }

  const sceneId = await createScene(projectId, input.userId, { heading: 'ROTEIRO', sequence: 'Sequência 1', summary: briefing.slice(0, 280) })
  // Drawn locally and committed with the first version, so no candidate waits for approval.
  const drawings = await Promise.all(plan.scenes.map((scene) => drawScene(scene, input.format)))
  for (const [i, scene] of plan.scenes.entries()) {
    await createFrame(projectId, sceneId, input.userId, { ...scene, ...drawings[i] }, {
      message: 'Cena proposta pelo briefing',
      kind: 'initial',
      ai: { instruction: briefing, basePrompt: '', structuredPrompt: '', provider: openaiProvider.label, model: openaiProvider.model, isDemo: false, contextRefs: [], latencyMs },
    })
  }
  return projectId
}
