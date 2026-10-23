import type { CameraMove, FrameContent, Project, Revision, ShotType } from '../../lib/types'

export type Aspect = Project['aspect']

export const FORMAT_LABEL: Record<Aspect, string> = {
  '9:16': 'Reels · 9:16',
  '1:1': 'Feed · 1:1',
  '16:9': 'YouTube · 16:9',
  '2.39:1': 'Cinema · 2.39:1',
}

/** Width/height of each format, as a number. */
export const ASPECT_RATIO: Record<Aspect, number> = { '9:16': 9 / 16, '1:1': 1, '16:9': 16 / 9, '2.39:1': 2.39 }

// Card widths from the Paper design: 200 for 9:16 and 260 for 1:1. The wide formats keep a similar area.
export const DEFAULT_CARD_WIDTH: Record<Aspect, number> = { '9:16': 200, '1:1': 260, '16:9': 340, '2.39:1': 380 }

export const SHOT_TAG: Record<ShotType, string> = {
  geral: 'GERAL',
  aberto: 'ABERTO',
  medio: 'MÉDIO',
  americano: 'AMERICANO',
  close: 'CLOSE',
  'extreme-close': 'SUPER CLOSE',
  detalhe: 'DETALHE',
  pov: 'POV',
  ots: 'OTS',
}

export const MOVE_TAG: Record<CameraMove, string> = {
  estatico: 'FIXA',
  pan: 'PAN',
  tilt: 'TILT',
  dolly: 'DOLLY',
  tracking: 'TRAVELLING',
  truck: 'TRUCK',
  zoom: 'ZOOM',
  handheld: 'NA MÃO',
  crane: 'GRUA',
}

/** Splits "LOCUÇÃO: Texto" into who speaks and the line. A line without a speaker keeps the whole text. */
export function parseDialogue(dialogue: string): { speaker?: string; line: string } {
  const first = dialogue.trim().split('\n')[0] ?? ''
  const m = first.match(/^([^:]{1,40}):\s*(.+)$/)
  return m ? { speaker: m[1].trim(), line: m[2].trim() } : { line: first }
}

export const quoted = (line: string) => (line ? `“${line.replace(/^[“"]|[”"]$/g, '')}”` : '')

const TEXT_KEYS: (keyof FrameContent)[] = ['title', 'description', 'action', 'dialogue', 'shot', 'movement', 'duration', 'aspect']

/** What a revision changed compared with its parent, in the words the versions panel uses. */
export function changeSummary(rev: Revision, parent?: Revision): string {
  if (!parent) return 'texto e desenho'
  const text = TEXT_KEYS.some((k) => JSON.stringify(rev.snapshot[k]) !== JSON.stringify(parent.snapshot[k]))
  const drawing = rev.snapshot.imageId !== parent.snapshot.imageId
  return text && drawing ? 'texto e desenho' : drawing ? 'desenho' : 'texto'
}
