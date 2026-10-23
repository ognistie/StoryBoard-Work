import { create } from 'zustand'

export type ProviderId = 'demo' | 'openai'
export type ImageQuality = 'low' | 'medium' | 'high'

export interface AISettings {
  provider: ProviderId
  openaiKey: string
  imageModel: string
  textModel: string
  imageQuality: ImageQuality
  stream: boolean // progressive previews (partial images)
  budget: number // max generations per browser (cost control)
  used: number
  theme: 'light' | 'dark'
}

const KEY = 'frameline.settings'

export const DEFAULT_IMAGE_MODEL = 'gpt-image-1'
export const DEFAULT_TEXT_MODEL = 'gpt-4.1-mini'

const DEFAULTS: AISettings = {
  provider: 'demo',
  openaiKey: '',
  imageModel: DEFAULT_IMAGE_MODEL,
  textModel: DEFAULT_TEXT_MODEL,
  imageQuality: 'medium',
  stream: true,
  budget: 200,
  used: 0,
  theme: 'light',
}

function load(): AISettings {
  try {
    const raw = localStorage.getItem(KEY)
    const env = (import.meta.env.VITE_OPENAI_API_KEY as string | undefined) ?? ''
    const parsed = raw ? (JSON.parse(raw) as Partial<AISettings> & { provider?: string }) : {}
    const s = { ...DEFAULTS, ...parsed } as AISettings
    // settings saved by the previous (Gemini) version
    if ((s.provider as string) !== 'openai') s.provider = 'demo'
    if (!/^(gpt|dall-e|chatgpt)/.test(s.imageModel)) s.imageModel = DEFAULT_IMAGE_MODEL
    if (!/^(gpt|o\d|chatgpt)/.test(s.textModel)) s.textModel = DEFAULT_TEXT_MODEL
    delete (s as Partial<AISettings> & { geminiKey?: string }).geminiKey
    if (!s.openaiKey && env) {
      s.openaiKey = env
      if (!raw || !parsed.openaiKey) s.provider = 'openai'
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

export const isRealAI = (s: Pick<AISettings, 'provider' | 'openaiKey'>) => s.provider === 'openai' && !!s.openaiKey
