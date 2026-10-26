import { create } from 'zustand'
import { db } from '../db'
import { GUEST_ID, rememberPeople, useSession } from '../session'
import { api } from './api'
import { authState, type PublicUser } from './contract'

interface AuthStore {
  /** 'loading' until the first answer from the server. */
  status: 'loading' | 'ready'
  user: PublicUser | null
  /** The deployment has a store, so sharing, chat and the shared folder work. */
  collab: boolean
  google: boolean
}

export const useAuth = create<AuthStore>(() => ({ status: 'loading', user: null, collab: false, google: false }))

function apply(user: PublicUser | null, collab: boolean, google = false) {
  useAuth.setState({ status: 'ready', user, collab, google })
  useSession.setState({ userId: user?.id ?? GUEST_ID })
  if (user) rememberPeople([user])
}

/**
 * Projects made here before signing in become the account's, so signing in never hides work.
 * Signed out again, they stay with the account and leave the guest's list.
 */
export async function claimGuestProjects(userId: string) {
  await db.transaction('rw', db.projects, async () => {
    const guestProjects = await db.projects.filter((p) => !p.remote && p.members.some((m) => m.userId === GUEST_ID)).toArray()
    for (const p of guestProjects)
      await db.projects.update(p.id, {
        ownerId: p.ownerId === GUEST_ID ? userId : p.ownerId,
        members: [...p.members.filter((m) => m.userId !== GUEST_ID && m.userId !== userId), { userId, role: 'producer' }],
      })
  })
}

export async function refreshAuth() {
  try {
    const state = await api('auth', authState)
    if (state.user) await claimGuestProjects(state.user.id)
    apply(state.user, state.collab, state.google)
  } catch {
    // No server (static preview) or offline: the app works as a guest, local only.
    apply(null, false)
  }
}

export async function signIn(input: { mode: 'login' | 'signup'; email: string; password: string; name?: string }) {
  const state = await api('auth', authState, {
    method: 'POST',
    json: input.mode === 'signup' ? { action: 'signup', email: input.email, password: input.password, name: input.name } : { action: 'login', email: input.email, password: input.password },
  })
  if (state.user) await claimGuestProjects(state.user.id)
  apply(state.user, state.collab, state.google)
  return state.user
}

export async function signOut() {
  const state = await api('auth', authState, { method: 'POST', json: { action: 'logout' } })
  apply(null, state.collab, state.google)
}
