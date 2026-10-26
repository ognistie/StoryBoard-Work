import { useRef, useState, type FormEvent } from 'react'
import { create } from 'zustand'
import { signIn, useAuth } from '../lib/collab/auth'
import { refreshRemote } from '../lib/collab/remote'
import { Button, cx, Modal, toast } from './ui'

/** Opens the sign-in dialog from anywhere. `reason` says why it opened ("Para compartilhar…"). */
export const useAuthModal = create<{ open: boolean; reason?: string; onDone?: () => void }>(() => ({ open: false }))

export function askSignIn(reason?: string, onDone?: () => void) {
  useAuthModal.setState({ open: true, reason, onDone })
}

const FIELD = 'h-11 w-full rounded-[12px] border border-line bg-white px-3.5 text-[15px] text-fg outline-none transition-colors placeholder:text-faint focus:border-accent max-md:text-[16px]'

export function AuthModal() {
  const { open, reason, onDone } = useAuthModal()
  const { collab, google } = useAuth()
  const submitting = useRef(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const close = () => {
    useAuthModal.setState({ open: false, reason: undefined, onDone: undefined })
    setError(undefined)
    setPassword('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setBusy(true)
    setError(undefined)
    try {
      const user = await signIn({ mode, email, password, name })
      close()
      toast(mode === 'signup' ? `Conta criada. Bem-vindo, ${user?.name.split(' ')[0]}!` : `Olá, ${user?.name.split(' ')[0]}!`, { tone: 'ok' })
      void refreshRemote()
      onDone?.()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  const tab = (id: 'login' | 'signup', label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === id}
      disabled={busy}
      onClick={() => (setMode(id), setError(undefined))}
      className={cx('flex h-[30px] flex-1 items-center justify-center rounded-full text-[13px] leading-4 transition-colors', mode === id ? 'bg-white font-semibold text-black shadow-[0_1px_2px_#0000001A]' : 'font-medium text-fg-2 hover:text-black')}
    >
      {label}
    </button>
  )

  return (
    <Modal open={open} onClose={close} title={mode === 'login' ? 'Entrar no Decupa' : 'Criar conta'} width={420}>
      {!collab ? (
        <p className="text-[14px] leading-5 text-fg-2">
          Contas e projetos compartilhados precisam do servidor da Decupa, que não respondeu agora. Seus projetos continuam salvos neste navegador.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          {google && <a href={`/api/google?returnTo=${encodeURIComponent(location.hash || '#/')}`} className="flex h-11 items-center justify-center rounded-[12px] border border-line bg-white text-[14px] font-medium text-fg hover:bg-surface-2">Continuar com Google</a>}
          {reason && <p className="text-[14px] leading-5 text-fg-2">{reason}</p>}
          <div role="tablist" className="flex rounded-full bg-surface-2 p-[3px]">
            {tab('login', 'Entrar')}
            {tab('signup', 'Criar conta')}
          </div>
          {mode === 'signup' && <input aria-label="Seu nome" maxLength={60} className={FIELD} placeholder="Seu nome" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />}
          <input aria-label="E-mail" maxLength={254} className={FIELD} type="email" placeholder="E-mail" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input
            className={FIELD}
            aria-label="Senha"
            maxLength={200}
            type="password"
            placeholder={mode === 'signup' ? 'Senha (mín. 8 caracteres)' : 'Senha'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === 'signup' ? 8 : 1}
          />
          {error && (
            <p role="alert" className="rounded-[10px] bg-danger-soft px-3 py-2 text-[13px] leading-[18px] text-danger">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" loading={busy} className="mt-1 h-11">
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </Button>
          <p className="text-center text-[12px] leading-4 text-muted">Com a conta, você convida pessoas pelo e-mail e trabalha nos mesmos projetos, com chat e pasta de arquivos.</p>
        </form>
      )}
    </Modal>
  )
}
