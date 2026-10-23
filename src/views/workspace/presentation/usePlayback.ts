import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { advance, clockAt, sceneProgress, START, step, toggle, type Playback } from './playback'

/** The scene that just left, and how far it had played, so it can fade out where it stopped. */
export interface Exit {
  index: number
  progress: number
}

/** The CSS custom property with the current scene's progress, from 0 to 1. */
export const PROGRESS_VAR = '--scene-progress'

/**
 * Runs the presentation clock.
 * React renders only on a new scene, status or second. Every frame writes the scene's progress to `--scene-progress` on `root`,
 * where the progress bar and the camera motion read it.
 */
export function usePlayback(durations: number[], root: RefObject<HTMLElement>) {
  const [shown, setShown] = useState<{ playback: Playback; exit?: Exit }>({ playback: START })
  const [loop, setLoop] = useState(false)
  // Held by a finger on the phone: paused only while it lasts.
  const [held, setHeld] = useState(false)
  const live = useRef(START)

  const paint = useCallback(() => root.current?.style.setProperty(PROGRESS_VAR, String(sceneProgress(live.current, durations))), [durations, root])

  const show = useCallback(
    (next: Playback, before: Playback) => {
      live.current = next
      const exit = next.index !== before.index ? { index: before.index, progress: sceneProgress(before, durations) } : undefined
      // On a new scene the layout effect paints after React swaps the layers, so the old scene never shows the new progress.
      if (!exit) paint()
      if (exit || next.status !== before.status || Math.floor(clockAt(next, durations)) !== Math.floor(clockAt(before, durations)))
        setShown((s) => ({ playback: next, exit: exit ?? s.exit }))
    },
    [durations, paint],
  )

  useLayoutEffect(paint, [shown, paint])

  // A scene removed while presenting must not leave the index past the end.
  if (shown.playback.index >= durations.length && durations.length > 0) {
    const fixed = { ...shown.playback, index: durations.length - 1, elapsed: 0 }
    live.current = fixed
    setShown({ playback: fixed })
  }

  const running = shown.playback.status === 'playing' && !held
  useEffect(() => {
    if (!running) return
    let last = performance.now()
    let frame = requestAnimationFrame(function tick(now) {
      // A hidden tab stops animation frames. The cap keeps the clock from jumping ahead when it comes back.
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      show(advance(live.current, durations, dt, loop), live.current)
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [running, durations, loop, show])

  return {
    playback: shown.playback,
    exit: shown.exit,
    loop,
    toggle: () => show(toggle(live.current), live.current),
    step: (delta: 1 | -1) => show(step(live.current, durations, delta, loop), live.current),
    toggleLoop: () => setLoop((v) => !v),
    hold: setHeld,
  }
}

export type Player = ReturnType<typeof usePlayback>
