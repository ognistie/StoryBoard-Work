import { useLiveQuery } from 'dexie-react-hooks'
import { Copy, Link2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Avatar, Badge, Button, Field, IconButton, Input, Modal, Select, toast, toastError } from '../../components/ui'
import { db } from '../../lib/db'
import { formatDate } from '../../lib/hooks'
import { createShareLink, revokeShareLink, setMemberRole } from '../../lib/repo'
import { can, ROLE_LABEL, userById, USERS } from '../../lib/session'
import type { Role } from '../../lib/types'
import { useWD } from './context'
import { useWS } from './store'

const ROLES: Role[] = ['admin', 'producer', 'editor', 'client', 'viewer']

export function ShareModal() {
  const ws = useWS()
  const { project, role, userId } = useWD()
  const links = useLiveQuery(() => db.shareLinks.where('projectId').equals(project.id).toArray(), [project.id]) ?? []
  const [linkRole, setLinkRole] = useState<Role>('client')
  const [days, setDays] = useState(7)
  const [label, setLabel] = useState('Revisão do cliente')
  const manage = can(role, 'manage')
  const close = () => ws.set({ shareOpen: false })
  const urlOf = (t: string) => `${location.origin}${location.pathname}#/join/${t}`

  const create = async () => {
    try {
      const link = await createShareLink(project.id, userId, linkRole, days, label || ROLE_LABEL[linkRole])
      await navigator.clipboard?.writeText(urlOf(link.token)).catch(() => undefined)
      toast('Link criado e copiado', { tone: 'ok' })
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <Modal open={ws.shareOpen} onClose={close} title="Compartilhar projeto" description="Convide pessoas com papéis e permissões específicos." width={600}>
      <div className="space-y-5">
        <section>
          <h3 className="mb-2 text-[12.5px] font-semibold">Membros</h3>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {project.members.map((m) => (
              <li key={m.userId} className="flex items-center gap-3 px-3 py-2">
                <Avatar userId={m.userId} size={28} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-[13px] font-medium">
                    {userById(m.userId).name} {m.userId === userId && <span className="text-muted">(você)</span>}
                  </span>
                  <span className="block text-[11.5px] text-muted">{userById(m.userId).org}</span>
                </span>
                {manage ? (
                  <Select className="w-40" value={m.role} onChange={(e) => setMemberRole(project.id, userId, m.userId, e.target.value as Role).catch(toastError)}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Badge>{ROLE_LABEL[m.role]}</Badge>
                )}
                {manage && m.userId !== userId && (
                  <IconButton size="sm" label="Remover acesso" onClick={() => setMemberRole(project.id, userId, m.userId, null).catch(toastError)}>
                    <Trash2 className="size-3.5" />
                  </IconButton>
                )}
              </li>
            ))}
          </ul>
          {manage && USERS.some((u) => !project.members.some((m) => m.userId === u.id)) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted">
              Convidar diretamente:
              {USERS.filter((u) => !project.members.some((m) => m.userId === u.id)).map((u) => (
                <button key={u.id} className="flex items-center gap-1.5 rounded-full border border-line py-0.5 pr-2.5 pl-0.5 hover:border-accent" onClick={() => setMemberRole(project.id, userId, u.id, 'client').catch(toastError)}>
                  <Avatar userId={u.id} size={20} />
                  {u.name.split(' ')[0]} como Cliente
                </button>
              ))}
            </div>
          )}
        </section>

        {manage ? (
          <section className="space-y-3">
            <h3 className="text-[12.5px] font-semibold">Link de acesso seguro</h3>
            <div className="grid grid-cols-[1fr_140px_110px] gap-2">
              <Field label="Rótulo">
                <Input value={label} onChange={(e) => setLabel(e.target.value)} />
              </Field>
              <Field label="Papel">
                <Select value={linkRole} onChange={(e) => setLinkRole(e.target.value as Role)}>
                  {(['client', 'viewer', 'editor'] as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Expira em">
                <Select value={days} onChange={(e) => setDays(Number(e.target.value))}>
                  {[1, 7, 30].map((d) => (
                    <option key={d} value={d}>
                      {d} {d === 1 ? 'dia' : 'dias'}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button variant="primary" icon={<Link2 className="size-4" />} onClick={create}>
              Criar link
            </Button>
            {links.length > 0 && (
              <ul className="space-y-1.5">
                {links.map((l) => {
                  const expired = l.expiresAt < Date.now()
                  return (
                    <li key={l.id} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-[12px]">
                      <span className="min-w-0 flex-1">
                        <span className="font-medium">{l.label}</span> · {ROLE_LABEL[l.role]}
                        <span className="block text-muted">{l.revoked ? 'Revogado' : expired ? 'Expirado' : `Expira ${formatDate(l.expiresAt)}`}</span>
                      </span>
                      {!l.revoked && !expired && (
                        <>
                          <IconButton
                            size="sm"
                            label="Copiar link"
                            onClick={() => {
                              void navigator.clipboard?.writeText(urlOf(l.token))
                              toast('Link copiado')
                            }}
                          >
                            <Copy className="size-3.5" />
                          </IconButton>
                          <Button size="sm" variant="ghost" className="text-danger" onClick={() => revokeShareLink(l.id, userId).catch(toastError)}>
                            Revogar
                          </Button>
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="text-[11.5px] leading-snug text-muted">
              Links usam tokens aleatórios (não adivinháveis), expiram e podem ser revogados. Nesta versão sem servidor, o link funciona no mesmo navegador — ideal para demonstrar o fluxo de convite.
            </p>
          </section>
        ) : (
          <p className="text-[12.5px] text-muted">Somente produtores e admins podem convidar pessoas.</p>
        )}
      </div>
    </Modal>
  )
}
