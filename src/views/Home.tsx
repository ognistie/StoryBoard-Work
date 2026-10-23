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

  return (
    <div className="relative min-h-full overflow-hidden bg-bg bg-cover bg-center" style={{ backgroundImage: 'url(/bg-inicio.webp)' }}>
      <Mural items={muralItems(summaries)} />

      <div className="relative mx-auto flex w-full max-w-[808px] flex-col px-6 pb-24">
        <header className="mt-7 flex h-[72px] items-center justify-between">
          <span className="font-display text-[28px] leading-8 tracking-[-0.01em] text-fg">Decupa</span>
          <button
            aria-label="Configurações"
            onClick={() => setSettingsOpen(true)}
            className="flex size-8 items-center justify-center rounded-2xl border border-white/70 bg-white/55 text-[11px] leading-[14px] font-semibold text-fg backdrop-blur-lg backdrop-saturate-[1.8] transition-colors hover:bg-white/80"
          >
            {initials(userById(userId).name)}
          </button>
        </header>

        <main className="flex flex-col items-center gap-10 pt-[90px]">
          <div className="flex flex-col items-center gap-3.5 text-center">
            <h1 className="text-[40px] leading-[46px] font-medium tracking-[-0.035em] text-fg sm:text-[54px] sm:leading-[60px]">O que vamos criar hoje?</h1>
            <p className="text-[17px] leading-7 tracking-[-0.005em] text-muted sm:text-[19px]">Cole o briefing. O roteiro e o storyboard aparecem cena por cena.</p>
          </div>

          <BriefingComposer />

          {summaries.length > 0 && (
            <section className="flex w-full flex-col gap-5 pt-9">
              <div className="flex items-baseline justify-between px-1">
                <h2 className="flex items-baseline gap-2 text-[24px] leading-[30px] font-medium tracking-[-0.025em] text-fg">
                  <span>Seus projetos.</span> <span className="text-faint">Continue de onde parou.</span>
                </h2>
                {summaries.length > VISIBLE_PROJECTS && (
                  <button onClick={() => setShowAll((v) => !v)} className="text-[15px] leading-[18px] text-link hover:underline">
                    {showAll ? 'Ver menos' : 'Ver todos ›'}
                  </button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {visible.map((s) => (
                  <ProjectCard key={s.project.id} summary={s} />
                ))}
              </div>
            </section>
          )}
        </main>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
