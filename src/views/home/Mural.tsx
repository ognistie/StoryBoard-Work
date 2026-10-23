import type { CSSProperties } from 'react'
import { useImageUrl } from '../../lib/hooks'

export interface MuralItem {
  imageId: string
  projectId: string
}

// Placement from the Paper design at 1440px wide. Cards on the right are anchored to the right edge.
const SLOTS: { style: CSSProperties; imageHeight: number; faded?: boolean }[] = [
  { style: { left: -32, top: 189, width: 250, rotate: '-8deg' }, imageHeight: 214 },
  { style: { right: -72, top: 140, width: 250, rotate: '7deg' }, imageHeight: 214 },
  { style: { left: -63, top: 589, width: 188, rotate: '-7deg' }, imageHeight: 158, faded: true },
  { style: { right: -30, top: 566, width: 194, rotate: '-14deg' }, imageHeight: 164, faded: true },
]

function MuralCard({ item, slot }: { item: MuralItem; slot: (typeof SLOTS)[number] }) {
  const url = useImageUrl(item.imageId)
  return (
    <a
      href={`#/p/${item.projectId}`}
      tabIndex={-1}
      style={{ ...slot.style, transformOrigin: '0 0' }}
      className={`pointer-events-auto absolute flex flex-col rounded-[14px] bg-white px-2 pt-1.5 pb-[22px] shadow-[0_2px_4px_rgb(0_0_0/0.06),0_24px_48px_rgb(0_0_0/0.14)] transition-[opacity,translate] duration-300 hover:-translate-y-1 ${slot.faded ? 'opacity-60 hover:opacity-100' : ''}`}
    >
      <div className="w-full rounded-[9px] bg-surface-2 bg-cover bg-center" style={{ height: slot.imageHeight, backgroundImage: url ? `url(${url})` : undefined }} />
    </a>
  )
}

/** Storyboard frames from recent projects, pinned around the edges of the home screen. Each opens its project. */
export function Mural({ items }: { items: MuralItem[] }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden min-[1280px]:block">
      {items.slice(0, SLOTS.length).map((item, i) => (
        <MuralCard key={item.imageId} item={item} slot={SLOTS[i]} />
      ))}
    </div>
  )
}
