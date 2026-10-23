import type { CameraMove } from '../../../lib/types'

/** How the image sits in its frame: scale, and offset in % of its own size. */
export interface Pose {
  scale: number
  x: number
  y: number
}

/** The image's pose at the start and at the end of the scene. */
export interface Motion {
  from: Pose
  to: Pose
}

const REST: Pose = { scale: 1, x: 0, y: 0 }
const CLOSE: Pose = { scale: 1.06, x: 0, y: 0 }

export const STILL: Motion = { from: REST, to: REST }
const PUSH_IN: Motion = { from: REST, to: CLOSE }
const PULL_OUT: Motion = { from: CLOSE, to: REST }
// Slides stay zoomed in, so the frame never reaches the image's edge: 6% of extra size leaves 3% on each side.
const SLIDE: Motion = { from: { scale: 1.06, x: -2, y: 0 }, to: { scale: 1.06, x: 2, y: 0 } }
const RISE: Motion = { from: { scale: 1.06, x: 0, y: 2 }, to: { scale: 1.06, x: 0, y: -2 } }

/** A gentle move for each camera, so the still drawing hints at the shot. */
export const CAMERA_MOTION: Record<CameraMove, Motion> = {
  estatico: STILL,
  'push-in': PUSH_IN,
  zoom: PUSH_IN,
  dolly: PUSH_IN,
  'zoom-out': PULL_OUT,
  pan: SLIDE,
  tracking: SLIDE,
  truck: SLIDE,
  tilt: RISE,
  crane: RISE,
  handheld: STILL,
  'time-lapse': STILL,
}

/** The CSS transform along a motion. `t` is any CSS number from 0 to 1, such as a custom property. */
export function motionTransform({ from, to }: Motion, t: string): string {
  const along = (a: number, b: number) => (a === b ? `${a}` : `calc(${a} + ${+(b - a).toFixed(4)} * ${t})`)
  return `translate(calc(${along(from.x, to.x)} * 1%), calc(${along(from.y, to.y)} * 1%)) scale(${along(from.scale, to.scale)})`
}
