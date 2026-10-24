import { create } from 'zustand'
import { DEFAULT_TEXT_MODEL, healthResponse } from './ai/contract'
import { openaiProvider } from './ai/openai'

interface Health {
  checked: boolean
  /** The server has an OpenAI key. */
  ai: boolean
  textModel: string
  /** The server has a store: accounts, sharing, chat and the shared folder work. */
  collab: boolean
}

export const useHealth = create<Health>(() => ({ checked: false, ai: true, textModel: DEFAULT_TEXT_MODEL, collab: false }))

/** Asks the server what it can do. Without a server (static preview) everything stays local. */
export async function checkHealth() {
  try {
    const res = await fetch('/api/health', { cache: 'no-store' })
    const health = healthResponse.parse(await res.json())
    openaiProvider.model = health.textModel
    useHealth.setState({ checked: true, ...health })
  } catch {
    useHealth.setState({ checked: true, ai: false, collab: false })
  }
}
