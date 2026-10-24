import { Avatar, cx } from '../../components/ui'
import { timeAgo, useImageUrl } from '../../lib/hooks'
import { userById } from '../../lib/session'
import type { ProjectSummary } from './projectSummaries'

function Tile({ imageId, className }: { imageId?: string; className?: string }) {
  const url = useImageUrl(imageId)
  return <div className={className} style={{ backgroundColor: '#fff', backgroundImage: url ? `url(${url})` : undefined, backgroundSize: 'cover', backgroundPosition: '50%' }} />
}

/**
 * A project as a mosaic of its first three drawings: one large, two stacked.
 * `hint` replaces the time with what to try (examples); shared projects show their members.
 */
export function ProjectCard({ summary, hint }: { summary: ProjectSummary; hint?: string }) {
  const { project, imageIds, sceneCount, seconds } = summary
  const people = project.remote ? project.members.slice(0, 3) : []
  return (
    <a
      href={`#/p/${project.id}`}
      className="group flex w-[300px] min-w-0 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.04),0_4px_16px_rgb(0_0_0/0.04)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgb(0_0_0/0.05),0_12px_28px_rgb(0_0_0/0.08)] md:w-auto"
    >
      <div className="relative flex h-[186px] shrink-0 gap-0.5 border-b border-line bg-line md:h-[150px]">
        <Tile imageId={imageIds[0]} className="min-w-0 flex-[2]" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Tile imageId={imageIds[1]} className="flex-1" />
          <Tile imageId={imageIds[2]} className="flex-1" />
        </div>
        {project.example && <span className="glass absolute top-2.5 left-2.5 flex h-6 items-center rounded-full px-2.5 text-[11px] leading-[14px] font-semibold text-fg">Exemplo</span>}
      </div>
      <div className="flex flex-col gap-1 px-3.5 pt-3 pb-3.5">
        <h3 className="truncate text-[15px] leading-[18px] font-medium tracking-[-0.01em] text-fg">{project.name}</h3>
        <div className="flex items-center justify-between gap-2">
          <span className="shrink-0 text-[13px] leading-4 text-muted">
            {sceneCount} {sceneCount === 1 ? 'cena' : 'cenas'} · {seconds}s
          </span>
          {people.length > 0 ? (
            <span className="flex -space-x-1.5">
              {people.map((m) => (
                <Avatar key={m.userId} id={m.userId} name={userById(m.userId).name} size={20} className="ring-2 ring-white" />
              ))}
            </span>
          ) : (
            !hint && <span className="text-[12px] leading-4 text-faint">{timeAgo(project.updatedAt)}</span>
          )}
        </div>
        {hint && <p className={cx('text-[12px] leading-4 text-muted')}>{hint}</p>}
      </div>
    </a>
  )
}
