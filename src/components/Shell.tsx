import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Moon, Settings, Sun } from 'lucide-react'
import { useState } from 'react'
import { db } from '../lib/db'
import { ROLE_LABEL, roleIn, useSession, USERS, userById } from '../lib/session'
import { applyTheme, isRealAI, useSettings } from '../lib/settings'
import { SettingsModal } from './SettingsModal'
import { Avatar, Badge, cx, IconButton, Menu } from './ui'

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <a href="#/" className="flex items-center gap-2 rounded-lg" aria-label="Frameline — início">
      <svg viewBox="0 0 32 32" className="size-7 shrink-0">
        <rect width="32" height="32" rx="8" className="fill-fg" />
        <rect x="6" y="9" width="9" height="6" rx="1.5" className="fill-bg" />
        <rect x="17" y="9" width="9" height="6" rx="1.5" className="fill-accent" />
        <rect x="6" y="17" width="9" height="6" rx="1.5" className="fill-bg" opacity=".55" />
        <rect x="17" y="17" width="9" height="6" rx="1.5" className="fill-bg" opacity=".55" />
      </svg>
      {!compact && <span className="text-[15px] font-semibold tracking-tight">Frameline</span>}
    </a>
  )
}

export function ProviderBadge() {
  const s = useSettings()
  const real = isRealAI(s)
  return (
    <Badge tone={real ? 'ok' : 'warn'} className="hidden sm:inline-flex">
      <span className={cx('size-1.5 rounded-full', real ? 'bg-ok' : 'bg-warn')} />
      {real ? 'IA: OpenAI' : 'IA: modo demo'}
    </Badge>
  )
}

export function UserMenu({ projectId }: { projectId?: string }) {
  const { userId, setUser } = useSession()
  const theme = useSettings((s) => s.theme)
  const setSettings = useSettings((s) => s.set)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const project = useLiveQuery(() => (projectId ? db.projects.get(projectId) : undefined), [projectId])
  const me = userById(userId)
  const role = roleIn(project, userId)

  const toggleTheme = () => {
    const t = theme === 'light' ? 'dark' : 'light'
    setSettings({ theme: t })
    applyTheme(t)
  }

  return (
    <div className="flex items-center gap-1">
      <IconButton label={theme === 'light' ? 'Tema escuro' : 'Tema claro'} onClick={toggleTheme}>
        {theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4" />}
      </IconButton>
      <IconButton label="Configurações" onClick={() => setSettingsOpen(true)}>
        <Settings className="size-4" />
      </IconButton>
      <Menu
        align="right"
        trigger={(toggle) => (
          <button onClick={toggle} className="ml-1 flex items-center gap-2 rounded-full py-0.5 pr-2.5 pl-0.5 transition-colors hover:bg-surface-2" aria-label="Trocar usuário">
            <Avatar userId={userId} size={28} />
            <span className="hidden text-left leading-tight md:block">
              <span className="block text-[12.5px] font-medium">{me.name.split(' ')[0]}</span>
              <span className="block text-[11px] text-muted">{role ? ROLE_LABEL[role] : me.org}</span>
            </span>
          </button>
        )}
      >
        {(close) => (
          <div className="w-72">
            <div className="px-2.5 pt-2 pb-1.5 text-[11px] font-medium tracking-wide text-muted uppercase">Simular acesso como</div>
            {USERS.map((u) => {
              const r = roleIn(project, u.id)
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    setUser(u.id)
                    close()
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-surface-2"
                >
                  <Avatar userId={u.id} size={28} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block text-[13px] font-medium">{u.name}</span>
                    <span className="block truncate text-[11.5px] text-muted">
                      {u.title} · {u.org}
                      {project && <> · {r ? ROLE_LABEL[r] : 'sem acesso'}</>}
                    </span>
                  </span>
                  {u.id === userId && <Check className="size-4 text-accent" />}
                </button>
              )
            })}
            <p className="border-t border-line px-2.5 pt-2 pb-1.5 text-[11.5px] leading-snug text-muted">
              Cada aba pode usar uma identidade diferente. Abra o projeto em duas janelas para ver a colaboração em tempo real.
            </p>
          </div>
        )}
      </Menu>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
