import { useSyncExternalStore } from 'react'

/** The three layouts of the canvas screen in docs/responsivo.md. */
export type Screen = 'mobile' | 'tablet' | 'desktop'

const TABLET = window.matchMedia('(min-width: 768px)')
const DESKTOP = window.matchMedia('(min-width: 1280px)')

function subscribe(onChange: () => void) {
  TABLET.addEventListener('change', onChange)
  DESKTOP.addEventListener('change', onChange)
  return () => {
    TABLET.removeEventListener('change', onChange)
    DESKTOP.removeEventListener('change', onChange)
  }
}

const current = (): Screen => (DESKTOP.matches ? 'desktop' : TABLET.matches ? 'tablet' : 'mobile')

export function useScreen(): Screen {
  return useSyncExternalStore(subscribe, current)
}
