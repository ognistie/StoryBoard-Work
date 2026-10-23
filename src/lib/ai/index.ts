import { useSettings } from '../settings'
import { demoProvider } from './demo'
import { createGeminiProvider } from './gemini'
import type { AIProvider } from './types'

export function getProvider(): AIProvider {
  const s = useSettings.getState()
  if (s.provider === 'gemini' && s.geminiKey) return createGeminiProvider(s.geminiKey, s.imageModel, s.textModel)
  return demoProvider
}

export type { AIProvider } from './types'
