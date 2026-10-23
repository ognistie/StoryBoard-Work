import type { z } from 'zod'
import { demoProvider } from './demo'
import { descriptionResponse, planShotsResponse, type planShotsRequest } from './contract'
import type { AIProvider } from './types'

/**
 * OpenAI adapter. Text tasks go through the functions in api/, which hold the key.
 * The app never generates images: frames are drawn by the local sketch renderer,
 * the same one the demo mode uses.
 */

export async function post<Response extends z.ZodType>(task: string, body: unknown, response: Response, signal: AbortSignal): Promise<z.infer<Response>> {
  const res = await fetch(`/api/${task}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })
  const json = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(json.error ?? `A IA respondeu HTTP ${res.status}`)
  return response.parse(json)
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export const openaiProvider: AIProvider = {
  id: 'openai',
  label: 'OpenAI',
  model: 'gpt-6.1-sol',
  isDemo: false,
  capabilities: { ...demoProvider.capabilities, text: true },

  editImage: demoProvider.editImage,
  generateImage: demoProvider.generateImage,

  async rewriteDescription(base, instruction, signal) {
    return (await post('rewrite-description', { base, instruction }, descriptionResponse, signal)).description
  },

  async describeImage(image, signal) {
    return (await post('describe-image', { image: await toDataUrl(image) }, descriptionResponse, signal)).description
  },

  async planShots(scenes, styleHint, signal) {
    const body: z.infer<typeof planShotsRequest> = {
      styleHint,
      scenes: scenes.map((s) => ({ sceneNumber: s.number, heading: s.heading, characters: s.characters, text: s.excerpt.slice(0, 1800) })),
    }
    return (await post('plan-shots', body, planShotsResponse, signal)).scenes
  },
}
