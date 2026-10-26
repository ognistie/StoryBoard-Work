import { ReactFlowProvider } from '@xyflow/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { FolderClosed, MessageCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AccountButton } from '../components/AccountButton'
import { askSignIn } from '../components/AuthModal'
import { SettingsModal } from '../components/SettingsModal'
import { Avatar, cx } from '../components/ui'
import { useAuth } from '../lib/collab/auth'
import { useSync, watchProject } from '../lib/collab/sync'
import { db } from '../lib/db'
import { roleIn, useSession, userById } from '../lib/session'
import { orderedFrames, useWD, WorkspaceCtx, type WorkspaceData } from './workspace/context'
import { ExportMenu } from './workspace/ExportMenu'
import { BottomSheet } from './workspace/BottomSheet'
import { ChatPanel, useUnread } from './workspace/ChatPanel'
import { ExampleTips } from './workspace/ExampleTips'
import { FilesPanel } from './workspace/FilesPanel'
import { PanelFrame } from './workspace/PanelShell'
import { ShareButton, ShareModal } from './workspace/ShareModal'
import { Inspector, InspectorSheetContent } from './workspace/Inspector'
import { PlayIcon } from './workspace/presentation/icons'
import { Presentation } from './workspace/presentation/Presentation'
import { PromptBox } from './workspace/PromptBox'
import { SceneCanvas, ZoomControl } from './workspace/SceneCanvas'
import { useWS, type SidePanel } from './workspace/store'
import { useAddNote } from './workspace/useAddNote'
import { useScreen } from './workspace/useScreen'

function useWorkspaceData(projectId: string) {
  return useLiveQuery(async () => {
    const project = await db.projects.get(projectId)
    if (!project) return { project: undefined }
    const [scenes, frames, revisions, docs, notes] = await Promise.all([
      db.scenes.where('projectId').equals(projectId).sortBy('order'),
      db.frames.where('projectId').equals(projectId).sortBy('order'),
      db.revisions.where('projectId').equals(projectId).sortBy('createdAt'),
      db.docs.where('projectId').equals(projectId).toArray(),
      db.notes.where('projectId').equals(projectId).sortBy('createdAt'),
    ])
    return { project, scenes, ordered: orderedFrames(frames, scenes), revisions, briefing: docs.find((d) => d.kind === 'brief'), notes }
  }, [projectId])
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center bg-[#F4F4F5] text-[14px] text-muted">{children}</div>
}

/** A project: the scene canvas in a panel, the selected scene's inspector, and the prompt box. */
export function Workspace({ projectId }: { projectId: string }) {
  const userId = useSession((s) => s.userId)
  const signedIn = useAuth((s) => !!s.user)
  const data = useWorkspaceData(projectId)
  const remote = !!data?.project?.remote

  // A shared project syncs with the server while it is open.
  useEffect(() => (remote && signedIn ? watchProject(projectId) : undefined), [projectId, remote, signedIn])

  if (!data) return <Centered>Carregando projeto…</Centered>
  if (!data.project)
    return (
      <Centered>
        <span>
          Projeto não encontrado.{' '}
          <a href="#/" className="text-link hover:underline">
            Voltar aos projetos
          </a>
        </span>
      </Centered>
    )
  const role = roleIn(data.project, userId)
  if (!role)
    return (
      <Centered>
        <span className="max-w-sm text-center">
          {signedIn ? `Sua conta não participa de “${data.project.name}”. ` : 'Este projeto é compartilhado. '}
          {!signedIn && (
            <button onClick={() => askSignIn('Entre com a conta que recebeu o convite.')} className="text-link hover:underline">
              Entrar
            </button>
          )}
          {!signedIn && ' ou '}
          <a href="#/" className="text-link hover:underline">
            voltar aos projetos
          </a>
          .
        </span>
      </Centered>
    )

  const wd: WorkspaceData = { ...data, project: data.project, scenes: data.scenes ?? [], ordered: data.ordered ?? [], revisions: data.revisions ?? [], notes: data.notes ?? [], role, userId }

  return (
    <WorkspaceCtx.Provider value={wd}>
      {/* Keyed by project, so opening another project starts from a fresh canvas and selection. */}
      <ReactFlowProvider key={projectId}>
        <WorkspaceLayout />
      </ReactFlowProvider>
    </WorkspaceCtx.Provider>
  )
}

/**
 * Opens the project with fresh canvas state and the scene changed last selected; a tie goes to the later scene.
 * After that the user owns the selection: clicking the empty canvas or pressing Esc clears it, and a removed scene clears it too.
 */
function useOpenProject() {
  const { ordered } = useWD()
  const selectedId = useWS((s) => s.selectedId)
  const opened = useRef(false)
  useEffect(() => {
    if (!opened.current) {
      opened.current = true
      useWS.getState().reset()
      const latest = ordered.reduce<(typeof ordered)[number] | undefined>((a, b) => (!a || b.updatedAt >= a.updatedAt ? b : a), undefined)
      useWS.getState().set({ selectedId: latest?.id })
    } else if (selectedId && !ordered.some((f) => f.id === selectedId)) useWS.getState().set({ selectedId: undefined })
  }, [selectedId, ordered])
}

function useProjectStats() {
  const { project, ordered } = useWD()
  const seconds = ordered.reduce((sum, f) => sum + f.duration, 0)
  const target = project.durationSeconds
  return {
    project,
    stats: `${ordered.length} ${ordered.length === 1 ? 'cena' : 'cenas'} · ${target ? `${seconds} de ${target}s` : `${seconds}s`}`,
  }
}

/** Members of a shared project, the ones online first, with a green dot. */
function MemberStack() {
  const { project, userId } = useWD()
  const online = useSync((s) => s.byProject[project.id]?.online) ?? []
  if (!project.remote) return null
  const others = project.members.filter((m) => m.userId !== userId).sort((a, b) => Number(online.includes(b.userId)) - Number(online.includes(a.userId)))
  if (!others.length) return null
  return (
    <div className="hidden items-center -space-x-1.5 lg:flex" aria-label={`${others.length} ${others.length === 1 ? 'pessoa' : 'pessoas'} no projeto`}>
      {others.slice(0, 4).map((m) => (
        <Avatar key={m.userId} id={m.userId} name={userById(m.userId).name} size={30} online={online.includes(m.userId)} className="ring-2 ring-[#F4F4F5]" />
      ))}
      {others.length > 4 && <span className="flex size-[30px] items-center justify-center rounded-full bg-[#E4E4E7] text-[11px] font-semibold ring-2 ring-[#F4F4F5]">+{others.length - 4}</span>}
    </div>
  )
}

/** Round header button that opens a side panel (chat, folder). Pressed while its panel shows. */
function PanelButton({ panel, label, badge }: { panel: Exclude<SidePanel, 'scene'>; label: string; badge?: number }) {
  const active = useWS((s) => s.panel === panel)
  const Icon = panel === 'chat' ? MessageCircle : FolderClosed
  return (
    <button
      aria-label={badge ? `${label} (${badge} novas)` : label}
      aria-pressed={active}
      title={label}
      onClick={() => useWS.getState().set({ panel: active ? 'scene' : panel })}
      className={cx(
        'relative flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors',
        active ? 'border-[#18181B] bg-[#18181B] text-white' : 'border-[#E4E4E7] bg-white text-[#18181B] shadow-[0_1px_2px_#0000000A] hover:bg-[#FAFAFA]',
      )}
    >
      <Icon className="size-[17px]" strokeWidth={1.8} />
      {!!badge && <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] leading-none font-semibold text-white">{badge > 9 ? '9+' : badge}</span>}
    </button>
  )
}

function ChatButton() {
  const { project, userId } = useWD()
  return <PanelButton panel="chat" label="Chat do projeto" badge={useUnread(project.id, userId)} />
}

function BackButton() {
  return (
    <a href="#/" aria-label="Voltar aos projetos" className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-[#E4E4E7] bg-white transition-colors hover:bg-[#FAFAFA]">
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
        <path d="M8.5 3L4.5 7l4 4" fill="none" stroke="#18181B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  )
}

/** Opens the presentation of the current versions, from scene 1. */
function PresentButton({ compact = false, onPresent }: { compact?: boolean; onPresent: () => void }) {
  const { ordered } = useWD()
  return (
    <button
      aria-label="Apresentar"
      title="Apresentar"
      onClick={onPresent}
      disabled={!ordered.length}
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full border border-[#E4E4E7] bg-white shadow-[0_1px_2px_#0000000A] transition-colors hover:bg-[#FAFAFA] disabled:opacity-50',
        compact ? 'size-8' : 'size-9',
      )}
    >
      <PlayIcon color="#18181B" />
    </button>
  )
}

/** Desktop and tablet header. `compact` (tablet) shrinks Exportar to an icon; if room still runs out, the project name truncates first. */
function Header({ compact = false, onPresent, onSettings }: { compact?: boolean; onPresent: () => void; onSettings: () => void }) {
  const { project, stats } = useProjectStats()
  return (
    <header className="absolute inset-x-0 top-0 flex h-[72px] items-center justify-between gap-6 px-7">
      <div className="flex min-w-0 items-center gap-3">
        <BackButton />
        <a href="#/" className="text-[15px] leading-[18px] text-muted hover:text-fg">
          Projetos
        </a>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="shrink-0">
          <path d="M4.5 2.5L8 6l-3.5 3.5" fill="none" stroke="#A1A1AA" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h1 className="truncate text-[15px] leading-[18px] font-medium tracking-[-0.01em] text-[#18181B]">{project.name}</h1>
        <span className="shrink-0 text-[13px] leading-4 text-faint">{stats}</span>
      </div>
      <div className="flex shrink-0 items-center gap-5">
        <MemberStack />
        <div className="flex items-center gap-2">
          <ExportMenu iconOnly={compact} />
          <div className="flex items-center gap-2.5">
            <ChatButton />
            <PanelButton panel="files" label="Arquivos do projeto" />
            <PresentButton onPresent={onPresent} />
            <ShareButton />
          </div>
        </div>
        <AccountButton onSettings={onSettings} />
      </div>
    </header>
  )
}

/** Phone header: the back button replaces "Projetos ›", and the stats go under the name. */
function MobileHeader({ onPresent, onSettings }: { onPresent: () => void; onSettings: () => void }) {
  const { project, stats } = useProjectStats()
  return (
    <header className="absolute inset-x-0 top-0 flex h-14 items-center justify-between gap-2.5 px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <BackButton />
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-[15px] leading-[18px] font-medium tracking-[-0.01em] text-[#18181B]">{project.name}</h1>
          <span className="truncate text-[12px] leading-4 text-muted">{stats}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <PresentButton compact onPresent={onPresent} />
        <ShareButton compact />
        <AccountButton onSettings={onSettings} />
      </div>
    </header>
  )
}

function NoteIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden>
      <path d="M3 4.5C3 3.67 3.67 3 4.5 3h9c.83 0 1.5.67 1.5 1.5V11l-4 4H4.5C3.67 15 3 14.33 3 13.5v-9z" fill="#FBE98C" stroke="#B45309" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M15 11h-2.5c-.83 0-1.5.67-1.5 1.5V15" fill="none" stroke="#B45309" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

/** The bare note icon that drops a new sticky note, next to the zoom on desktop and tablet. */
function NoteButton() {
  const addNote = useAddNote()
  return (
    <button aria-label="Nova nota" title="Nova nota" onClick={() => void addNote()} className="flex size-7 items-center justify-center rounded-md transition-transform hover:scale-110 active:scale-95">
      <NoteIcon size={28} />
    </button>
  )
}

const GLASS_PILL = 'glass !shadow-[inset_0_1px_0_#FFFFFFE6,inset_0_-1px_0_#FFFFFF40,0_0_0_1px_#0000000F,0_8px_32px_#0000001A]'

function WorkspaceLayout() {
  const screen = useScreen()
  useOpenProject()
  // Held here, not in a layout: entering full screen can resize the window into another layout.
  const [presenting, setPresenting] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const present = () => setPresenting(true)
  const settings = () => setSettingsOpen(true)
  return (
    <>
      {screen === 'mobile' ? (
        <MobileLayout onPresent={present} onSettings={settings} />
      ) : screen === 'tablet' ? (
        <TabletLayout onPresent={present} onSettings={settings} />
      ) : (
        <DesktopLayout onPresent={present} onSettings={settings} />
      )}
      {presenting && <Presentation onClose={() => setPresenting(false)} />}
      <ShareModal />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}

/** The right-hand panel's content on desktop: the scene inspector, the chat or the folder. */
function SidePanelContent() {
  const panel = useWS((s) => s.panel)
  if (panel === 'scene') return <Inspector />
  return <PanelFrame>{panel === 'chat' ? <ChatPanel /> : <FilesPanel />}</PanelFrame>
}

function DesktopLayout({ onPresent, onSettings }: { onPresent: () => void; onSettings: () => void }) {
  return (
    <div className="relative h-full min-h-[600px] overflow-hidden bg-[#F4F4F5]">
      <Header onPresent={onPresent} onSettings={onSettings} />

      <div className="absolute inset-x-4 top-[72px] bottom-4 overflow-hidden rounded-[20px] border border-[#E4E4E7]">
        <SceneCanvas />
      </div>

      {/* Bottom left, above the zoom: the briefing node sits at the top left of the canvas. */}
      <div className="absolute bottom-[84px] left-8" style={{ width: 'min(360px, calc(50% - 350px))' }}>
        <ExampleTips />
      </div>

      <div className="absolute bottom-8 left-8">
        <ZoomControl />
      </div>
      <div className="absolute bottom-10 left-[180px]">
        <NoteButton />
      </div>

      {/* Centred on the whole screen, and never under the inspector: 32 margin + 350 panel + 16 gap on each side. */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 [@media(max-height:820px)]:bottom-4" style={{ width: 'min(620px, calc(100% - 796px))' }}>
        <PromptBox />
      </div>

      <div className="absolute top-[88px] right-8 bottom-8 w-[350px]">
        <SidePanelContent />
      </div>
    </div>
  )
}

const TABLET_SHEET = 340

/** Tablet: the inspector becomes a bottom sheet; zoom and the note button sit in a row above the prompt box. */
function TabletLayout({ onPresent, onSettings }: { onPresent: () => void; onSettings: () => void }) {
  // Not in the design: tapping the grabber expands the sheet to read long histories, and hides the prompt box meanwhile.
  const [expanded, setExpanded] = useState(false)
  const panel = useWS((s) => s.panel)
  return (
    <div className="relative h-full min-h-[600px] overflow-hidden bg-[#F4F4F5]">
      <Header compact onPresent={onPresent} onSettings={onSettings} />

      <div className="absolute top-[88px] right-8 z-10" style={{ width: 'min(380px, calc(100% - 64px))' }}>
        <ExampleTips />
      </div>

      <div className="absolute inset-x-4 top-[72px] bottom-4 overflow-hidden rounded-[20px] border border-[#E4E4E7]">
        <SceneCanvas />
      </div>

      {!expanded && (
        <div className="absolute left-1/2 flex -translate-x-1/2 flex-col gap-3" style={{ width: 'min(704px, calc(100% - 64px))', bottom: TABLET_SHEET + 16 }}>
          <div className="flex items-center gap-[18px]">
            <ZoomControl />
            <NoteButton />
          </div>
          <PromptBox />
        </div>
      )}

      <BottomSheet className="inset-x-4" height={expanded ? '72%' : TABLET_SHEET} onGrab={() => setExpanded((v) => !v)} grabLabel={expanded ? 'Recolher painel' : 'Expandir painel'}>
        {panel === 'scene' ? <InspectorSheetContent layout="row" /> : panel === 'chat' ? <ChatPanel /> : <FilesPanel />}
      </BottomSheet>
    </div>
  )
}

/** The selected scene's version as "head/total", the way its card shows it. */
function useVersionLabel() {
  const { ordered, revisions } = useWD()
  const selectedId = useWS((s) => s.selectedId)
  const frame = ordered.find((f) => f.id === selectedId)
  if (!frame) return undefined
  const own = revisions.filter((r) => r.frameId === frame.id)
  return `${own.findIndex((r) => r.id === frame.headRevisionId) + 1}/${Math.max(own.length, 1)}`
}

/** Phone: full-width canvas, a dock at the bottom, and the versions in a sheet that opens on demand. */
function MobileLayout({ onPresent, onSettings }: { onPresent: () => void; onSettings: () => void }) {
  const addNote = useAddNote()
  const version = useVersionLabel()
  const { project, userId } = useWD()
  const unread = useUnread(project.id, userId)
  const [sheetOpen, setSheetOpen] = useState(false)
  const panel = useWS((s) => s.panel)

  // Closing the sheet goes back to the scene, so the chat counts new messages again.
  const closeSheet = () => {
    setSheetOpen(false)
    useWS.getState().set({ panel: 'scene' })
  }

  useEffect(() => {
    if (!sheetOpen) return
    const close = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setSheetOpen(false)
      useWS.getState().set({ panel: 'scene' })
    }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [sheetOpen])

  const openVersions = () => {
    useWS.getState().set({ inspectorTab: 'versions', panel: 'scene' })
    setSheetOpen(true)
  }
  const openPanel = (p: Exclude<SidePanel, 'scene'>) => {
    useWS.getState().set({ panel: p })
    setSheetOpen(true)
  }

  return (
    <div className="relative h-full overflow-hidden bg-[#F4F4F5]">
      <MobileHeader onPresent={onPresent} onSettings={onSettings} />

      <div className="absolute inset-x-0 top-14 bottom-0 overflow-hidden rounded-t-[20px] border-t border-[#E4E4E7]">
        <SceneCanvas />
      </div>

      <div className="absolute inset-x-3 bottom-7 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <button onClick={openVersions} disabled={!version} className={cx(GLASS_PILL, 'flex h-10 items-center gap-1.5 rounded-[20px] pr-3.5 pl-4')}>
            <span className="text-[14px] leading-[18px] font-medium text-[#18181B]">Versões</span>
            {version && <span className="text-[14px] leading-[18px] font-semibold text-accent">{version}</span>}
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="shrink-0">
              <path d="M3 7.5L6 4.5l3 3" fill="none" stroke="#71717B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex gap-2">
            <button aria-label={unread ? `Chat (${unread} novas)` : 'Chat'} onClick={() => openPanel('chat')} className={cx(GLASS_PILL, 'relative flex size-10 items-center justify-center rounded-[20px]')}>
              <MessageCircle className="size-[18px]" strokeWidth={1.8} />
              {!!unread && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-accent" />}
            </button>
            <button aria-label="Arquivos" onClick={() => openPanel('files')} className={cx(GLASS_PILL, 'flex size-10 items-center justify-center rounded-[20px]')}>
              <FolderClosed className="size-[18px]" strokeWidth={1.8} />
            </button>
            <button aria-label="Nova nota" onClick={() => void addNote()} className={cx(GLASS_PILL, 'flex size-10 items-center justify-center rounded-[20px]')}>
              <NoteIcon size={22} />
            </button>
          </div>
        </div>
        <PromptBox compact />
      </div>

      {sheetOpen && (
        <>
          <div aria-hidden onClick={closeSheet} className="fade-in absolute inset-0 bg-black/20" />
          <BottomSheet modal className="slide-up inset-x-0" height={panel === 'scene' ? '70%' : '86%'} onGrab={closeSheet} grabLabel="Fechar painel">
            {panel === 'scene' ? <InspectorSheetContent layout="stack" /> : panel === 'chat' ? <ChatPanel closable={false} /> : <FilesPanel closable={false} />}
          </BottomSheet>
        </>
      )}
    </div>
  )
}
