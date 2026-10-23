import type { CameraMove, ShotType } from './types'

/** Lowercase without accents, for keyword matching in PT-BR text. */
export function norm(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export const SHOT_LABEL: Record<ShotType, string> = {
  geral: 'Plano geral',
  conjunto: 'Plano de conjunto',
  aberto: 'Plano aberto',
  medio: 'Plano médio',
  americano: 'Plano americano',
  close: 'Close-up',
  'extreme-close': 'Extreme close-up',
  detalhe: 'Plano detalhe',
  pov: 'POV',
  ots: 'Over-the-shoulder',
  motion: 'Motion graphics',
}

export const MOVE_LABEL: Record<CameraMove, string> = {
  estatico: 'Estático',
  pan: 'Pan',
  tilt: 'Tilt',
  dolly: 'Dolly',
  'push-in': 'Push-in',
  tracking: 'Travelling',
  truck: 'Truck',
  zoom: 'Zoom',
  'zoom-out': 'Zoom out',
  handheld: 'Câmera na mão',
  crane: 'Grua',
  'time-lapse': 'Time-lapse',
}
