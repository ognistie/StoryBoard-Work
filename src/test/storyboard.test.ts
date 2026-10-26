import { describe, expect, it } from 'vitest'
import { planBriefingRequest, planBriefingResponse } from '../lib/ai/contract'
import { allocateDurations } from '../lib/ai/storyboard'

describe('cinematic storyboard contract', () => {
  it('preserves an exact runtime and positive duration for unequal shots', () => {
    const frames = [{ duration: 10, title: 'A' }, { duration: 8, title: 'B' }, { duration: 1, title: 'C' }]
    for (const total of [3, 15, 30, 60, 600]) {
      const next = allocateDurations(frames, total)
      expect(next.reduce((s, f) => s + f.duration, 0)).toBe(total)
      expect(next.every((f) => Number.isInteger(f.duration) && f.duration > 0)).toBe(true)
      expect(next.map((f) => f.title)).toEqual(['A', 'B', 'C'])
    }
    expect(frames[0].duration).toBe(10)
  })
  it('rejects impossible runtimes', () => {
    expect(() => allocateDurations([{ duration: 1 }, { duration: 1 }], 1)).toThrow()
  })
  it('rejects excessive runtime, empty briefs and unsafe reference types', () => {
    const valid = { briefing: 'Um filme', durationSeconds: 30, format: '16:9' }
    expect(planBriefingRequest.safeParse(valid).success).toBe(true)
    expect(planBriefingRequest.safeParse({ ...valid, durationSeconds: 601 }).success).toBe(false)
    expect(planBriefingRequest.safeParse({ ...valid, briefing: '  ' }).success).toBe(false)
    expect(planBriefingRequest.safeParse({ ...valid, attachment: { kind: 'image', name: 'x', dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' } }).success).toBe(false)
  })
  it('rejects zero-length shots in model output', () => {
    const frame = { title: 'A', description: 'B', action: 'C', dialogue: '', shot: 'geral', movement: 'estatico', characters: [], duration: 0 }
    expect(planBriefingResponse.safeParse({ projectName: 'Teste', scenes: [frame] }).success).toBe(false)
  })
})
