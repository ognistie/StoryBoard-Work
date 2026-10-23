import { useRef, useState } from 'react'
import { useImageUrl } from '../lib/hooks'
import { cx, Segmented } from './ui'

/**
 * Before/after comparison. "slider" overlays both images with a draggable
 * divider; "side" shows them next to each other. Keyboard accessible.
 */
export function CompareSlider({
  beforeId,
  afterId,
  beforeLabel = 'Antes',
  afterLabel = 'Depois',
  className,
  defaultMode = 'slider',
  showModes = true,
}: {
  beforeId?: string
  afterId?: string
  beforeLabel?: string
  afterLabel?: string
  className?: string
  defaultMode?: 'slider' | 'side'
  showModes?: boolean
}) {
  const [mode, setMode] = useState<'slider' | 'side'>(defaultMode)
  const [pos, setPos] = useState(50)
  const ref = useRef<HTMLDivElement>(null)
  const before = useImageUrl(beforeId)
  const after = useImageUrl(afterId)

  const move = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)))
  }

  return (
    <div className={cx('space-y-2', className)}>
      {showModes && (
        <div className="flex justify-end">
          <Segmented
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'slider', label: 'Sobrepor' },
              { value: 'side', label: 'Lado a lado' },
            ]}
          />
        </div>
      )}
      {mode === 'side' ? (
        <div className="grid grid-cols-2 gap-2">
          {[
            [before, beforeLabel],
            [after, afterLabel],
          ].map(([url, label]) => (
            <figure key={label} className="space-y-1">
              <div className="relative aspect-video overflow-hidden rounded-lg border border-line bg-paper">
                {url && <img src={url} alt={label} className="absolute inset-0 size-full object-cover" />}
              </div>
              <figcaption className="text-[11px] font-medium text-muted">{label}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div
          ref={ref}
          className="relative aspect-video cursor-ew-resize touch-none overflow-hidden rounded-lg border border-line bg-paper select-none"
          onPointerDown={(e) => {
            ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
            move(e.clientX)
          }}
          onPointerMove={(e) => e.buttons === 1 && move(e.clientX)}
        >
          {after && <img src={after} alt={afterLabel} draggable={false} className="absolute inset-0 size-full object-cover" />}
          {before && (
            <img
              src={before}
              alt={beforeLabel}
              draggable={false}
              className="absolute inset-0 size-full object-cover"
              style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
            />
          )}
          <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" style={{ left: `${pos}%` }}>
            <div className="absolute top-1/2 left-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[10px] font-bold text-neutral-700 shadow-md">⇆</div>
          </div>
          <span className="absolute top-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10.5px] font-medium text-white">{beforeLabel}</span>
          <span className="absolute top-2 right-2 rounded-md bg-accent px-1.5 py-0.5 text-[10.5px] font-medium text-white">{afterLabel}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={pos}
            onChange={(e) => setPos(Number(e.target.value))}
            aria-label="Comparar antes e depois"
            className="absolute inset-x-0 bottom-0 h-6 opacity-0"
          />
        </div>
      )}
    </div>
  )
}
