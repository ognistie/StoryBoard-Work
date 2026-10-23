import { create } from 'zustand'

export type ProviderId = 'demo' | 'gemini'

export interface AISettings {
  provider: ProviderId
  geminiKey: string
  imageModel: string
  textModel: string
  budget: number // max generations per browser (cost control)
  used: number
  theme: 'light' | 'dark'
}

const KEY = 'frameline.settings'

const DEFAULTS: AISettings = {
  provider: 'demo',
  geminiKey: '',
  imageModel: 'gemini-2.5-flash-image',
  textModel: 'gemini-2.5-flash',
  budget: 200,
  used: 0,
  theme: 'light',
}

function load(): AISettings {
  try {
    const raw = localStorage.getItem(KEY)
    const env = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ?? ''
    const parsed = raw ? (JSON.parse(raw) as Partial<AISettings>) : {}
    const s = { ...DEFAULTS, ...parsed }
    if (!s.geminiKey && env) {
      s.geminiKey = env
      if (!raw) s.provider = 'gemini'
    }
    return s
  } catch {
    return DEFAULTS
  }
}

interface SettingsState extends AISettings {
  set: (patch: Partial<AISettings>) => void
  countUsage: () => void
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...load(),
  set: (patch) => {
    set(patch)
    persist(get())
  },
  countUsage: () => {
    set({ used: get().used + 1 })
    persist(get())
  },
}))

function persist(s: SettingsState) {
  const { set: _s, countUsage: _c, ...data } = s
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* storage unavailable */
  }
}

export function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme
}
