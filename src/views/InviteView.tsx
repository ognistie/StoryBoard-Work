import { useState } from 'react'
import { navigate } from '../App'
import { askSignIn } from '../components/AuthModal'
import { Button, toastError } from '../components/ui'
import { useAuth } from '../lib/collab/auth'
import { acceptInvite } from '../lib/collab/remote'

/** Where an invite link lands: sign in (or create the account), then join the project. */
export function InviteView({ token }: { token: string }) {
  const user = useAuth((s) => s.user)
  const [busy, setBusy] = useState(false)

  const join = async () => {
    setBusy(true)
    try {
      const project = await acceptInvite(token)
      navigate(`/p/${project.id}`)
    } catch (e) {
      toastError(e)
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-full items-center justify-center bg-bg bg-cover bg-center px-5" style={{ backgroundImage: 'url(/bg-inicio.webp)' }}>
      <div className="flex w-full max-w-[420px] flex-col items-center gap-5 rounded-[24px] border border-line bg-surface px-7 py-8 text-center shadow-[0_1px_2px_#0000000A,0_24px_48px_#00000014]">
        <span className="font-display text-[30px] leading-8 text-fg">Decupa</span>
        <div className="flex flex-col gap-2">
          <h1 className="text-[24px] leading-[30px] font-medium tracking-[-0.025em] text-fg">Você recebeu um convite</h1>
          <p className="text-[15px] leading-[22px] text-muted">
            {user ? `Entre no projeto como ${user.name}. Você verá as cenas, o chat e a pasta de arquivos do time.` : 'Entre com o e-mail que recebeu o convite, ou crie sua conta, para participar do projeto.'}
          </p>
        </div>
        {user ? (
          <Button variant="primary" loading={busy} onClick={() => void join()} className="h-11 w-full">
            Entrar no projeto
          </Button>
        ) : (
          <Button variant="primary" onClick={() => askSignIn(undefined, () => void join())} className="h-11 w-full">
            Entrar ou criar conta
          </Button>
        )}
        <a href="#/" className="text-[14px] text-link hover:underline">
          Voltar ao início
        </a>
      </div>
    </div>
  )
}
