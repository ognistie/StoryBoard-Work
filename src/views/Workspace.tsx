import { ReactFlowProvider } from '@xyflow/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { cx, toast } from '../components/ui'
import { db } from '../lib/db'
import { roleIn, useSession, userById } from '../lib/session'
import { orderedFrames, useWD, WorkspaceCtx, type WorkspaceData } from './workspace/context'
import { ExportMenu } from './workspace/ExportMenu'
import { BottomSheet } from './workspace/BottomSheet'
import { Inspector, InspectorSheetContent } from './workspace/Inspector'
import { PromptBox } from './workspace/PromptBox'
import { AddNoteButton, SceneCanvas, ZoomControl } from './workspace/SceneCanvas'
import { useWS } from './workspace/store'
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

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center bg-[#F4F4F5] text-[14px] text-muted">{children}</div>
}

/** A project: the scene canvas in a panel, the selected scene's inspector, and the prompt box. */
export function Workspace({ projectId }: { projectId: string }) {
  const userId = useSession((s) => s.userId)
  const data = useWorkspaceData(projectId)

  useEffect(() => {
    useWS.getState().reset()
  }, [projectId])

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
        <span>
          {userById(userId).name} não participa de “{data.project.name}”.{' '}
          <a href="#/" className="text-link hover:underline">
            Voltar aos projetos
          </a>
        </span>
      </Centered>
    )

  const wd: WorkspaceData = { ...data, project: data.project, scenes: data.scenes ?? [], ordered: data.ordered ?? [], revisions: data.revisions ?? [], notes: data.notes ?? [], role, userId }

  return (
    <WorkspaceCtx.Provider value={wd}>
      <ReactFlowProvider>
        <WorkspaceLayout />
      </ReactFlowProvider>
    </WorkspaceCtx.Provider>
  )
}

/**
 * Opens the project with the scene changed last selected. After that the user owns the selection:
 * clicking the empty canvas or pressing Esc clears it, and a removed scene clears it too.
 */
function useInitialSceneSelection() {
  const { ordered } = useWD()
  const selectedId = useWS((s) => s.selectedId)
  const opened = useRef(false)
  useEffect(() => {
    if (!ordered.length) return
    if (!opened.current) {
      opened.current = true
      const latest = ordered.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a))
      useWS.getState().set({ selectedId: latest.id })
    } else if (selectedId && !ordered.some((f) => f.id === selectedId)) useWS.getState().set({ selectedId: undefined })
  }, [selectedId, ordered])
}

function useProjectStats() {
  const { project, ordered, userId } = useWD()
  const seconds = ordered.reduce((sum, f) => sum + f.duration, 0)
  const target = project.durationSeconds
  return {
    project,
    me: initials(userById(userId).name),
    stats: `${ordered.length} ${ordered.length === 1 ? 'cena' : 'cenas'} · ${target ? `${seconds} de ${target}s` : `${seconds}s`}`,
  }
}

const publish = () => toast('Publicar chega em breve.')

function BackButton() {
  return (
    <a href="#/" aria-label="Voltar aos projetos" className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-[#E4E4E7] bg-white transition-colors hover:bg-[#FAFAFA]">
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
        <path d="M8.5 3L4.5 7l4 4" fill="none" stroke="#18181B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  )
}

function Avatar({ initials }: { initials: string }) {
  return <span className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-[#E4E4E7] text-[11px] leading-[14px] font-semibold text-[#18181B]">{initials}</span>
}

/** Desktop and tablet header. On a narrow tablet the project name truncates first. */
function Header() {
  const { project, me, stats } = useProjectStats()
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
      <div className="flex shrink-0 items-center gap-6">
        <div className="flex items-center gap-2">
          <ExportMenu />
          <button onClick={publish} className="flex h-9 items-center rounded-full bg-accent px-5 text-[14px] leading-[18px] font-medium text-white transition-colors hover:bg-[#0077ed]">
            Publicar
          </button>
        </div>
        <Avatar initials={me} />
      </div>
    </header>
  )
}

/** Phone header: the back button replaces "Projetos ›", and the stats go under the name. */
function MobileHeader() {
  const { project, me, stats } = useProjectStats()
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
        <button onClick={publish} className="flex h-8 items-center rounded-full bg-accent px-3.5 text-[14px] leading-[18px] font-medium text-white transition-colors hover:bg-[#0077ed]">
          Publicar
        </button>
        <Avatar initials={me} />
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

const GLASS_PILL = 'glass !shadow-[inset_0_1px_0_#FFFFFFE6,inset_0_-1px_0_#FFFFFF40,0_0_0_1px_#0000000F,0_8px_32px_#0000001A]'

function WorkspaceLayout() {
  const screen = useScreen()
  useInitialSceneSelection()
  if (screen === 'mobile') return <MobileLayout />
  if (screen === 'tablet') return <TabletLayout />
  return <DesktopLayout />
}

function DesktopLayout() {
  return (
    <div className="relative h-full min-h-[600px] overflow-hidden bg-[#F4F4F5]">
      <Header />

      <div className="absolute inset-x-4 top-[72px] bottom-4 overflow-hidden rounded-[20px] border border-[#E4E4E7]">
        <SceneCanvas />
      </div>

      <div className="absolute bottom-8 left-8">
        <ZoomControl />
      </div>
      <div className="absolute bottom-8 left-[174px]">
        <AddNoteButton />
      </div>

      {/* Centred on the whole screen, and never under the inspector: 32 margin + 350 panel + 16 gap on each side. */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2" style={{ width: 'min(620px, calc(100% - 796px))' }}>
        <PromptBox />
      </div>

      <div className="absolute top-[88px] right-8 bottom-8 w-[350px]">
        <Inspector />
      </div>
    </div>
  )
}

const TABLET_SHEET = 340

/** Tablet: the inspector becomes a bottom sheet; zoom and the note button sit in a row above the prompt box. */
function TabletLayout() {
  const addNote = useAddNote()
  // Not in the design: tapping the grabber expands the sheet to read long histories, and hides the prompt box meanwhile.
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="relative h-full min-h-[600px] overflow-hidden bg-[#F4F4F5]">
      <Header />

      <div className="absolute inset-x-4 top-[72px] bottom-4 overflow-hidden rounded-[20px] border border-[#E4E4E7]">
        <SceneCanvas />
      </div>

      {!expanded && (
        <div className="absolute left-1/2 flex -translate-x-1/2 flex-col gap-3" style={{ width: 'min(704px, calc(100% - 64px))', bottom: TABLET_SHEET + 16 }}>
          <div className="flex items-center gap-[18px]">
            <ZoomControl />
            <button aria-label="Nova nota" onClick={() => void addNote()} className="flex size-7 items-center justify-center rounded-md transition-transform hover:scale-110">
              <NoteIcon size={28} />
            </button>
          </div>
          <PromptBox />
        </div>
      )}

      <BottomSheet className="inset-x-4" height={expanded ? '72%' : TABLET_SHEET} onGrab={() => setExpanded((v) => !v)} grabLabel={expanded ? 'Recolher versões' : 'Expandir versões'}>
        <InspectorSheetContent layout="row" />
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
function MobileLayout() {
  const addNote = useAddNote()
  const version = useVersionLabel()
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    if (!sheetOpen) return
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setSheetOpen(false)
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [sheetOpen])

  const openVersions = () => {
    useWS.getState().set({ inspectorTab: 'versions' })
    setSheetOpen(true)
  }

  return (
    <div className="relative h-full overflow-hidden bg-[#F4F4F5]">
      <MobileHeader />

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
          <button aria-label="Nova nota" onClick={() => void addNote()} className={cx(GLASS_PILL, 'flex size-10 items-center justify-center rounded-[20px]')}>
            <NoteIcon size={22} />
          </button>
        </div>
        <PromptBox compact />
      </div>

      {sheetOpen && (
        <>
          <div aria-hidden onClick={() => setSheetOpen(false)} className="fade-in absolute inset-0 bg-black/20" />
          <BottomSheet className="slide-up inset-x-0" height="70%" onGrab={() => setSheetOpen(false)} grabLabel="Fechar versões">
            <InspectorSheetContent layout="stack" />
          </BottomSheet>
        </>
      )}
    </div>
  )
}
