import { Check, Copy, LogOut, UserMinus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { create } from 'zustand'
import { navigate } from '../../App'
import { askSignIn } from '../../components/AuthModal'
import { Avatar, Button, cx, Modal, Select, toast, toastError } from '../../components/ui'
import { useAuth } from '../../lib/collab/auth'
import { ROLE_HINT, ROLE_LABEL, SHARE_ROLES, type ShareRole } from '../../lib/collab/contract'
import { inviteByEmail, leaveProject, removeMember, setMemberRole } from '../../lib/collab/remote'
import { shareProject, useSync } from '../../lib/collab/sync'
import { timeAgo } from '../../lib/hooks'
import { userById } from '../../lib/session'
import { useWD } from './context'

export const useShareModal = create<{ open: boolean }>(() => ({ open: false }))

const ROLE_OPTIONS = SHARE_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r], hint: ROLE_HINT[r] }))
const FIELD = 'h-10 min-w-0 flex-1 rounded-full border border-line bg-white px-4 text-[14px] text-fg outline-none transition-colors placeholder:text-faint focus:border-accent max-md:text-[16px]'

/** The blue pill of the header (and of the chat when the project is local). */
export function ShareButton({ compact = false }: { compact?: boolean }) {
  return (
    <button
      onClick={() => useShareModal.setState({ open: true })}
      className={cx('flex shrink-0 items-center rounded-full bg-accent font-medium text-white transition-colors hover:bg-[#0077ed]', compact ? 'h-8 px-3.5 text-[13px] leading-4' : 'h-9 px-5 text-[14px] leading-[18px]')}
    >
      Compartilhar
    </button>
  )
}

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-2 rounded-[12px] bg-surface-2 py-1.5 pr-1.5 pl-3">
      <span className="min-w-0 flex-1 truncate text-[13px] text-fg-2">{link}</span>
      <button
        onClick={() =>
          void navigator.clipboard.writeText(link).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1800)
          })
        }
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-[13px] font-medium text-fg shadow-[0_1px_2px_#0000001A] transition-colors hover:bg-[#FAFAFA]"
      >
        {copied ? <Check className="size-3.5 text-accent" /> : <Copy className="size-3.5" />}
        {copied ? 'Copiado' : 'Copiar link'}
      </button>
    </div>
  )
}

function InviteForm() {
  const { project } = useWD()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ShareRole>('editor')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<{ email: string; link: string; emailed: boolean }>()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await inviteByEmail(project.id, email, role)
      setSent({ email: res.invite.email, link: res.link, emailed: res.emailed })
      setEmail('')
    } catch (err) {
      toastError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <input type="email" required placeholder="E-mail da pessoa" value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} aria-label="E-mail para convidar" />
        <Select label="Papel" value={role} options={ROLE_OPTIONS} onChange={setRole} align="right" className="flex h-10 rounded-full border border-line bg-white px-4 font-medium hover:bg-surface-2" />
        <Button type="submit" variant="primary" loading={busy} className="h-10">
          Convidar
        </Button>
      </form>
      {sent && (
        <div className="flex flex-col gap-2 rounded-[14px] border border-line px-3.5 py-3">
          <p className="text-[13px] leading-[18px] text-fg-2">
            {sent.emailed ? `Convite enviado para ${sent.email}.` : `Convite criado para ${sent.email}.`} A pessoa deve abrir o link e entrar com esse e-mail. Você pode copiar o convite abaixo:
          </p>
          <CopyLink link={sent.link} />
        </div>
      )}
    </div>
  )
}

function Members() {
  const { project, userId } = useWD()
  const online = useSync((s) => s.byProject[project.id]?.online) ?? []
  const myRole = project.members.find((m) => m.userId === userId)?.role
  const manager = myRole === 'producer'
  const [busy, setBusy] = useState<string>()

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id)
    try {
      await fn()
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <ul className="flex flex-col">
      {project.members.map((m) => {
        const person = userById(m.userId)
        const me = m.userId === userId
        const owner = m.userId === project.ownerId
        return (
          <li key={m.userId} className="flex items-center gap-3 py-2">
            <Avatar id={m.userId} name={person.name} size={34} online={online.includes(m.userId)} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[14px] leading-[18px] font-medium text-fg">
                {person.name}
                {me && <span className="font-normal text-muted"> (você)</span>}
              </span>
              <span className="truncate text-[12px] leading-4 text-muted">{owner ? 'Criou o projeto' : person.org}</span>
            </div>
            {manager && !owner && !me ? (
              <>
                <Select
                  label={`Papel de ${person.name}`}
                  value={m.role as ShareRole}
                  options={ROLE_OPTIONS}
                  disabled={busy === m.userId}
                  onChange={(role) => void run(m.userId, () => setMemberRole(project.id, m.userId, role))}
                  align="right"
                  className="flex h-8 rounded-full px-3 text-[13px] font-medium hover:bg-surface-2"
                />
                <button
                  aria-label={`Remover ${person.name}`}
                  title="Remover do projeto"
                  disabled={busy === m.userId}
                  onClick={() => confirm(`Remover ${person.name} do projeto?`) && void run(m.userId, () => removeMember(project.id, m.userId))}
                  className="flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <UserMinus className="size-4" />
                </button>
              </>
            ) : (
              <span className="px-3 text-[13px] text-muted">{ROLE_LABEL[m.role as ShareRole] ?? m.role}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** Share a project, invite people by email, manage who is in it. */
export function ShareModal() {
  const open = useShareModal((s) => s.open)
  const close = () => useShareModal.setState({ open: false })
  const { project, userId } = useWD()
  const { user, collab } = useAuth()
  const status = useSync((s) => s.byProject[project.id])
  const [busy, setBusy] = useState(false)

  const share = async () => {
    setBusy(true)
    try {
      await shareProject(project.id)
      toast('Projeto compartilhado. Agora convide o time.', { tone: 'ok' })
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  const leave = async () => {
    if (!confirm(`Sair de “${project.name}”? A cópia deste navegador será removida.`)) return
    try {
      await leaveProject(project.id, userId)
      close()
      navigate('/')
    } catch (e) {
      toastError(e)
    }
  }

  let body
  if (!collab) body = <p className="text-[14px] leading-5 text-fg-2">O servidor da Decupa não respondeu. O projeto continua salvo neste navegador; tente compartilhar de novo em instantes.</p>
  else if (!user)
    body = (
      <div className="flex flex-col gap-3">
        <p className="text-[14px] leading-5 text-fg-2">Entre com seu e-mail para compartilhar. Quem você convidar edita as mesmas cenas, conversa no chat e usa a mesma pasta de arquivos.</p>
        <Button variant="primary" className="self-start" onClick={() => askSignIn('Entre para compartilhar este projeto.', () => useShareModal.setState({ open: true }))}>
          Entrar ou criar conta
        </Button>
      </div>
    )
  else if (!project.remote)
    body = (
      <div className="flex flex-col gap-3">
        <p className="text-[14px] leading-5 text-fg-2">
          Hoje “{project.name}” está só neste navegador. Ao compartilhar, o projeto, as versões, o chat e a pasta sobem para o servidor e ficam iguais para todo o time, em tempo real.
        </p>
        <Button variant="primary" loading={busy} className="self-start" onClick={() => void share()}>
          Compartilhar projeto
        </Button>
      </div>
    )
  else
    body = (
      <div className="flex flex-col gap-5">
        {project.members.find((m) => m.userId === userId)?.role === 'producer' && <InviteForm />}
        <div className="flex flex-col gap-1">
          <h3 className="text-[13px] leading-4 font-medium text-muted">Pessoas no projeto</h3>
          <Members />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line pt-3.5 text-[12px] leading-4 text-muted">
          <span>
            {status?.state === 'offline'
              ? 'Sem conexão: as mudanças sobem quando voltar.'
              : status?.state === 'error'
                ? status.error
                : status?.lastSyncedAt
                  ? `Sincronizado ${timeAgo(status.lastSyncedAt)}`
                  : 'Sincronizando…'}
          </span>
          {project.ownerId !== userId && (
            <button onClick={() => void leave()} className="flex items-center gap-1.5 text-danger hover:underline">
              <LogOut className="size-3.5" />
              Sair do projeto
            </button>
          )}
        </div>
      </div>
    )

  return (
    <Modal open={open} onClose={close} title="Compartilhar" width={540}>
      {body}
    </Modal>
  )
}
