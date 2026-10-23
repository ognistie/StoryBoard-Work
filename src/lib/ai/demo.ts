import { mergeDescription, type ParsedScene } from '../context'
import { overlayPerson, sketchToBlob, toBlob } from '../sketch'
import { applyInstruction, specFromDescription } from '../sketchOps'
import type { AIProvider, ImageResult, PlannedFrame } from './types'

/**
 * Development adapter. Clearly NOT an AI model: it renders procedural pencil
 * sketches locally and understands a small set of commands, so the complete
 * workflow (jobs, preview, compare, accept, versioning) can be demonstrated
 * offline. Choose OpenAI in Settings for real text tasks.
 */

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('Cancelado', 'AbortError'))
    })
  })

const DEMO_HELP = 'O modo demonstração entende pedidos simples (adicionar/remover pessoa ou personagem, noite/dia/pôr do sol, chuva, close/plano aberto, carro, árvore, cachorro, caixas).'

export const demoProvider: AIProvider = {
  id: 'demo',
  label: 'Modo demonstração (local, sem IA)',
  model: 'sketch-renderer-local',
  isDemo: true,
  capabilities: { editImage: true, generateImage: true, maskedRegion: 'guided', progressivePreview: true, text: false },

  async editImage(req) {
    await wait(350 + Math.random() * 300, req.signal)
    if (req.sketch) {
      const { spec, understood } = applyInstruction(req.sketch, req.instruction, { region: req.region, characters: req.characters })
      const prev = await sketchToBlob(spec, true)
      req.onPreview?.({ ...prev, sketch: spec })
      await wait(700 + Math.random() * 600, req.signal)
      const full = await sketchToBlob(spec)
      return { ...full, sketch: spec, note: understood.length ? undefined : `Pedido não reconhecido pelo modo demo. ${DEMO_HELP}` }
    }
    // Uploaded/real image: composite a pencil figure (only "add person" is supported here).
    const bmp = await createImageBitmap(req.image)
    const canvas = document.createElement('canvas')
    canvas.width = bmp.width
    canvas.height = bmp.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bmp, 0, 0)
    const right = !/esquerda/i.test(req.instruction)
    const x = req.region ? req.region.x + req.region.w / 2 : right ? 0.78 : 0.22
    overlayPerson(ctx, canvas.width, canvas.height, { x, kind: 'adult', pose: 'stand', facing: right ? 'left' : 'right', name: req.characters[0]?.name }, Date.now() % 9999)
    await wait(600, req.signal)
    const blob = await toBlob(canvas)
    return { blob, width: canvas.width, height: canvas.height, note: 'Imagem importada: o modo demo só sobrepõe um esboço de pessoa.' }
  },

  async generateImage(req): Promise<ImageResult> {
    await wait(300, req.signal)
    const spec = specFromDescription(`${req.description} ${req.characters.map((c) => c.name).join(' ')}`, {
      characters: req.characters,
      shot: req.shot,
      time: req.timeOfDay,
    })
    const prev = await sketchToBlob(spec, true)
    req.onPreview?.({ ...prev, sketch: spec })
    await wait(600 + Math.random() * 500, req.signal)
    return { ...(await sketchToBlob(spec)), sketch: spec }
  },

  async rewriteDescription(base, instruction) {
    return mergeDescription(base, instruction)
  },

  async describeImage() {
    return 'Imagem de referência importada. Descreva o enquadramento, personagens e ação.'
  },

  async planShots(scenes: ParsedScene[]) {
    return scenes.map((s) => ({ sceneNumber: s.number, frames: heuristicPlan(s) }))
  },
}

export function heuristicPlan(scene: ParsedScene): PlannedFrame[] {
  const beats = scene.beats.length ? scene.beats : [{ action: scene.summary || scene.heading, dialogue: '', characters: scene.characters }]
  return beats.slice(0, 6).map((b, i) => {
    const shot = i === 0 ? 'aberto' : b.dialogue ? (i % 2 ? 'medio' : 'close') : i % 3 === 2 ? 'detalhe' : 'americano'
    const sentence = (b.action || b.dialogue).split(/(?<=[.!?])\s/)[0]
    return {
      title: sentence.slice(0, 48).replace(/[.,;:]$/, ''),
      description: (b.action || b.dialogue).slice(0, 240),
      action: b.action,
      dialogue: b.dialogue,
      shot,
      movement: i === 0 ? 'dolly' : 'estatico',
      characters: b.characters.length ? b.characters : scene.characters,
      duration: Math.min(6, Math.max(2, Math.round((b.action.length + b.dialogue.length) / 40))),
    } as PlannedFrame
  })
}
