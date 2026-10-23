import { generateText, Output } from 'ai'
import { describeImageRequest, descriptionResponse } from '../src/lib/ai/contract.js'
import { handle, model } from '../src/lib/ai/server.js'

export const POST = handle(describeImageRequest, async ({ image }, signal) => {
  const { output } = await generateText({
    model,
    abortSignal: signal,
    output: Output.object({ schema: descriptionResponse }),
    system: 'Descreva quadros de storyboard em PT-BR, em 1 a 2 frases objetivas: enquadramento, personagens e posições, cenário, luz. Sem floreios.',
    messages: [{ role: 'user', content: [{ type: 'file', mediaType: 'image', data: image }] }],
  })
  return output
})
