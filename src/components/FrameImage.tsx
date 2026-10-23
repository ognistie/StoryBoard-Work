import { useImageUrl } from '../lib/hooks'
import { cx } from './ui'

/** A stored drawing at a fixed aspect ratio, e.g. "9 / 16". */
export function FrameImage({ imageId, alt, aspect, className }: { imageId?: string; alt: string; aspect: string; className?: string }) {
  const url = useImageUrl(imageId)
  return (
    <div className={cx('relative overflow-hidden bg-surface-2', className)} style={{ aspectRatio: aspect }}>
      {url && <img src={url} alt={alt} draggable={false} className="absolute inset-0 size-full object-cover select-none" />}
    </div>
  )
}
