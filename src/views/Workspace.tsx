import { BookOpen, Boxes, Clapperboard, FileText, History, Lock, Play, Share2, Users } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { Logo, ProviderBadge, UserMenu } from '../components/Shell'
import { Avatar, Button, cx, Empty, toast } from '../components/ui'
import { useProjectData } from '../lib/hooks'
import { onNotice, usePresence } from '../lib/presence'
import { roleIn, useSession, userById } from '../lib/session'
import { AssetsView } from './workspace/AssetsView'
import { Canvas } from './workspace/Canvas'
import { orderedFrames, WorkspaceCtx, type WorkspaceData } from './workspace/context'
import { ContextView } from './workspace/ContextView'
import { DiffModal } from './workspace/DiffModal'
import { ExportMenu } from './workspace/ExportMenu'
import { HistoryView } from './workspace/HistoryView'
import { Presentation } from './workspace/Presentation'
import { RightPanel } from './workspace/RightPanel'
import { ScriptView } from './workspace/ScriptView'
import { ShareModal } from './workspace/ShareModal'
import { Sidebar } from './workspace/Sidebar'
import { useWS, type TopTab } from './workspace/store'
import { TeamView } from './workspace/TeamView'
import { Viewer } from './workspace/Viewer'

const TABS: { id: TopTab; label: string; icon: React.ReactNode }[] = [
  { id: 'storyboard', label: 'Storyboard', icon: <Clapperboard className="size-4" /> },
  { id: 'script', label: 'Roteiro', icon: <FileText className="size-4" /> },
  { id: 'context', label: 'Contexto', icon: <BookOpen className="size-4" /> },
  { id: 'assets', label: 'Assets', icon: <Boxes className="size-4" /> },
  { id: 'history', label: 'Histórico', icon: <History className="size-4" /> },
  { id: 'team', label: 'Equipe', icon: <Users className="size-4" /> },
]

export function Workspace({ projectId }: { projectId: string }) {
  const userId = useSession((s) => s.userId)
  const data = useProjectData(projectId)
  const ws = useWS()
  const role = roleIn(data.project, userId)
  const updatePresence = usePresence((s) => s.update)
  const peers = usePresence((s) => s.peers)

  useEffect(() => {
    useWS.getState().reset()
  }, [projectId])

  useEffect(() => {
    updatePresence({ userId, projectId, frameId: ws.focusId })
  }, [userId, projectId, ws.focusId, updatePresence])

  // notifications from other tabs (comments, proposals, decisions)
  useEffect(
    () =>
      onNotice((n) => {
        if (n.projectId !== projectId || n.userId === userId) return
        toast(
          <span>
            <b>{userById(n.userId).name.split(' ')[0]}</b> {n.text}
          </span>,
          {
            tone: 'accent',
            action: n.frameId ? { label: 'Ver', onClick: () => useWS.getState().openPanel('comments', n.frameId) } : undefined,
          },
        )
      }),
    [projectId, userId],
  )

  // toast when AI results finish while the user is elsewhere
  const readyRef = useRef<Set<string>>(new Set())
  const mountedAt = useRef(Date.now())
  useEffect(() => {
    const ready = data.jobs.filter((j) => j.status === 'ready' && j.decision === 'pending' && j.createdBy === userId)
    const fresh = ready.filter((j) => !readyRef.current.has(j.id) && j.createdAt > mountedAt.current)
    const { rightOpen, panel } = useWS.getState()
    const reviewing = rightOpen && panel === 'ai'
    if (fresh.length && !reviewing && !data.jobs.some((j) => j.createdBy === userId && ['queued', 'preparing', 'generating', 'refining'].includes(j.status))) {
      toast(`${fresh.length === 1 ? 'Nova prévia pronta' : 'Prévias prontas'} para revisão`, {
        tone: 'accent',
        action: { label: 'Revisar', onClick: () => useWS.getState().openPanel('ai') },
      })
    }
    if (!fresh.length || data.jobs.some((j) => j.createdBy === userId && ['queued', 'preparing', 'generating', 'refining'].includes(j.status))) return
    ready.forEach((j) => readyRef.current.add(j.id))
  }, [data.jobs, userId])

  const others = useMemo(() => {
    const seen = new Map<string, string | undefined>()
    for (const p of Object.values(peers)) if (p.projectId === projectId && p.userId !== userId) seen.set(p.userId, p.frameId)
    return [...seen.entries()]
  }, [peers, projectId, userId])

  if (data.loading) return <div className="flex h-full items-center justify-center text-[13px] text-muted">Carregando projeto…</div>
  if (!data.project)
    return (
      <div className="flex h-full items-center justify-center">
        <Empty title="Projeto não encontrado" action={<Button onClick={() => (location.hash = '/')}>Voltar</Button>} />
      </div>
    )
  if (!role)
    return (
      <div className="flex h-full flex-col">
        <header className="flex h-14 items-center justify-between border-b border-line px-4">
          <Logo />
          <UserMenu projectId={projectId} />
        </header>
        <div className="flex flex-1 items-center justify-center">
          <Empty icon={<Lock />} title="Você não tem acesso a este projeto" action={<Button onClick={() => (location.hash = '/')}>Ir para meus projetos</Button>}>
            {userById(userId).name} não é membro de “{data.project.name}”. Peça um link de convite a um produtor.
          </Empty>
        </div>
      </div>
    )

  const wd: WorkspaceData = {
    project: data.project,
    scenes: data.scenes,
    frames: data.frames,
    ordered: orderedFrames(data.frames, data.scenes),
    assets: data.assets,
    comments: data.comments,
    jobs: data.jobs,
    proposals: data.proposals,
    role,
    userId,
  }

  return (
    <WorkspaceCtx.Provider value={wd}>
      <div className="flex h-full flex-col">
        <header className="z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-3">
          <Logo compact />
          <div className="min-w-0 border-l border-line pl-3">
            <div className="truncate text-[13.5px] font-semibold tracking-tight">{data.project.name}</div>
            <div className="truncate text-[11.5px] text-muted">
              {data.project.client} · {data.project.producer}
            </div>
          </div>
          <nav className="ml-3 flex min-w-0 items-center gap-0.5" aria-label="Seções do projeto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => ws.set({ tab: t.id })}
                aria-current={ws.tab === t.id ? 'page' : undefined}
                className={cx(
                  'flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                  ws.tab === t.id ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg',
                )}
                title={t.label}
              >
                {t.icon}
                <span className={cx(t.id !== 'storyboard' && 'hidden 2xl:inline')}>{t.label}</span>
              </button>
            ))}
          </nav>
          <div className="flex-1" />
          {others.length > 0 && (
            <div className="hidden items-center gap-1.5 lg:flex" aria-label="Pessoas online">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-ok" />
              </span>
              <div className="flex -space-x-1.5">
                {others.map(([uid]) => (
                  <Avatar key={uid} userId={uid} size={26} ring />
                ))}
              </div>
            </div>
          )}
          <ProviderBadge />
          <Button variant="ghost" icon={<Play className="size-4" />} onClick={() => ws.set({ presenting: true })} className="hidden md:inline-flex">
            Apresentar
          </Button>
          <ExportMenu />
          <Button accent icon={<Share2 className="size-4" />} onClick={() => ws.set({ shareOpen: true })}>
            <span className="hidden sm:inline">Compartilhar</span>
          </Button>
          <UserMenu projectId={projectId} />
        </header>

        <div className="flex min-h-0 flex-1">
          {ws.tab === 'storyboard' && (
            <>
              {ws.leftOpen && <Sidebar />}
              <Canvas />
              {ws.rightOpen && <RightPanel />}
            </>
          )}
          {ws.tab === 'script' && <ScriptView />}
          {ws.tab === 'context' && <ContextView />}
          {ws.tab === 'assets' && <AssetsView />}
          {ws.tab === 'history' && <HistoryView />}
          {ws.tab === 'team' && <TeamView />}
        </div>

        {ws.viewerId && <Viewer />}
        {ws.diffRevisionId && <DiffModal />}
        {ws.presenting && <Presentation />}
        <ShareModal />
      </div>
    </WorkspaceCtx.Provider>
  )
}
