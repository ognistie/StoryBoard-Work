import { ImageOff } from 'lucide-react'
import { useImageUrl } from '../lib/hooks'
import { cx } from './ui'

export function FrameImage({ imageId, alt, className, aspect = '16 / 9', children, fit = 'cover' }: { imageId?: string; alt: string; className?: string; aspect?: string; children?: React.ReactNode; fit?: 'cover' | 'contain' }) {
  const url = useImageUrl(imageId)
  return (
    <div className={cx('relative overflow-hidden bg-paper', className)} style={{ aspectRatio: aspect }}>
      {url ? (
        <img src={url} alt={alt} draggable={false} className={cx('absolute inset-0 size-full select-none', fit === 'cover' ? 'object-cover' : 'object-contain')} />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-[12px] text-neutral-400">
          {imageId ? <span className="size-full animate-pulse bg-neutral-200/60" /> : <><ImageOff className="size-5" />Sem imagem</>}
        </div>
      )}
      {children}
    </div>
  )
}
