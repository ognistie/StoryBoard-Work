import { timeAgo, useImageUrl } from '../../lib/hooks'
import type { ProjectSummary } from './projectSummaries'

function Tile({ imageId, className }: { imageId?: string; className?: string }) {
  const url = useImageUrl(imageId)
  return <div className={className} style={{ backgroundColor: '#fff', backgroundImage: url ? `url(${url})` : undefined, backgroundSize: 'cover', backgroundPosition: '50%' }} />
}

/** A project as a mosaic of its first three drawings: one large, two stacked. */
export function ProjectCard({ summary }: { summary: ProjectSummary }) {
  const { project, imageIds, sceneCount, seconds } = summary
  return (
    <a
      href={`#/p/${project.id}`}
      className="group flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.04),0_4px_16px_rgb(0_0_0/0.04)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgb(0_0_0/0.05),0_12px_28px_rgb(0_0_0/0.08)]"
    >
      <div className="flex h-[150px] shrink-0 gap-0.5 border-b border-line bg-line">
        <Tile imageId={imageIds[0]} className="min-w-0 flex-[2]" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Tile imageId={imageIds[1]} className="flex-1" />
          <Tile imageId={imageIds[2]} className="flex-1" />
        </div>
      </div>
      <div className="flex flex-col gap-1 px-3.5 pt-3 pb-3.5">
        <h3 className="truncate text-[15px] leading-[18px] font-medium tracking-[-0.01em] text-fg">{project.name}</h3>
        <div className="flex items-center justify-between">
          <span className="text-[13px] leading-4 text-muted">
            {sceneCount} {sceneCount === 1 ? 'cena' : 'cenas'} · {seconds}s
          </span>
          <span className="text-[12px] leading-4 text-faint">{timeAgo(project.updatedAt)}</span>
        </div>
      </div>
    </a>
  )
}
