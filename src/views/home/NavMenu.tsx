import { CircleHelp, FolderClosed, House, Lightbulb, Plus, Settings, Users } from 'lucide-react'
import { Menu, MenuItem } from '../../components/ui'

export const SECTION = { mine: 'meus-projetos', shared: 'compartilhados', examples: 'exemplos', composer: 'briefing' } as const

/** Scrolls to a section of the home screen; a section that is not there (no projects yet) falls back to the briefing field. */
function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return focusComposer()
  el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}

function focusComposer() {
  scrollTo({ top: 0, behavior: 'smooth' })
  document.querySelector<HTMLTextAreaElement>(`#${SECTION.composer} textarea`)?.focus({ preventScroll: true })
}

/** The menu at the left of the logo: jumps to the sections of the home screen, settings and help. */
export function NavMenu({ onSettings, hasShared }: { onSettings: () => void; hasShared: boolean }) {
  return (
    <Menu
      trigger={(toggle) => (
        <button
          aria-label="Menu"
          onClick={toggle}
          className="-ml-1.5 flex size-9 items-center justify-center rounded-full text-fg transition-colors hover:bg-white/60 aria-expanded:bg-white/60"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path d="M3 5h12M3 9h12M3 13h12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      )}
    >
      {(close) => {
        const go = (fn: () => void) => () => (close(), fn())
        return (
          <nav aria-label="Navegação" className="flex flex-col">
            <MenuItem icon={<House />} onClick={go(() => scrollTo({ top: 0, behavior: 'smooth' }))}>
              Início
            </MenuItem>
            <MenuItem icon={<FolderClosed />} onClick={go(() => scrollToSection(SECTION.mine))}>
              Meus projetos
            </MenuItem>
            <MenuItem icon={<Plus />} onClick={go(focusComposer)}>
              Novo projeto
            </MenuItem>
            {hasShared && (
              <MenuItem icon={<Users />} onClick={go(() => scrollToSection(SECTION.shared))}>
                Compartilhados comigo
              </MenuItem>
            )}
            <MenuItem icon={<Lightbulb />} onClick={go(() => scrollToSection(SECTION.examples))}>
              Exemplos para explorar
            </MenuItem>
            <div className="mx-1 my-1 border-t border-line" />
            <MenuItem icon={<Settings />} onClick={go(onSettings)}>
              Configurações
            </MenuItem>
            <MenuItem icon={<CircleHelp />} onClick={go(() => window.open('/guia/storyboard-com-ia.html', '_blank', 'noopener'))}>
              Ajuda e guia
            </MenuItem>
          </nav>
        )
      }}
    </Menu>
  )
}
