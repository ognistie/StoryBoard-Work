import { useLiveQuery } from 'dexie-react-hooks'
import { Link2 } from 'lucide-react'
import { useState } from 'react'
import { navigate } from '../App'
import { Logo } from '../components/Shell'
import { Avatar, Button, toastError } from '../components/ui'
import { db } from '../lib/db'
import { redeemShareLink } from '../lib/repo'
import { ROLE_LABEL, useSession, USERS } from '../lib/session'

export function JoinView({ token }: { token: string }) {
  const link = useLiveQuery(() => db.shareLinks.where('token').equals(token).first(), [token], null)
  const project = useLiveQuery(() => (link ? db.projects.get(link.projectId) : undefined), [link])
  const { userId, setUser } = useSession()
  const [busy, setBusy] = useState(false)
  const invalid = link === undefined || (link && (link.revoked || link.expiresAt < Date.now()))

  const join = async () => {
    setBusy(true)
    try {
      const id = await redeemShareLink(token, userId)
      navigate(`/p/${id}`)
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-md">
        <Logo />
        {link === null ? (
          <p className="mt-6 text-[13px] text-muted">Verificando convite…</p>
        ) : invalid ? (
          <>
            <h1 className="mt-6 text-lg font-semibold">Link indisponível</h1>
            <p className="mt-1 text-[13px] text-muted">Este convite não existe, expirou ou foi revogado. Peça um novo link ao responsável pelo projeto.</p>
            <Button className="mt-5" onClick={() => navigate('/')}>
              Ir para o início
            </Button>
          </>
        ) : (
          <>
            <div className="mt-6 flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Link2 className="size-5" />
            </div>
            <h1 className="mt-3 text-lg font-semibold tracking-tight">Convite para “{project?.name}”</h1>
            <p className="mt-1 text-[13px] text-muted">
              Você entrará como <b className="text-fg">{ROLE_LABEL[link!.role]}</b>. Escolha com qual identidade de demonstração deseja acessar.
            </p>
            <div className="mt-4 space-y-1">
              {USERS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setUser(u.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${u.id === userId ? 'border-accent bg-accent-soft' : 'border-transparent hover:bg-surface-2'}`}
                >
                  <Avatar userId={u.id} size={28} />
                  <span className="leading-tight">
                    <span className="block text-[13px] font-medium">{u.name}</span>
                    <span className="block text-[11.5px] text-muted">
                      {u.title} · {u.org}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <Button variant="primary" size="lg" className="mt-5 w-full" loading={busy} onClick={join}>
              Entrar no projeto
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
