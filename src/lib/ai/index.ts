import { useSettings } from '../settings'
import { demoProvider } from './demo'
import { openaiProvider } from './openai'
import type { AIProvider } from './types'

export function getProvider(): AIProvider {
  return useSettings.getState().provider === 'openai' ? openaiProvider : demoProvider
}

export type { AIProvider } from './types'
