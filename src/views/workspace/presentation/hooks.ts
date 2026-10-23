import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react'

function onResize(change: () => void) {
  window.addEventListener('resize', change)
  return () => window.removeEventListener('resize', change)
}

/** The window's width and height. */
export function useViewport() {
  const width = useSyncExternalStore(onResize, () => window.innerWidth)
  const height = useSyncExternalStore(onResize, () => window.innerHeight)
  return { width, height }
}

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)')

function onMotionPreference(change: () => void) {
  REDUCED_MOTION.addEventListener('change', change)
  return () => REDUCED_MOTION.removeEventListener('change', change)
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(onMotionPreference, () => REDUCED_MOTION.matches)
}

/** True after `ms` without a call to `wake`. */
export function useIdle(ms: number): [boolean, () => void] {
  const [idle, setIdle] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const wake = useCallback(() => {
    setIdle(false)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setIdle(true), ms)
  }, [ms])
  useEffect(() => {
    wake()
    return () => clearTimeout(timer.current)
  }, [wake])
  return [idle, wake]
}

/**
 * Shows `root` in full screen while mounted, and calls `onExit` when the browser leaves full screen (Esc, a gesture).
 * Without the Fullscreen API (Safari on iPhone) nothing happens: the fixed 100dvh layer is the fallback.
 */
export function useFullscreen(root: RefObject<HTMLElement>, onExit: () => void) {
  const exit = useRef(onExit)
  exit.current = onExit
  useEffect(() => {
    const el = root.current
    if (!el?.requestFullscreen) return
    // A refused request leaves the fixed layer on screen, which is the fallback anyway.
    el.requestFullscreen().catch(() => undefined)
    const change = () => {
      if (!document.fullscreenElement) exit.current()
    }
    document.addEventListener('fullscreenchange', change)
    return () => {
      document.removeEventListener('fullscreenchange', change)
      if (document.fullscreenElement === el) void document.exitFullscreen()
    }
  }, [root])
}

/** Moves focus into `root` while mounted, and back to `fallback`'s match or the opener when it closes. */
export function useFocusReturn(root: RefObject<HTMLElement>, fallback: string) {
  useEffect(() => {
    const opener = document.activeElement
    root.current?.focus()
    return () => {
      // Entering full screen can resize the window across a breakpoint, which swaps the header and its button.
      const target = opener instanceof HTMLElement && opener.isConnected ? opener : document.querySelector<HTMLElement>(fallback)
      target?.focus()
    }
  }, [root, fallback])
}
