import type { CameraMove } from '../lib/types'

/**
 * Camera-movement notation drawn over a panel in red, the way storyboard
 * artists annotate boards (PAN arrow, TILT arrows, DOLLY corner arrows…).
 * It is a separate layer: the panel image is never modified.
 */

const RED = '#e3342f'

const LABEL: Record<CameraMove, [string, string]> = {
  estatico: ['', ''],
  pan: ['PAN', 'câmera gira na horizontal'],
  tilt: ['TILT', 'câmera gira na vertical'],
  dolly: ['DOLLY IN', 'câmera se aproxima'],
  zoom: ['ZOOM IN', 'lente aproxima'],
  tracking: ['TRACKING', 'câmera acompanha a ação'],
  truck: ['TRUCK', 'câmera desliza de lado'],
  handheld: ['CÂMERA NA MÃO', 'movimento orgânico'],
  crane: ['GRUA', 'câmera sobe'],
}

export function CameraOverlay({ movement, compact }: { movement: CameraMove; compact?: boolean }) {
  if (movement === 'estatico') return null
  const [label, hint] = LABEL[movement]
  const sw = { stroke: RED, strokeWidth: 2.6, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, vectorEffect: 'non-scaling-stroke' as const }
  const head = 'url(#cam-head)'
  return (
    <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 160 90" preserveAspectRatio="none" aria-label={`Movimento de câmera: ${label}`}>
      <defs>
        <marker id="cam-head" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={RED} />
        </marker>
      </defs>
      {movement === 'pan' && <path d="M22 82 Q80 70 140 80" {...sw} markerEnd={head} />}
      {movement === 'truck' && <path d="M24 12 L136 12" {...sw} markerEnd={head} />}
      {movement === 'tracking' && (
        <>
          <path d="M28 46 L128 46" {...sw} markerEnd={head} />
          <path d="M28 52 L110 52" {...sw} strokeWidth={1.4} opacity={0.7} />
        </>
      )}
      {movement === 'tilt' && (
        <>
          <path d="M10 12 L10 76" {...sw} markerEnd={head} />
          <path d="M150 12 L150 76" {...sw} markerEnd={head} />
        </>
      )}
      {(movement === 'dolly' || movement === 'zoom') &&
        [
          [6, 6, 22, 18],
          [154, 6, 138, 18],
          [6, 84, 22, 72],
          [154, 84, 138, 72],
        ].map(([x1, y1, x2, y2], i) => <path key={i} d={`M${x1} ${y1} L${x2} ${y2}`} {...sw} markerEnd={head} strokeDasharray={movement === 'zoom' ? '3 2' : undefined} />)}
      {movement === 'crane' && <path d="M20 80 Q30 22 120 14" {...sw} markerEnd={head} />}
      {movement === 'handheld' && <path d="M14 14 q4 -4 8 0 t8 0 t8 0 t8 0 t8 0" {...sw} />}
      <g transform={movement === 'pan' ? 'translate(22 62)' : movement === 'tilt' ? 'translate(16 6)' : movement === 'truck' ? 'translate(24 18)' : movement === 'crane' ? 'translate(24 60)' : movement === 'handheld' ? 'translate(14 20)' : movement === 'tracking' ? 'translate(28 30)' : 'translate(26 8)'}>
        <text x="0" y="6" fontSize="6.4" fontWeight="800" fill={RED} stroke="white" strokeWidth="1.6" paintOrder="stroke" fontFamily="Inter, Arial, sans-serif" letterSpacing="0.3">
          {label}
        </text>
        {!compact && (
          <text x="0" y="12.5" fontSize="4.2" fontWeight="600" fill={RED} stroke="white" strokeWidth="1.2" paintOrder="stroke" fontFamily="Inter, Arial, sans-serif">
            ({hint})
          </text>
        )}
      </g>
    </svg>
  )
}
