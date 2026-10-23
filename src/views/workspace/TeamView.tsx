import { Check, Minus, Share2 } from 'lucide-react'
import { Avatar, Badge, Button } from '../../components/ui'
import { usePresence } from '../../lib/presence'
import { can, ROLE_LABEL, userById, type Capability } from '../../lib/session'
import type { Role } from '../../lib/types'
import { useWD } from './context'
import { useWS } from './store'

const CAPS: [Capability, string][] = [
  ['edit', 'Editar quadros e registrar versões'],
  ['ai', 'Solicitar alterações com IA'],
  ['comment', 'Comentar'],
  ['approve', 'Aprovar / pedir ajustes'],
  ['decide', 'Aceitar propostas do cliente'],
  ['docs', 'Ler documentos confidenciais'],
  ['manage', 'Convidar e gerenciar acesso'],
]
const ROLES: Role[] = ['admin', 'producer', 'editor', 'client', 'viewer']

export function TeamView() {
  const { project, ordered } = useWD()
  const peers = usePresence((s) => s.peers)
  const online = new Map(Object.values(peers).filter((p) => p.projectId === project.id).map((p) => [p.userId, p.frameId]))

  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-8 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Equipe</h2>
            <p className="text-[12.5px] text-muted">Quem participa deste projeto e o que cada papel pode fazer.</p>
          </div>
          <Button accent icon={<Share2 className="size-4" />} onClick={() => useWS.getState().set({ shareOpen: true })}>
            Convidar
          </Button>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {project.members.map((m) => {
            const u = userById(m.userId)
            const watching = online.get(m.userId)
            const f = ordered.find((x) => x.id === watching)
            return (
              <li key={m.userId} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5">
                <span className="relative">
                  <Avatar userId={m.userId} size={36} />
                  {online.has(m.userId) && <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-ok ring-2 ring-surface" />}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-[13.5px] font-semibold">{u.name}</span>
                  <span className="block text-[12px] text-muted">
                    {u.title} · {u.org}
                  </span>
                  {online.has(m.userId) && <span className="mt-0.5 block text-[11.5px] text-ok">Online{f ? ` · vendo “${f.title}”` : ''}</span>}
                </span>
                <Badge tone={m.role === 'client' ? 'accent' : 'neutral'}>{ROLE_LABEL[m.role]}</Badge>
              </li>
            )
          })}
        </ul>
        <section>
          <h3 className="mb-3 text-[14px] font-semibold">Permissões por papel</h3>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="px-4 py-2.5 font-medium">Capacidade</th>
                  {ROLES.map((r) => (
                    <th key={r} className="px-3 py-2.5 text-center font-medium">
                      {ROLE_LABEL[r]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CAPS.map(([cap, label]) => (
                  <tr key={cap} className="border-b border-line last:border-0">
                    <td className="px-4 py-2">{label}</td>
                    {ROLES.map((r) => (
                      <td key={r} className="px-3 py-2 text-center">
                        {can(r, cap) ? <Check className="mx-auto size-4 text-ok" /> : <Minus className="mx-auto size-4 text-line-strong" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[12px] text-muted">Alterações pedidas por clientes viram propostas: nunca substituem silenciosamente uma versão aprovada.</p>
        </section>
      </div>
    </div>
  )
}
