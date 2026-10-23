import { useLiveQuery } from 'dexie-react-hooks'
import { Clock, FolderOpen, Lock, MessageSquare, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { FrameImage } from '../components/FrameImage'
import { Logo, ProviderBadge, UserMenu } from '../components/Shell'
import { AvatarStack, Badge, Button, Empty, Input, Segmented, Select } from '../components/ui'
import { db } from '../lib/db'
import { timeAgo } from '../lib/hooks'
import { ROLE_LABEL, roleIn, useSession, userById } from '../lib/session'
import type { Project, ProjectStatus } from '../lib/types'
import { NewProjectModal } from './NewProjectModal'

const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: 'neutral' | 'warn' | 'ok' | 'info' }> = {
  pre: { label: 'Pré-produção', tone: 'info' },
  review: { label: 'Em revisão', tone: 'warn' },
  approved: { label: 'Aprovado', tone: 'ok' },
  archived: { label: 'Arquivado', tone: 'neutral' },
}

export function Dashboard() {
  const userId = useSession((s) => s.userId)
  const projects = useLiveQuery(() => db.projects.orderBy('updatedAt').reverse().toArray(), []) ?? []
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | ProjectStatus>('all')
  const [client, setClient] = useState('')
  const [creating, setCreating] = useState(false)

  const mine = projects.filter((p) => roleIn(p, userId))
  const hidden = projects.length - mine.length
  const clients = [...new Set(mine.map((p) => p.client))]
  const list = useMemo(
    () =>
      mine.filter(
        (p) =>
          (status === 'all' || p.status === status) &&
          (!client || p.client === client) &&
          (!q || `${p.name} ${p.client} ${p.producer}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [mine, status, client, q],
  )
  const me = userById(userId)
  const canCreate = me.org !== 'Horizonte Imóveis'

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Logo />
          <div className="flex-1" />
          <ProviderBadge />
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[13px] text-muted">Olá, {me.name.split(' ')[0]}</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Projetos</h1>
          </div>
          {canCreate && (
            <Button variant="primary" size="lg" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
              Novo projeto
            </Button>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
            <Input className="pl-8.5" placeholder="Buscar projeto, cliente…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar projetos" />
          </div>
          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'pre', label: 'Pré-produção' },
              { value: 'review', label: 'Em revisão' },
              { value: 'approved', label: 'Aprovados' },
            ]}
          />
          {clients.length > 1 && (
            <Select className="w-auto" value={client} onChange={(e) => setClient(e.target.value)} aria-label="Filtrar por cliente">
              <option value="">Todos os clientes</option>
              {clients.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          )}
        </div>

        {list.length ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <ProjectCard key={p.id} project={p} userId={userId} />
            ))}
            {canCreate && (
              <button
                onClick={() => setCreating(true)}
                className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-[13px] text-muted transition-colors hover:border-accent hover:text-accent"
              >
                <Plus className="size-5" />
                Novo storyboard
              </button>
            )}
          </div>
        ) : (
          <Empty icon={<FolderOpen />} title="Nenhum projeto por aqui" action={canCreate && <Button onClick={() => setCreating(true)}>Criar projeto</Button>}>
            {mine.length ? 'Ajuste a busca ou os filtros.' : 'Você ainda não participa de nenhum projeto. Peça um convite à produtora.'}
          </Empty>
        )}

        {hidden > 0 && (
          <p className="mt-8 flex items-center gap-1.5 text-[12px] text-muted">
            <Lock className="size-3.5" />
            {hidden} {hidden === 1 ? 'projeto' : 'projetos'} neste navegador não {hidden === 1 ? 'está visível' : 'estão visíveis'} para {me.name.split(' ')[0]} (sem permissão).
          </p>
        )}
      </main>
      <NewProjectModal open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}

function ProjectCard({ project, userId }: { project: Project; userId: string }) {
  const stats = useLiveQuery(async () => {
    const frames = await db.frames.where('projectId').equals(project.id).sortBy('order')
    const proposals = await db.proposals.where('projectId').equals(project.id).filter((p) => p.status === 'open').count()
    const comments = await db.comments.where('projectId').equals(project.id).filter((c) => !c.resolved).count()
    const last = await db.events.where('projectId').equals(project.id).reverse().sortBy('createdAt')
    return {
      cover: project.coverImageId ?? frames.find((f) => f.imageId)?.imageId,
      count: frames.length,
      approved: frames.filter((f) => f.status === 'approved').length,
      pending: frames.filter((f) => f.status === 'review').length + proposals,
      comments,
      last: last[0],
    }
  }, [project.id])
  const role = roleIn(project, userId)
  const st = PROJECT_STATUS[project.status]
  return (
    <a href={`#/p/${project.id}`} className="group block overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <FrameImage imageId={stats?.cover} alt="" className="border-b border-line">
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Badge tone={st.tone} className="shadow-sm">
            {st.label}
          </Badge>
        </div>
        {stats && stats.pending > 0 && (
          <div className="absolute top-3 right-3">
            <Badge tone="accent" className="shadow-sm">
              {stats.pending} {stats.pending === 1 ? 'pendência' : 'pendências'}
            </Badge>
          </div>
        )}
      </FrameImage>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold tracking-tight group-hover:text-accent">{project.name}</h3>
            <p className="mt-0.5 truncate text-[12.5px] text-muted">
              {project.client} · {project.producer}
            </p>
          </div>
          <AvatarStack ids={project.members.map((m) => m.userId)} />
        </div>
        {stats && (
          <div className="mt-3">
            <div className="h-1 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-ok transition-all" style={{ width: `${stats.count ? (stats.approved / stats.count) * 100 : 0}%` }} />
            </div>
            <div className="mt-2.5 flex items-center gap-3 text-[12px] text-muted">
              <span>
                {stats.approved}/{stats.count} aprovados
              </span>
              {stats.comments > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="size-3.5" />
                  {stats.comments}
                </span>
              )}
              <span className="ml-auto flex items-center gap-1">
                <Clock className="size-3.5" />
                {timeAgo(stats.last?.createdAt ?? project.updatedAt)}
              </span>
            </div>
            {stats.last && <p className="mt-1.5 truncate text-[12px] text-fg-2">{userById(stats.last.actorId).name.split(' ')[0]}: {stats.last.message}</p>}
          </div>
        )}
        <div className="mt-3 text-[11px] text-muted">Seu papel: {role ? ROLE_LABEL[role] : '—'}</div>
      </div>
    </a>
  )
}
