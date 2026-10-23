import { useRef, useState } from 'react'
import { FrameImage } from '../../components/FrameImage'
import type { Region } from '../../lib/types'

/** Drag a rectangle over the frame to restrict the AI edit to that area. */
export function RegionPicker({ imageId, value, onChange }: { imageId?: string; value?: Region; onChange: (r?: Region) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [start, setStart] = useState<{ x: number; y: number } | null>(null)
  const [draft, setDraft] = useState<Region | undefined>(value)

  const pt = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }
  }
  const shown = start ? draft : value

  return (
    <div
      ref={ref}
      className="relative cursor-crosshair touch-none overflow-hidden rounded-lg border border-line select-none"
      onPointerDown={(e) => {
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        const p = pt(e)
        setStart(p)
        setDraft({ x: p.x, y: p.y, w: 0, h: 0 })
      }}
      onPointerMove={(e) => {
        if (!start) return
        const p = pt(e)
        setDraft({ x: Math.min(p.x, start.x), y: Math.min(p.y, start.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) })
      }}
      onPointerUp={() => {
        setStart(null)
        onChange(draft && draft.w > 0.03 && draft.h > 0.03 ? draft : undefined)
      }}
    >
      <FrameImage imageId={imageId} alt="Selecione a área a alterar" />
      {shown && shown.w > 0 && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-black/35" style={{ clipPath: `polygon(0 0,100% 0,100% 100%,0 100%,0 ${shown.y * 100}%,${shown.x * 100}% ${shown.y * 100}%,${shown.x * 100}% ${(shown.y + shown.h) * 100}%,${(shown.x + shown.w) * 100}% ${(shown.y + shown.h) * 100}%,${(shown.x + shown.w) * 100}% ${shown.y * 100}%,0 ${shown.y * 100}%)` }} />
          <div
            className="pointer-events-none absolute rounded-sm border-2 border-dashed border-accent"
            style={{ left: `${shown.x * 100}%`, top: `${shown.y * 100}%`, width: `${shown.w * 100}%`, height: `${shown.h * 100}%` }}
          />
        </>
      )}
      {!shown && <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] font-medium text-white drop-shadow">Arraste para marcar a área que pode mudar</div>}
    </div>
  )
}
