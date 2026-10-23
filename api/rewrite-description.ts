import { generateText, Output } from 'ai'
import { descriptionResponse, rewriteDescriptionRequest } from '../src/lib/ai/contract.js'
import { handle, model } from '../src/lib/ai/server.js'

export const POST = handle(rewriteDescriptionRequest, async ({ base, instruction }, signal) => {
  const { output } = await generateText({
    model,
    abortSignal: signal,
    output: Output.object({ schema: descriptionResponse }),
    system: 'Você mantém descrições objetivas de quadros de storyboard: PT-BR, até 2 frases, sem floreios. Devolva a descrição completa do quadro já com a alteração aplicada.',
    prompt: JSON.stringify({ descricaoAtual: base, alteracao: instruction }),
  })
  return output
})
