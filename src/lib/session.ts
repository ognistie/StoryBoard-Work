import { create } from 'zustand'
import { AI_AUTHOR, type Project, type Role, type User } from './types'

/**
 * Who uses this browser. Signed in, it is the account from the server (api/auth); signed out,
 * it is a local guest. The example projects are open to whoever uses the browser; a shared
 * project only to its members.
 */
export const GUEST_ID = 'u_guest'

// People of the example projects. They only exist in the seeded data.
const DEMO_PEOPLE: User[] = [
  { id: 'u_marina', name: 'Marina Costa', org: 'Lumen Filmes' },
  { id: 'u_rafael', name: 'Rafael Lima', org: 'Lumen Filmes' },
  { id: 'u_julia', name: 'Júlia Andrade', org: 'Horizonte Imóveis' },
  { id: 'u_caio', name: 'Caio Mendes', org: 'Agência Norte' },
]

const DIRECTORY_KEY = 'decupa.people'

function loadDirectory(): Record<string, User> {
  try {
    return JSON.parse(localStorage.getItem(DIRECTORY_KEY) ?? '{}') as Record<string, User>
  } catch {
    return {}
  }
}

/** Names of real people met in shared projects, cached so versions and chat show names offline. */
export const usePeople = create<{ people: Record<string, User> }>(() => ({ people: loadDirectory() }))

export function rememberPeople(list: { id: string; name: string; email?: string }[]) {
  const people = { ...usePeople.getState().people }
  let changed = false
  for (const p of list) {
    if (people[p.id]?.name === p.name) continue
    people[p.id] = { id: p.id, name: p.name, org: p.email ?? '' }
    changed = true
  }
  if (!changed) return
  usePeople.setState({ people })
  try {
    localStorage.setItem(DIRECTORY_KEY, JSON.stringify(people))
  } catch {
    // Storage full or blocked: names still work for this visit.
  }
}

export const userById = (id?: string): User => {
  if (id === GUEST_ID) return { id, name: 'Você', org: '' }
  if (id === AI_AUTHOR) return { id, name: 'Decupa IA', org: 'OpenAI' }
  return usePeople.getState().people[id ?? ''] ?? DEMO_PEOPLE.find((u) => u.id === id) ?? { id: id ?? '?', name: 'Convidado', org: '' }
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export type Capability =
  | 'edit' // change scenes, the briefing, files, and commit versions
  | 'comment' // write sticky notes and chat

const MATRIX: Record<Role, Capability[]> = {
  admin: ['edit', 'comment'],
  producer: ['edit', 'comment'],
  editor: ['edit', 'comment'],
  client: ['comment'],
  viewer: [],
}

export function roleIn(project: Project | undefined, userId: string): Role | null {
  if (!project) return null
  const role = project.members.find((m) => m.userId === userId)?.role
  if (role) return role
  // An example belongs to this browser until it is shared.
  return project.example && !project.remote ? 'producer' : null
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
    super(cap === 'edit' ? 'Seu papel neste projeto não permite editar.' : 'Seu papel neste projeto é só de leitura.')
    this.name = 'PermissionError'
  }
}

/** The acting user id. Kept in sync with the signed-in account by lib/collab/auth.ts. */
export const useSession = create<{ userId: string }>(() => ({ userId: GUEST_ID }))
