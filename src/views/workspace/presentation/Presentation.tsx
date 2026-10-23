import { useMemo, useRef, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useWD } from '../context'
import { DesktopStage } from './DesktopStage'
import { useFocusReturn, useFullscreen, useViewport } from './hooks'
import { presentationLayout } from './layout'
import { PhoneStage } from './PhoneStage'
import { clockAt, formatClock } from './playback'
import { usePlayback } from './usePlayback'

/** The canvas header's play button. Focus goes back to it on close, even after a resize swapped the header. */
const PRESENT_BUTTON = 'button[aria-label="Apresentar"]'

/** Keeps Tab inside the dialog: past the last button it wraps to the first, and back. */
function trapTab(e: KeyboardEvent<HTMLElement>) {
  const buttons = [...e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled)')]
  const first = buttons[0]
  const last = buttons[buttons.length - 1]
  if (!first || !last) return e.preventDefault()
  const active = document.activeElement
  if (e.shiftKey && (active === first || active === e.currentTarget)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

/** The storyboard in full screen: each scene for its duration, in the current version of each scene. */
export function Presentation({ onClose }: { onClose: () => void }) {
  const { project, ordered } = useWD()
  const root = useRef<HTMLDivElement>(null)
  const durations = useMemo(() => ordered.map((f) => f.duration), [ordered])
  const player = usePlayback(durations, root)
  const { width, height } = useViewport()
  const layout = presentationLayout(width, height)
  useFullscreen(root, onClose)
  useFocusReturn(root, PRESENT_BUTTON)

  const total = durations.reduce((a, b) => a + b, 0)
  const clock = `${formatClock(clockAt(player.playback, durations))} / ${formatClock(total)}`

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // The canvas listens on the document too; none of its shortcuts apply here.
    e.stopPropagation()
    if (e.key === 'Tab') return trapTab(e)
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const key = e.key.toLowerCase()
    if (key === ' ' || key === 'k') player.toggle()
    else if (key === 'arrowleft') player.step(-1)
    else if (key === 'arrowright') player.step(1)
    else if (key === 'l') player.toggleLoop()
    else if (key === 'escape') onClose()
    else return
    // Space would also click the focused button.
    e.preventDefault()
  }

  if (!ordered.length) return null

  return createPortal(
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={`Apresentação de ${project.name}`}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onKeyUp={(e) => e.key === ' ' && e.preventDefault()}
      className="fixed inset-0 z-[70] h-dvh overflow-hidden bg-[#09090B] text-white outline-none"
    >
      {layout === 'phone' ? (
        <PhoneStage player={player} clock={clock} onClose={onClose} />
      ) : (
        <DesktopStage layout={layout} width={width} height={height} player={player} clock={clock} onClose={onClose} />
      )}
    </div>,
    document.body,
  )
}
