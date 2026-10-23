import { toast, toastError } from '../../components/ui'
import { db } from '../../lib/db'
import { fileToImage } from '../../lib/fileText'
import { startEditBatch } from '../../lib/jobs'
import { broadcastNotice } from '../../lib/presence'
import { commitFrame, createFrame, deleteFrame, duplicateFrame, putImage, updateFrame } from '../../lib/repo'
import type { Frame } from '../../lib/types'
import { useWS } from './store'

/** UI-level actions shared by cards, sidebar, viewer and keyboard shortcuts. */

export function pickFile(accept: string): Promise<File | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => resolve(input.files?.[0])
    input.click()
  })
}

export async function replaceImage(frame: Frame, userId: string) {
  const file = await pickFile('image/*')
  if (!file) return
  try {
    const { blob, width, height } = await fileToImage(file)
    const imageId = await putImage(blob, width, height)
    await updateFrame(frame.id, userId, { imageId, sketch: undefined })
    await commitFrame(frame.id, userId, `Imagem importada (${file.name})`, 'upload')
    toast('Imagem importada como nova versão', { tone: 'ok' })
  } catch (e) {
    toastError(e)
  }
}

export async function addFrame(projectId: string, sceneId: string, userId: string, afterOrder?: number) {
  try {
    const id = await createFrame(projectId, sceneId, userId, { title: 'Novo quadro' }, { afterOrder, message: 'Quadro criado' })
    useWS.getState().select(id, 'single')
    useWS.getState().openPanel('details', id)
  } catch (e) {
    toastError(e)
  }
}

export async function removeFrame(frame: Frame, userId: string) {
  if (!confirm(`Excluir “${frame.title}”? O histórico de versões continua preservado.`)) return
  try {
    await deleteFrame(frame.id, userId)
    useWS.setState((s) => ({ selection: s.selection.filter((x) => x !== frame.id), focusId: s.focusId === frame.id ? undefined : s.focusId }))
  } catch (e) {
    toastError(e)
  }
}

export async function duplicate(frame: Frame, userId: string) {
  try {
    await duplicateFrame(frame.id, userId)
    toast('Quadro duplicado', { tone: 'ok' })
  } catch (e) {
    toastError(e)
  }
}

export async function generateFromDescription(frames: Frame[], userId: string) {
  if (!frames.length) return
  try {
    await startEditBatch({ projectId: frames[0].projectId, frameIds: frames.map((f) => f.id), instruction: 'Gerar imagem a partir da descrição', keepConsistency: true, actorId: userId, forceGenerate: true })
    useWS.getState().openPanel('ai')
  } catch (e) {
    toastError(e)
  }
}

export function notify(projectId: string, userId: string, text: string, frameId?: string) {
  broadcastNotice({ projectId, userId, text, frameId })
}

export async function frameTitle(id: string) {
  return (await db.frames.get(id))?.title ?? 'quadro'
}
