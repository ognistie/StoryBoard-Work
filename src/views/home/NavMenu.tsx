import { CircleHelp, FolderClosed, Lightbulb, Plus, Settings, Users } from 'lucide-react'
import { Menu, MenuItem, toast } from '../../components/ui'

export const SECTION = { mine: 'meus-projetos', shared: 'compartilhados', examples: 'exemplos', composer: 'briefing' } as const

/**
 * Rings the element a menu item jumped to. The whole home screen often fits the window, so a
 * scroll alone may not move anything and the click would look ignored.
 */
function flash(el: HTMLElement) {
  el.classList.remove('flash')
  void el.offsetWidth // restarts the animation on a second click
  el.classList.add('flash')
  el.addEventListener('animationend', () => el.classList.remove('flash'), { once: true })
}

/** Scrolls to a section of the home screen. A section that is not there yet says why and falls back to the briefing field. */
function scrollToSection(id: string, missing?: string) {
  const el = document.getElementById(id)
  if (!el) {
    if (missing) toast(missing)
    return focusComposer()
  }
  el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  flash(el)
}

function focusComposer() {
  const composer = document.getElementById(SECTION.composer)
  if (!composer) return
  composer.scrollIntoView({ behavior: 'smooth', block: 'center' })
  composer.querySelector('textarea')?.focus({ preventScroll: true })
  flash(composer)
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
            <MenuItem icon={<FolderClosed />} onClick={go(() => scrollToSection(SECTION.mine, 'Você ainda não tem projetos. Cole um briefing para criar o primeiro.'))}>
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
