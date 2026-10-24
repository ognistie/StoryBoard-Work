import { create } from 'zustand'
import { z } from 'zod'
import { db } from '../db'
import { rememberPeople } from '../session'
import { api } from './api'
import { useAuth } from './auth'
import { inviteCreated, projectResponse, projectsResponse, type Invite, type RemoteProject, type ShareRole } from './contract'
import { forgetProject, syncNow } from './sync'

/** The signed-in user's shared projects and pending invites, as the server last said. */
export const useRemote = create<{ projects: RemoteProject[]; invites: Invite[]; loading: boolean }>(() => ({ projects: [], invites: [], loading: false }))

let inflight: Promise<void> | null = null

/**
 * Refreshes the lists and brings new shared projects into this browser.
 * Projects this browser has as shared but the server no longer lists (we were removed) are forgotten.
 */
export function refreshRemote(): Promise<void> {
  const { user, collab } = useAuth.getState()
  if (!user || !collab) {
    useRemote.setState({ projects: [], invites: [] })
    return Promise.resolve()
  }
  inflight ??= (async () => {
    useRemote.setState({ loading: true })
    try {
      const { projects, invites } = await api('projects', projectsResponse)
      useRemote.setState({ projects, invites })
      for (const p of projects) rememberPeople(p.members.map((m) => ({ id: m.userId, name: m.name, email: m.email })))
      const listed = new Set(projects.map((p) => p.id))
      const local = await db.projects.filter((p) => !!p.remote).toArray()
      for (const p of local) if (!listed.has(p.id) && p.members.some((m) => m.userId === user.id)) await forgetProject(p.id)
      const cursors = new Set((await db.syncCursors.toArray()).map((c) => c.projectId))
      // Shared with us but never pulled here: download now, so it shows on the home screen.
      await Promise.all(projects.filter((p) => !cursors.has(p.id)).map((p) => syncNow(p.id)))
    } finally {
      useRemote.setState({ loading: false })
      inflight = null
    }
  })()
  return inflight
}

export async function acceptInvite(token: string): Promise<RemoteProject> {
  const { project } = await api('invites', projectResponse, { method: 'POST', json: { action: 'accept', token } })
  await syncNow(project.id)
  void refreshRemote()
  return project
}

export async function declineInvite(token: string) {
  await api('invites', z.object({ ok: z.boolean() }), { method: 'POST', json: { action: 'decline', token } })
  useRemote.setState((s) => ({ invites: s.invites.filter((i) => i.token !== token) }))
}

/** Creates an invite; returns the link to share and whether the server emailed it. */
export async function inviteByEmail(projectId: string, email: string, role: ShareRole) {
  const { invite, emailed } = await api('invites', inviteCreated, { method: 'POST', json: { action: 'create', projectId, email, role } })
  return { invite, emailed, link: `${location.origin}/#/convite/${invite.token}` }
}

async function updateMembers(json: unknown) {
  const { project } = await api('projects', projectResponse, { method: 'POST', json })
  await syncNow(project.id)
  return project
}

export const setMemberRole = (projectId: string, userId: string, role: ShareRole) => updateMembers({ action: 'set-role', projectId, userId, role })

export const removeMember = (projectId: string, userId: string) => updateMembers({ action: 'remove-member', projectId, userId })

/** Leaves a shared project and removes its copy from this browser. */
export async function leaveProject(projectId: string, userId: string) {
  await api('projects', projectResponse, { method: 'POST', json: { action: 'remove-member', projectId, userId } })
  await forgetProject(projectId)
  void refreshRemote()
}
