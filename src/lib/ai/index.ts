import { isRealAI, useSettings } from '../settings'
import { demoProvider } from './demo'
import { createOpenAIProvider } from './openai'
import type { AIProvider } from './types'

export function getProvider(): AIProvider {
  const s = useSettings.getState()
  if (isRealAI(s)) return createOpenAIProvider({ key: s.openaiKey, imageModel: s.imageModel, textModel: s.textModel, quality: s.imageQuality, stream: s.stream })
  return demoProvider
}

export type { AIProvider } from './types'
