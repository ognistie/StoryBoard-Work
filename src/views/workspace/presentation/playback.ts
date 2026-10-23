/** Where the presentation is: the scene, the seconds spent in it, and whether the clock runs. */
export interface Playback {
  index: number
  /** Seconds into the current scene. */
  elapsed: number
  status: 'playing' | 'paused' | 'ended'
}

export const START: Playback = { index: 0, elapsed: 0, status: 'playing' }

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

/** Moves the clock `dt` seconds forward, passing to the next scenes as each one runs out. */
export function advance(p: Playback, durations: number[], dt: number, loop: boolean): Playback {
  if (p.status !== 'playing') return p
  const last = durations.length - 1
  // With nothing to show, a loop would never use up `dt`.
  if (sum(durations) <= 0) return { index: last, elapsed: 0, status: 'ended' }
  let { index } = p
  let elapsed = p.elapsed + dt
  while (elapsed >= durations[index]) {
    if (index === last && !loop) return { index, elapsed: durations[index], status: 'ended' }
    elapsed -= durations[index]
    index = index === last ? 0 : index + 1
  }
  return { index, elapsed, status: 'playing' }
}

/** Previous or next scene, from its start. Next on the last scene ends the presentation, or goes back to the first with loop on. */
export function step(p: Playback, durations: number[], delta: 1 | -1, loop: boolean): Playback {
  const last = durations.length - 1
  const status = p.status === 'ended' ? 'paused' : p.status
  if (delta === 1 && p.index === last) return loop ? { index: 0, elapsed: 0, status } : { index: last, elapsed: durations[last], status: 'ended' }
  return { index: Math.min(Math.max(p.index + delta, 0), last), elapsed: 0, status }
}

/** Play and pause. Play after the end starts again from the first scene. */
export function toggle(p: Playback): Playback {
  if (p.status === 'ended') return START
  return { ...p, status: p.status === 'playing' ? 'paused' : 'playing' }
}

/** How much of the current scene has played, from 0 to 1. */
export function sceneProgress(p: Playback, durations: number[]): number {
  const duration = durations[p.index]
  return duration > 0 ? Math.min(p.elapsed / duration, 1) : 1
}

/** Seconds since the start of the first scene. */
export function clockAt(p: Playback, durations: number[]): number {
  return sum(durations.slice(0, p.index)) + p.elapsed
}

/** "0:13", with whole seconds. */
export function formatClock(seconds: number): string {
  const whole = Math.floor(seconds)
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}
