import { LogOut, Settings } from 'lucide-react'
import { signOut, useAuth } from '../lib/collab/auth'
import { askSignIn } from './AuthModal'
import { Avatar, cx, Menu, MenuItem, toast } from './ui'

/**
 * The avatar at the right of a header. Signed in: the account menu. Signed out: "Entrar".
 * `glass` is for the home screen, where it floats over the background image.
 */
export function AccountButton({ onSettings, glass = false, size = 32 }: { onSettings: () => void; glass?: boolean; size?: number }) {
  const { user, collab } = useAuth()

  if (!user)
    return collab ? (
      <button
        onClick={() => askSignIn()}
        className={cx(
          'flex h-8 items-center rounded-full px-3.5 text-[13px] leading-4 font-semibold text-fg transition-colors',
          glass ? 'border border-white/70 bg-white/55 backdrop-blur-lg backdrop-saturate-[1.8] hover:bg-white/80' : 'border border-line bg-white hover:bg-surface-2',
        )}
      >
        Entrar
      </button>
    ) : (
      <button aria-label="Configurações" onClick={onSettings} className="rounded-full transition-opacity hover:opacity-80">
        <Avatar id="guest" name="Você" size={size} />
      </button>
    )

  return (
    <Menu
      align="right"
      trigger={(toggle) => (
        <button aria-label="Sua conta" onClick={toggle} className="rounded-full transition-opacity hover:opacity-80">
          <Avatar id={user.id} name={user.name} size={size} />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="flex flex-col gap-0.5 px-2.5 pt-1.5 pb-2.5">
            <span className="text-[14px] leading-[18px] font-medium text-fg">{user.name}</span>
            <span className="truncate text-[12px] leading-4 text-muted">{user.email}</span>
          </div>
          <div className="mx-1 mb-1 border-t border-line" />
          <MenuItem icon={<Settings />} onClick={() => (close(), onSettings())}>
            Configurações
          </MenuItem>
          <MenuItem
            icon={<LogOut />}
            onClick={() => {
              close()
              void signOut().then(() => toast('Você saiu da conta. Projetos compartilhados ficam guardados para quando voltar.'))
            }}
          >
            Sair
          </MenuItem>
        </>
      )}
    </Menu>
  )
}
