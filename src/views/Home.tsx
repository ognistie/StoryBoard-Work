import { useState } from 'react'
import { SettingsModal } from '../components/SettingsModal'
import { useSession, userById } from '../lib/session'
import { BriefingComposer } from './home/BriefingComposer'
import { Mural, type MuralItem } from './home/Mural'
import { ProjectCard } from './home/ProjectCard'
import { useProjectSummaries, type ProjectSummary } from './home/projectSummaries'

const VISIBLE_PROJECTS = 3

/** Takes the first drawing of each project, then the second, so the mural mixes projects. */
function muralItems(summaries: ProjectSummary[]): MuralItem[] {
  const deepest = Math.max(0, ...summaries.map((s) => s.imageIds.length))
  const items: MuralItem[] = []
  for (let i = 0; i < deepest; i++)
    for (const s of summaries) if (s.imageIds[i]) items.push({ imageId: s.imageIds[i], projectId: s.project.id })
  return items
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function Home() {
  const userId = useSession((s) => s.userId)
  const summaries = useProjectSummaries(userId) ?? []
  const [showAll, setShowAll] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const visible = showAll ? summaries : summaries.slice(0, VISIBLE_PROJECTS)
  const mural = muralItems(summaries)

  return (
    <div className="relative min-h-full overflow-hidden bg-bg bg-cover bg-center" style={{ backgroundImage: 'url(/bg-inicio.webp)' }}>
      <Mural items={mural} layout="edges" />

      <div className="relative mx-auto flex w-full max-w-[768px] flex-col px-5 pb-10 md:px-10 md:pb-24 xl:max-w-[808px] xl:px-6">
        <header className="flex h-[52px] items-center justify-between md:mt-7 md:h-[72px]">
          <span className="font-display text-[28px] leading-8 tracking-[-0.01em] text-fg">Decupa</span>
          <button
            aria-label="Configurações"
            onClick={() => setSettingsOpen(true)}
            className="flex size-8 items-center justify-center rounded-2xl border border-white/70 bg-white/55 text-[11px] leading-[14px] font-semibold text-fg backdrop-blur-lg backdrop-saturate-[1.8] transition-colors hover:bg-white/80"
          >
            {initials(userById(userId).name)}
          </button>
        </header>

        <main className="flex flex-col items-center gap-7 pt-9 md:gap-10 md:pt-[50px] xl:pt-[90px]">
          <div className="flex flex-col items-center gap-2.5 text-center md:gap-3.5">
            <h1 className="text-[34px] leading-10 font-medium tracking-[-0.035em] text-fg md:text-[48px] md:leading-[54px] xl:text-[54px] xl:leading-[60px]">O que vamos criar hoje?</h1>
            <p className="text-[16px] leading-6 tracking-[-0.005em] text-muted md:text-[18px] md:leading-[26px] xl:text-[19px] xl:leading-7">
              Cole o briefing. O roteiro e o storyboard aparecem cena por cena.
            </p>
          </div>

          <BriefingComposer />

          {summaries.length > 0 && (
            <section className="flex w-full flex-col gap-4 pt-5 md:gap-5 md:pt-9">
              <div className="flex items-baseline justify-between px-1">
                <h2 className="flex flex-col text-[22px] leading-7 font-medium tracking-[-0.025em] text-fg md:flex-row md:items-baseline md:gap-2 md:text-[24px] md:leading-[30px]">
                  <span>Seus projetos.</span> <span className="text-faint">Continue de onde parou.</span>
                </h2>
                {summaries.length > VISIBLE_PROJECTS && (
                  <button onClick={() => setShowAll((v) => !v)} className="text-[15px] leading-[18px] text-link hover:underline">
                    {showAll ? 'Ver menos' : 'Ver todos ›'}
                  </button>
                )}
              </div>
              {/* Phones scroll the projects sideways, with the next card peeking at the edge. */}
              <div className="-mx-5 -my-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:my-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:p-0">
                {visible.map((s) => (
                  <ProjectCard key={s.project.id} summary={s} />
                ))}
              </div>
            </section>
          )}

          <Mural items={mural} layout="footer" />
        </main>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
