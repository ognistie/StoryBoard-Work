import { describe, expect, it } from 'vitest'
import { CAMERA_MOTION, motionTransform, STILL } from '../views/workspace/presentation/motion'
import { frameSize, presentationLayout, stageRoom } from '../views/workspace/presentation/layout'
import { advance, clockAt, formatClock, sceneProgress, START, step, toggle, type Playback } from '../views/workspace/presentation/playback'

// The iugu Reels: 4 + 7 + 6 + 7 + 6 = 30s.
const IUGU = [4, 7, 6, 7, 6]
const at = (index: number, elapsed: number, status: Playback['status'] = 'playing'): Playback => ({ index, elapsed, status })

describe('advance', () => {
  it('stays on a scene until its duration runs out', () => {
    expect(advance(START, IUGU, 3.9, false)).toEqual(at(0, 3.9))
    const next = advance(at(0, 3.9), IUGU, 0.2, false)
    expect(next.index).toBe(1)
    expect(next.elapsed).toBeCloseTo(0.1)
  })

  it('carries the extra time over to the next scenes', () => {
    expect(advance(START, IUGU, 12, false)).toEqual(at(2, 1))
  })

  it('stops on the last scene, full, at the end', () => {
    expect(advance(at(4, 5), IUGU, 2, false)).toEqual(at(4, 6, 'ended'))
  })

  it('goes back to the first scene with loop on', () => {
    expect(advance(at(4, 5), IUGU, 2, true)).toEqual(at(0, 1))
  })

  it('does not move while paused or ended', () => {
    expect(advance(at(2, 1, 'paused'), IUGU, 5, false)).toEqual(at(2, 1, 'paused'))
    expect(advance(at(4, 6, 'ended'), IUGU, 5, true)).toEqual(at(4, 6, 'ended'))
  })

  it('ends instead of spinning when no scene has a duration', () => {
    expect(advance(START, [0, 0], 1, true).status).toBe('ended')
  })
})

describe('step', () => {
  it('moves to the start of the next or previous scene', () => {
    expect(step(at(2, 3), IUGU, 1, false)).toEqual(at(3, 0))
    expect(step(at(2, 3), IUGU, -1, false)).toEqual(at(1, 0))
  })

  it('restarts the first scene when going back from it', () => {
    expect(step(at(0, 3), IUGU, -1, false)).toEqual(at(0, 0))
  })

  it('ends on next from the last scene, or loops with loop on', () => {
    expect(step(at(4, 2), IUGU, 1, false)).toEqual(at(4, 6, 'ended'))
    expect(step(at(4, 2, 'paused'), IUGU, 1, true)).toEqual(at(0, 0, 'paused'))
  })

  it('leaves the end paused when going back', () => {
    expect(step(at(4, 6, 'ended'), IUGU, -1, false)).toEqual(at(3, 0, 'paused'))
  })
})

describe('toggle', () => {
  it('pauses and resumes where it was', () => {
    expect(toggle(at(2, 1.5))).toEqual(at(2, 1.5, 'paused'))
    expect(toggle(at(2, 1.5, 'paused'))).toEqual(at(2, 1.5))
  })

  it('plays again from scene 1 after the end', () => {
    expect(toggle(at(4, 6, 'ended'))).toEqual(START)
  })
})

describe('progress and clock', () => {
  it('fills the current scene in proportion to its duration', () => {
    expect(sceneProgress(at(2, 2), IUGU)).toBeCloseTo(1 / 3)
    expect(sceneProgress(at(4, 6, 'ended'), IUGU)).toBe(1)
  })

  it('counts the time from the first scene', () => {
    expect(clockAt(at(2, 2), IUGU)).toBe(13)
    expect(formatClock(clockAt(at(2, 2), IUGU))).toBe('0:13')
    expect(formatClock(30)).toBe('0:30')
    expect(formatClock(75.9)).toBe('1:15')
  })
})

describe('camera motion', () => {
  it('zooms in for push-in and zoom, from 1 to 1.06', () => {
    for (const move of ['push-in', 'zoom'] as const) {
      expect(CAMERA_MOTION[move].from.scale).toBe(1)
      expect(CAMERA_MOTION[move].to.scale).toBe(1.06)
    }
  })

  it('zooms out for zoom out', () => {
    expect(CAMERA_MOTION['zoom-out'].from.scale).toBe(1.06)
    expect(CAMERA_MOTION['zoom-out'].to.scale).toBe(1)
  })

  it('slides sideways for pan, travelling and truck, without showing the edge', () => {
    for (const move of ['pan', 'tracking', 'truck'] as const) {
      const { from, to } = CAMERA_MOTION[move]
      expect(from.x).toBeLessThan(to.x)
      expect(from.scale).toBe(to.scale)
      // Each side has (scale - 1) / 2 of extra image to slide over.
      expect(Math.max(Math.abs(from.x), Math.abs(to.x)) / 100).toBeLessThanOrEqual((from.scale - 1) / 2)
    }
  })

  it('keeps a fixed camera still', () => {
    expect(CAMERA_MOTION.estatico).toEqual(STILL)
    expect(motionTransform(STILL, 'var(--p)')).toBe('translate(calc(0 * 1%), calc(0 * 1%)) scale(1)')
  })

  it('writes the progress into the transform', () => {
    expect(motionTransform(CAMERA_MOTION['push-in'], 'var(--p)')).toBe('translate(calc(0 * 1%), calc(0 * 1%)) scale(calc(1 + 0.06 * var(--p)))')
  })
})

describe('layout', () => {
  it('picks the phone layout below 768px wide or 560px tall', () => {
    expect(presentationLayout(390, 844)).toBe('phone')
    expect(presentationLayout(844, 390)).toBe('phone')
    expect(presentationLayout(768, 1024)).toBe('tablet')
    expect(presentationLayout(1440, 900)).toBe('desktop')
  })

  it('makes the 9:16 frame 600px tall at 1440×900, as in Paper', () => {
    expect(frameSize('9:16', stageRoom('desktop', 1440, 900))).toEqual({ width: 338, height: 600 })
  })

  it('gives 1:1 the same area as 9:16', () => {
    expect(frameSize('1:1', stageRoom('desktop', 1440, 900))).toEqual({ width: 450, height: 450 })
  })

  it('narrows wide formats to fit between the side columns', () => {
    expect(frameSize('16:9', stageRoom('desktop', 1440, 900)).width).toBeLessThanOrEqual(456)
  })

  it('shrinks the frame on short screens', () => {
    expect(frameSize('9:16', stageRoom('desktop', 1440, 800)).height).toBe(500)
  })
})
