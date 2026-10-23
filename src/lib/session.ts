import { create } from 'zustand'
import type { Project, Role, User } from './types'

/**
 * Demo identities. There is no auth server: each browser tab picks who it is
 * acting as (stored in sessionStorage, so two tabs can be two different people).
 */
export const USERS: User[] = [
  { id: 'u_marina', name: 'Marina Costa', title: 'Diretora', org: 'Lumen Filmes', color: '#4b5cf0' },
  { id: 'u_rafael', name: 'Rafael Lima', title: 'Artista de storyboard', org: 'Lumen Filmes', color: '#0f9d76' },
  { id: 'u_julia', name: 'Júlia Andrade', title: 'Gerente de marca', org: 'Horizonte Imóveis', color: '#e0662f' },
  { id: 'u_caio', name: 'Caio Mendes', title: 'Atendimento', org: 'Agência Norte', color: '#a64bd6' },
]

export const userById = (id?: string): User =>
  USERS.find((u) => u.id === id) ?? { id: id ?? '?', name: 'Convidado', title: '', org: '', color: '#888' }

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  producer: 'Produtor/Diretor',
  editor: 'Editor',
  client: 'Cliente',
  viewer: 'Visualizador',
}

export type Capability =
  | 'edit' // change frames directly, commit revisions
  | 'ai' // request AI changes (clients produce proposals)
  | 'comment'
  | 'approve' // approve / request changes on a frame revision
  | 'decide' // accept or reject client proposals
  | 'manage' // members, share links, project settings
  | 'docs' // read confidential context documents
  | 'history'

const MATRIX: Record<Role, Capability[]> = {
  admin: ['edit', 'ai', 'comment', 'approve', 'decide', 'manage', 'docs', 'history'],
  producer: ['edit', 'ai', 'comment', 'approve', 'decide', 'manage', 'docs', 'history'],
  editor: ['edit', 'ai', 'comment', 'docs', 'history'],
  client: ['ai', 'comment', 'approve', 'history'],
  viewer: [],
}

export function roleIn(project: Project | undefined, userId: string): Role | null {
  if (!project) return null
  return project.members.find((m) => m.userId === userId)?.role ?? null
}

export function can(role: Role | null, cap: Capability): boolean {
  return !!role && MATRIX[role].includes(cap)
}

/** Throws when the actor lacks a capability. Used by every mutation in repo.ts. */
export function assertCan(role: Role | null, cap: Capability): void {
  if (!can(role, cap)) throw new PermissionError(cap)
}

export class PermissionError extends Error {
  constructor(public cap: Capability) {
    super(`Você não tem permissão para esta ação (${cap}).`)
    this.name = 'PermissionError'
  }
}

const KEY = 'frameline.session.user'

function initialUser(): string {
  try {
    return sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY) ?? USERS[0].id
  } catch {
    return USERS[0].id
  }
}

interface SessionState {
  userId: string
  setUser: (id: string) => void
}

export const useSession = create<SessionState>((set) => ({
  userId: initialUser(),
  setUser: (id) => {
    try {
      sessionStorage.setItem(KEY, id)
      localStorage.setItem(KEY, id)
    } catch {
      /* storage unavailable */
    }
    set({ userId: id })
  },
}))
