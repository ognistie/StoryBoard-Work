import { ReactFlowProvider } from '@xyflow/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { toast } from '../components/ui'
import { db } from '../lib/db'
import { roleIn, useSession, userById } from '../lib/session'
import { orderedFrames, WorkspaceCtx, type WorkspaceData } from './workspace/context'
import { ExportMenu } from './workspace/ExportMenu'
import { Inspector } from './workspace/Inspector'
import { PromptBox } from './workspace/PromptBox'
import { AddNoteButton, SceneCanvas, ZoomControl } from './workspace/SceneCanvas'
import { useWS } from './workspace/store'

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
  const seconds = wd.ordered.reduce((sum, f) => sum + f.duration, 0)
  const target = data.project.durationSeconds

  return (
    <WorkspaceCtx.Provider value={wd}>
      <ReactFlowProvider>
        <div className="relative h-full min-h-[600px] overflow-hidden bg-[#F4F4F5]">
          <header className="absolute inset-x-0 top-0 flex h-[72px] items-center justify-between px-7">
            <div className="flex min-w-0 items-center gap-3">
              <a href="#/" aria-label="Voltar aos projetos" className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-[#E4E4E7] bg-white transition-colors hover:bg-[#FAFAFA]">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                  <path d="M8.5 3L4.5 7l4 4" fill="none" stroke="#18181B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <a href="#/" className="text-[15px] leading-[18px] text-muted hover:text-fg">
                Projetos
              </a>
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="shrink-0">
                <path d="M4.5 2.5L8 6l-3.5 3.5" fill="none" stroke="#A1A1AA" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h1 className="truncate text-[15px] leading-[18px] font-medium tracking-[-0.01em] text-[#18181B]">{data.project.name}</h1>
              <span className="shrink-0 text-[13px] leading-4 text-faint">
                {wd.ordered.length} {wd.ordered.length === 1 ? 'cena' : 'cenas'} · {target ? `${seconds} de ${target}s` : `${seconds}s`}
              </span>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <ExportMenu />
                <button onClick={() => toast('Publicar chega em breve.')} className="flex h-9 items-center rounded-full bg-accent px-5 text-[14px] leading-[18px] font-medium text-white transition-colors hover:bg-[#0077ed]">
                  Publicar
                </button>
              </div>
              <span className="flex size-8 items-center justify-center rounded-2xl bg-[#E4E4E7] text-[11px] leading-[14px] font-semibold text-[#18181B]">{initials(userById(userId).name)}</span>
            </div>
          </header>

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
      </ReactFlowProvider>
    </WorkspaceCtx.Provider>
  )
}
