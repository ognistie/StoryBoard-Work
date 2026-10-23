import { create } from 'zustand'
import type { Project, Role, User } from './types'

/**
 * Demo identities. There is no auth server: the browser acts as the first user
 * unless an earlier session stored another one.
 */
const USERS: User[] = [
  { id: 'u_marina', name: 'Marina Costa', org: 'Lumen Filmes' },
  { id: 'u_rafael', name: 'Rafael Lima', org: 'Lumen Filmes' },
  { id: 'u_julia', name: 'Júlia Andrade', org: 'Horizonte Imóveis' },
  { id: 'u_caio', name: 'Caio Mendes', org: 'Agência Norte' },
]

export const userById = (id?: string): User => USERS.find((u) => u.id === id) ?? { id: id ?? '?', name: 'Convidado', org: '' }

export type Capability =
  | 'edit' // change scenes, the briefing and commit versions
  | 'comment' // write sticky notes

const MATRIX: Record<Role, Capability[]> = {
  admin: ['edit', 'comment'],
  producer: ['edit', 'comment'],
  editor: ['edit', 'comment'],
  client: ['comment'],
  viewer: [],
}

export function roleIn(project: Project | undefined, userId: string): Role | null {
  if (!project) return null
  return project.members.find((m) => m.userId === userId)?.role ?? null
}

function can(role: Role | null, cap: Capability): boolean {
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

// Earlier versions let a tab switch identity and stored it under this key.
const KEY = 'frameline.session.user'

function initialUser(): string {
  try {
    return sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY) ?? USERS[0].id
  } catch {
    return USERS[0].id
  }
}

export const useSession = create<{ userId: string }>(() => ({ userId: initialUser() }))
