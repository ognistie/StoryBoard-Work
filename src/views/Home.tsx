import { useState, type ReactNode } from 'react'
import { navigate } from '../App'
import { AccountButton } from '../components/AccountButton'
import { SettingsModal } from '../components/SettingsModal'
import { Avatar, Button, toastError } from '../components/ui'
import { useAuth } from '../lib/collab/auth'
import { ROLE_LABEL, type Invite } from '../lib/collab/contract'
import { acceptInvite, declineInvite, useRemote } from '../lib/collab/remote'
import { useSession } from '../lib/session'
import { BriefingComposer } from './home/BriefingComposer'
import { Mural, type MuralItem } from './home/Mural'
import { NavMenu, SECTION } from './home/NavMenu'
import { ProjectCard } from './home/ProjectCard'
import { useProjectSummaries, type ProjectSummary } from './home/projectSummaries'

const VISIBLE_PROJECTS = 3

/** What each example teaches. Keyed by client, the way the seed names them. */
const EXAMPLE_HINTS: Record<string, string> = {
  iugu: 'Abra as versões de uma cena: o briefing mudou e a IA refez só o que precisava.',
  'Café Moinho': 'Selecione uma cena e peça uma mudança na caixa de baixo, como “Mais curta”.',
  'Studio Vila': 'Aperte o play no topo e veja o storyboard tocando no tempo de cada cena.',
}
const EXAMPLE_FALLBACK = 'Abra, mude à vontade e veja como o plano reage.'

/** Takes the first drawing of each project, then the second, so the mural mixes projects. */
function muralItems(summaries: ProjectSummary[]): MuralItem[] {
  const deepest = Math.max(0, ...summaries.map((s) => s.imageIds.length))
  const items: MuralItem[] = []
  for (let i = 0; i < deepest; i++)
    for (const s of summaries) if (s.imageIds[i]) items.push({ imageId: s.imageIds[i], projectId: s.project.id })
  return items
}

const GRID =
  '-mx-5 -my-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:my-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:p-0'

function Section({ id, title, subtitle, action, children }: { id: string; title: string; subtitle: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="flex w-full scroll-mt-6 flex-col gap-4 pt-5 md:gap-5 md:pt-9">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 className="flex flex-col text-[22px] leading-7 font-medium tracking-[-0.025em] text-fg md:flex-row md:items-baseline md:gap-2 md:text-[24px] md:leading-[30px]">
          <span>{title}</span> <span className="text-faint">{subtitle}</span>
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function InviteRow({ invite }: { invite: Invite }) {
  const [busy, setBusy] = useState<'accept' | 'decline'>()
  const act = async (kind: 'accept' | 'decline') => {
    setBusy(kind)
    try {
      if (kind === 'accept') navigate(`/p/${(await acceptInvite(invite.token)).id}`)
      else await declineInvite(invite.token)
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(undefined)
    }
  }
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar id={invite.invitedByName} name={invite.invitedByName} size={36} />
        <p className="min-w-0 text-[14px] leading-5 text-fg-2">
          <span className="font-medium text-fg">{invite.invitedByName}</span> convidou você para <span className="font-medium text-fg">{invite.projectName}</span>
          <span className="text-muted"> · {ROLE_LABEL[invite.role]}</span>
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button loading={busy === 'decline'} disabled={!!busy} onClick={() => void act('decline')}>
          Recusar
        </Button>
        <Button variant="primary" loading={busy === 'accept'} disabled={!!busy} onClick={() => void act('accept')}>
          Entrar no projeto
        </Button>
      </div>
    </div>
  )
}

export function Home() {
  const userId = useSession((s) => s.userId)
  const user = useAuth((s) => s.user)
  const invites = useRemote((s) => s.invites)
  const summaries = useProjectSummaries(userId) ?? []
  const [showAll, setShowAll] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const mine = summaries.filter((s) => !s.project.example && (!s.project.remote || s.project.ownerId === userId))
  const shared = summaries.filter((s) => s.project.remote && s.project.ownerId !== userId)
  const examples = summaries.filter((s) => s.project.example)
  const visible = showAll ? mine : mine.slice(0, VISIBLE_PROJECTS)
  const mural = muralItems([...mine, ...shared, ...examples])
  const openSettings = () => setSettingsOpen(true)

  return (
    <div className="relative min-h-full overflow-hidden bg-bg bg-cover bg-center" style={{ backgroundImage: 'url(/bg-inicio.webp)' }}>
      <Mural items={mural} layout="edges" />

      <div className="relative mx-auto flex w-full max-w-[768px] flex-col px-5 pb-10 md:px-10 md:pb-24 xl:max-w-[808px] xl:px-6">
        <header className="flex h-[52px] items-center justify-between md:mt-7 md:h-[72px]">
          <div className="flex items-center gap-2">
            <NavMenu onSettings={openSettings} hasShared={shared.length > 0} />
            <span className="font-display text-[28px] leading-8 tracking-[-0.01em] text-fg">Decupa</span>
          </div>
          <AccountButton glass onSettings={openSettings} />
        </header>

        <main className="flex flex-col items-center gap-7 pt-9 md:gap-10 md:pt-[50px] xl:pt-[90px]">
          <div className="flex flex-col items-center gap-2.5 text-center md:gap-3.5">
            <h1 className="text-[34px] leading-10 font-medium tracking-[-0.035em] text-fg md:text-[48px] md:leading-[54px] xl:text-[54px] xl:leading-[60px]">O que vamos criar hoje?</h1>
            <p className="text-[16px] leading-6 tracking-[-0.005em] text-muted md:text-[18px] md:leading-[26px] xl:text-[19px] xl:leading-7">
              Cole o briefing. O roteiro e o storyboard aparecem cena por cena.
            </p>
          </div>

          <div id={SECTION.composer} className="w-full">
            <BriefingComposer />
          </div>

          {invites.length > 0 && (
            <Section id="convites" title="Convites." subtitle="Times esperando por você.">
              <div className="flex flex-col gap-2.5">
                {invites.map((i) => (
                  <InviteRow key={i.token} invite={i} />
                ))}
              </div>
            </Section>
          )}

          {mine.length > 0 && (
            <Section
              id={SECTION.mine}
              title="Seus projetos."
              subtitle="Continue de onde parou."
              action={
                mine.length > VISIBLE_PROJECTS && (
                  <button onClick={() => setShowAll((v) => !v)} className="shrink-0 text-[15px] leading-[18px] text-link hover:underline">
                    {showAll ? 'Ver menos' : 'Ver todos ›'}
                  </button>
                )
              }
            >
              <div className={GRID}>
                {visible.map((s) => (
                  <ProjectCard key={s.project.id} summary={s} />
                ))}
              </div>
            </Section>
          )}

          {shared.length > 0 && (
            <Section id={SECTION.shared} title="Compartilhados comigo." subtitle="Projetos do seu time.">
              <div className={GRID}>
                {shared.map((s) => (
                  <ProjectCard key={s.project.id} summary={s} />
                ))}
              </div>
            </Section>
          )}

          {examples.length > 0 && (
            <Section id={SECTION.examples} title="Exemplos para explorar." subtitle={user ? 'Mexa à vontade.' : 'Abra e mexa à vontade.'}>
              <div className={GRID}>
                {examples.map((s) => (
                  <ProjectCard key={s.project.id} summary={s} hint={EXAMPLE_HINTS[s.project.client] ?? EXAMPLE_FALLBACK} />
                ))}
              </div>
            </Section>
          )}

          <Mural items={mural} layout="footer" />
        </main>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
