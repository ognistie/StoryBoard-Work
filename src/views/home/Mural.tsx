import type { CSSProperties } from 'react'
import { useImageUrl } from '../../lib/hooks'

export interface MuralItem {
  imageId: string
  projectId: string
}

interface Slot {
  style: CSSProperties
  imageHeight: number
  imageRadius: number
  faded?: boolean
}

// Placement from the Paper design. Cards on the right are anchored to the right edge.
const LAYOUTS = {
  // Desktop, 1440px wide: four cards around the content, measured from the top of the page.
  edges: {
    className: 'pointer-events-none absolute inset-0 hidden xl:block',
    slots: [
      { style: { left: -32, top: 189, width: 250, rotate: '-8deg' }, imageHeight: 214, imageRadius: 9 },
      { style: { right: -72, top: 140, width: 250, rotate: '7deg' }, imageHeight: 214, imageRadius: 9 },
      { style: { left: -63, top: 589, width: 188, rotate: '-7deg' }, imageHeight: 158, imageRadius: 8, faded: true },
      { style: { right: -30, top: 566, width: 194, rotate: '-14deg' }, imageHeight: 164, imageRadius: 8, faded: true },
    ],
  },
  // Tablet: two cards below the projects. The strip is centred in the column and as wide as the window, so the cards reach its edges.
  footer: {
    className: 'pointer-events-none relative hidden h-[194px] w-screen shrink-0 md:block xl:hidden',
    slots: [
      { style: { left: -36, top: 66, width: 180, rotate: '-8deg' }, imageHeight: 149, imageRadius: 9 },
      { style: { right: -24, top: 54, width: 180, rotate: '7deg' }, imageHeight: 149, imageRadius: 9 },
    ],
  },
} satisfies Record<string, { className: string; slots: Slot[] }>

function MuralCard({ item, slot }: { item: MuralItem; slot: Slot }) {
  const url = useImageUrl(item.imageId)
  return (
    <a
      href={`#/p/${item.projectId}`}
      tabIndex={-1}
      style={{ ...slot.style, transformOrigin: '0 0' }}
      className={`pointer-events-auto absolute flex flex-col rounded-[14px] bg-white px-2 pt-1.5 pb-[22.5px] shadow-[0_2px_4px_rgb(0_0_0/0.06),0_24px_48px_rgb(0_0_0/0.14)] transition-[opacity,translate] duration-300 hover:-translate-y-1 ${slot.faded ? 'opacity-60 hover:opacity-100' : ''}`}
    >
      <div className="w-full bg-surface-2 bg-cover bg-center" style={{ height: slot.imageHeight, borderRadius: slot.imageRadius, backgroundImage: url ? `url(${url})` : undefined }} />
    </a>
  )
}

/** Storyboard frames from recent projects, pinned around the home screen. Each opens its project. Hidden on phones. */
export function Mural({ items, layout }: { items: MuralItem[]; layout: keyof typeof LAYOUTS }) {
  const { className, slots } = LAYOUTS[layout]
  return (
    <div aria-hidden className={className}>
      {items.slice(0, slots.length).map((item, i) => (
        <MuralCard key={item.imageId} item={item} slot={slots[i]} />
      ))}
    </div>
  )
}
