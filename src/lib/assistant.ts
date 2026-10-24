import type { z } from 'zod'
import { assistantResponse, type assistantRequest } from './ai/contract'
import { post } from './ai/openai'
import { db } from './db'
import { addAssistantMessage, sendMessage } from './repo'
import { userById } from './session'
import { useHealth } from './health'
import { AI_AUTHOR, type Frame, type Scene } from './types'

/** A message addressed to the assistant: it starts with "@ia" (any case), or the AI toggle is on. */
export const AI_MENTION = /^\s*@ia\b[:,]?\s*/i

const HISTORY = 10

/** Scenes in the order the canvas numbers them: scene order, then order inside the scene. */
function inOrder(frames: Frame[], scenes: Scene[]) {
  const so = new Map(scenes.map((s) => [s.id, s.order]))
  return [...frames].sort((a, b) => (so.get(a.sceneId) ?? 999) - (so.get(b.sceneId) ?? 999) || a.order - b.order)
}

/**
 * Posts the member's question to the project chat, then asks the assistant with the project as
 * context (briefing, scenes, recent chat) and posts its answer. Everyone in the project sees both.
 */
export async function askAssistant(projectId: string, userId: string, text: string) {
  // Checked before posting, so a question nobody can answer never lands in the team's chat.
  if (!useHealth.getState().ai) throw new Error('A IA está indisponível agora (o servidor está sem chave da OpenAI).')
  const asked = await sendMessage(projectId, userId, AI_MENTION.test(text) ? text : `@ia ${text}`)
  const [project, scenes, frames, docs, recent] = await Promise.all([
    db.projects.get(projectId),
    db.scenes.where('projectId').equals(projectId).toArray(),
    db.frames.where('projectId').equals(projectId).toArray(),
    db.docs.where('projectId').equals(projectId).toArray(),
    db.messages.where('projectId').equals(projectId).sortBy('createdAt'),
  ])
  if (!project) throw new Error('Projeto não encontrado.')
  const ordered = inOrder(frames, scenes)
  const history = recent
    .filter((m) => m.id !== asked.id)
    .slice(-HISTORY)
    .map((m) => ({ author: m.authorId === AI_AUTHOR ? 'Decupa IA' : userById(m.authorId).name, text: m.text.slice(0, 2000) }))
  const response = await post(
    'assistant',
    {
      projectName: project.name,
      format: project.aspect,
      briefing: (docs.find((d) => d.kind === 'brief')?.text ?? '').slice(0, 8000),
      scenes: ordered.slice(0, 12).map((f, i) => ({ number: i + 1, title: f.title, description: f.description, dialogue: f.dialogue, duration: f.duration, shot: f.shot, movement: f.movement })),
      history,
      question: text.replace(AI_MENTION, '').trim() || text,
    } satisfies z.infer<typeof assistantRequest>,
    assistantResponse,
    new AbortController().signal,
  )
  // Suggestions for scenes that do not exist are dropped: a click must always have a target.
  const suggestions = response.suggestions.filter((s) => s.sceneNumber >= 1 && s.sceneNumber <= ordered.length)
  await addAssistantMessage(projectId, userId, response.answer, suggestions)
}
