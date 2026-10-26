import { useEffect, useState } from 'react'
import { useImageUrl } from '../../../lib/hooks'
import type { Frame } from '../../../lib/types'
import { useReducedMotion } from './hooks'
import { CAMERA_MOTION, motionTransform, STILL } from './motion'
import { PROGRESS_VAR, type Exit } from './usePlayback'

/** Matches the `scene-fade` transition in index.css. */
const FADE_MS = 400

/**
 * A scene drawn on screen. The current one is visible, the one that just left fades out, and the next one waits invisible so its image is ready.
 * `t` is where its motion stands: the live progress, the point where a leaving scene stopped, or the start.
 */
export interface Layer {
  index: number
  role: 'current' | 'leaving' | 'next'
  t: string
}

export function useSceneLayers(index: number, next: number | undefined, exit: Exit | undefined): Layer[] {
  const [expired, setExpired] = useState<Exit>()
  useEffect(() => {
    if (!exit) return
    const timer = setTimeout(() => setExpired(exit), FADE_MS)
    return () => clearTimeout(timer)
  }, [exit])
  const leaving = exit && exit !== expired && exit.index !== index ? exit : undefined

  const layers = new Map<number, Layer>()
  if (next !== undefined) layers.set(next, { index: next, role: 'next', t: '0' })
  if (leaving) layers.set(leaving.index, { index: leaving.index, role: 'leaving', t: String(leaving.progress) })
  layers.set(index, { index, role: 'current', t: `var(${PROGRESS_VAR})` })
  // A stable DOM order: moving a node would restart its fade.
  return [...layers.values()].sort((a, b) => a.index - b.index)
}

/** Stacking for each role: the current scene fades in over the one leaving. */
export const LAYER_Z = { next: 0, leaving: 1, current: 2 }

/** The scene's drawing, moving with its camera. */
export function SceneImage({ frame, t }: { frame: Frame; t: string }) {
  const url = useImageUrl(frame.imageId)
  const reduced = useReducedMotion()
  if (!url) return null
  const motion = reduced ? STILL : CAMERA_MOTION[frame.movement]
  return (
    <img
      src={url}
      alt={frame.description || frame.title}
      draggable={false}
      className="absolute inset-0 size-full object-contain grayscale will-change-transform select-none"
      style={{ transform: motionTransform(motion, t) }}
    />
  )
}
