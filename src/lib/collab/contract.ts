import { z } from 'zod'

// Wire contract of the collaboration API (api/auth, api/projects, api/invites, api/sync, api/blob).
// The browser and the server both parse with these schemas.

/** Roles a shared project can give. 'admin' stays a local-only role. */
export const SHARE_ROLES = ['producer', 'editor', 'client', 'viewer'] as const
export type ShareRole = (typeof SHARE_ROLES)[number]

export const ROLE_LABEL: Record<ShareRole, string> = {
  producer: 'Produção',
  editor: 'Edição',
  client: 'Cliente',
  viewer: 'Leitura',
}

export const ROLE_HINT: Record<ShareRole, string> = {
  producer: 'Edita tudo e convida pessoas',
  editor: 'Edita cenas, briefing e arquivos',
  client: 'Vê tudo, comenta no chat e em notas',
  viewer: 'Só vê',
}

/** Tables kept in sync for a shared project. Images and file contents travel through api/blob. */
export const SYNC_TABLES = ['projects', 'scenes', 'frames', 'revisions', 'docs', 'docVersions', 'assets', 'notes', 'events', 'messages', 'files', 'fileVersions'] as const
export type SyncTable = (typeof SYNC_TABLES)[number]

/** Tables a member who may only comment (role client) can write. Every other table needs 'edit'. */
export const COMMENT_TABLES: readonly SyncTable[] = ['notes', 'messages']

/** The server's answer (404) to someone who is not, or no longer, a member of a shared project. */
export const NOT_MEMBER = 'Projeto compartilhado não encontrado.'

export const PUSH_BATCH = 150
export const MAX_BLOB_BYTES = 3 * 1024 * 1024

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'E-mail inválido.')

export const publicUser = z.object({ id: z.string(), email: z.string(), name: z.string() })
export type PublicUser = z.infer<typeof publicUser>

export const member = z.object({ userId: z.string(), email: z.string(), name: z.string(), role: z.enum(SHARE_ROLES) })
export type Member = z.infer<typeof member>

export const remoteProject = z.object({
  id: z.string(),
  name: z.string(),
  ownerId: z.string(),
  members: z.array(member),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type RemoteProject = z.infer<typeof remoteProject>

export const invite = z.object({
  token: z.string(),
  projectId: z.string(),
  projectName: z.string(),
  email: z.string(),
  role: z.enum(SHARE_ROLES),
  invitedByName: z.string(),
  createdAt: z.number(),
})
export type Invite = z.infer<typeof invite>

// ---------------------------------------------------------------- auth

export const authState = z.object({ user: publicUser.nullable(), collab: z.boolean(), google: z.boolean().default(false) })
export type AuthState = z.infer<typeof authState>

export const authRequest = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('signup'),
    email,
    name: z.string().trim().min(2, 'Seu nome precisa de ao menos 2 letras.').max(60),
    password: z.string().min(8, 'A senha precisa de ao menos 8 caracteres.').max(200),
  }),
  z.object({ action: z.literal('login'), email, password: z.string().min(1).max(200) }),
  z.object({ action: z.literal('logout') }),
])

// ---------------------------------------------------------------- projects and invites

export const projectsResponse = z.object({ projects: z.array(remoteProject), invites: z.array(invite) })

const id = z.string().min(3).max(64).regex(/^[\w-]+$/)

export const projectsRequest = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), id, name: z.string().trim().min(1).max(120) }),
  z.object({ action: z.literal('set-role'), projectId: id, userId: id, role: z.enum(SHARE_ROLES) }),
  z.object({ action: z.literal('remove-member'), projectId: id, userId: id }),
])
export const projectResponse = z.object({ project: remoteProject })

export const invitesRequest = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), projectId: id, email, role: z.enum(SHARE_ROLES) }),
  z.object({ action: z.literal('accept'), token: z.string().min(10).max(100) }),
  z.object({ action: z.literal('decline'), token: z.string().min(10).max(100) }),
])
export const inviteCreated = z.object({ invite, emailed: z.boolean() })

// ---------------------------------------------------------------- sync

const change = z.object({
  table: z.enum(SYNC_TABLES),
  id,
  /** The whole record, or null when it was deleted. */
  data: z.record(z.string(), z.unknown()).nullable(),
})
export type Change = z.infer<typeof change>

export const pushRequest = z.object({ projectId: id, changes: z.array(change).max(PUSH_BATCH) })
export const pushResponse = z.object({ seq: z.number(), rejected: z.array(z.string()) })

export const pullResponse = z.object({
  seq: z.number(),
  changes: z.array(change),
  /** More changes wait after `seq`: pull again at once. */
  more: z.boolean(),
  project: remoteProject,
  /** Members seen in the last 30 seconds. */
  online: z.array(z.string()),
})
export type PullResponse = z.infer<typeof pullResponse>

/** Members of a project who can change what `table` holds. */
export function canWrite(role: ShareRole, table: SyncTable): boolean {
  if (role === 'viewer') return false
  if (role === 'client') return COMMENT_TABLES.includes(table)
  return true
}
