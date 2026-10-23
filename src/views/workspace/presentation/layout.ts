import { ASPECT_RATIO, type Aspect } from '../scene'

/**
 * Phone: the drawing covers the screen. Tablet: the desktop stage without the side columns, which need 1280px.
 * A short landscape phone also gets the phone layout, since a framed scene would be too small there.
 */
export type PresentationLayout = 'phone' | 'tablet' | 'desktop'

export function presentationLayout(width: number, height: number): PresentationLayout {
  if (width < 768 || height < 560) return 'phone'
  return width < 1280 ? 'tablet' : 'desktop'
}

/** Paper's 9:16 frame is 600px tall at 1440×900; the side columns sit 120px from the edges there. */
const FRAME_MAX = 600
/** Header, controls and gaps around the frame on desktop. The tablet caption adds the scene title. */
const CHROME = { desktop: 300, tablet: 344 }
const LEFT_COLUMN = 340
const COLUMN_GAP = 32

/** Distance from the screen edge to the side columns: 120px at 1440, in proportion elsewhere. */
export const columnInset = (width: number) => Math.round(width / 12)

/** The room for the scene's frame: its height in 9:16 and the widest any format may get. */
export function stageRoom(layout: Exclude<PresentationLayout, 'phone'>, width: number, height: number) {
  const tall = Math.min(FRAME_MAX, height - CHROME[layout])
  const wide = layout === 'desktop' ? width - 2 * (columnInset(width) + LEFT_COLUMN + COLUMN_GAP) : width - 80
  return { tall, wide }
}

/** A scene's frame in its own format. Every format covers the area of the 9:16 frame, narrowed if it gets too wide. */
export function frameSize(aspect: Aspect, room: { tall: number; wide: number }) {
  const ratio = ASPECT_RATIO[aspect]
  const area = room.tall * room.tall * ASPECT_RATIO['9:16']
  const width = Math.min(Math.sqrt(area * ratio), room.wide)
  return { width: Math.round(width), height: Math.round(width / ratio) }
}
