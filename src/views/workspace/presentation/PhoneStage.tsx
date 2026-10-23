import { useRef, type PointerEvent } from 'react'
import { cx } from '../../../components/ui'
import { useWD } from '../context'
import { parseDialogue, quoted } from '../scene'
import { CloseIcon, PauseIcon, PlayIcon } from './icons'
import { ProgressBar } from './ProgressBar'
import { LAYER_Z, SceneImage, useSceneLayers } from './SceneLayers'
import { ScenePills } from './ScenePills'
import type { Player } from './usePlayback'

/** A touch longer than this is a hold, which pauses until the finger lifts. */
const HOLD_MS = 250

/**
 * Taps on the left third go back a scene, on the right third forward. Holding anywhere pauses.
 * Buttons sit above this layer, so their taps never reach it.
 */
function useTapZones(player: Player) {
  const hold = useRef<{ timer: ReturnType<typeof setTimeout>; held: boolean }>()
  const release = () => {
    if (!hold.current) return
    clearTimeout(hold.current.timer)
    if (hold.current.held) player.hold(false)
    hold.current = undefined
  }
  return {
    onPointerDown: () => {
      release()
      const timer = setTimeout(() => {
        if (hold.current) hold.current.held = true
        player.hold(true)
      }, HOLD_MS)
      hold.current = { timer, held: false }
    },
    onPointerUp: (e: PointerEvent<HTMLDivElement>) => {
      const tap = hold.current && !hold.current.held
      release()
      if (!tap) return
      const third = e.currentTarget.getBoundingClientRect().width / 3
      if (e.clientX < third) player.step(-1)
      else if (e.clientX > third * 2) player.step(1)
    },
    onPointerCancel: release,
    onPointerLeave: release,
  }
}

/** Phone ("03 — Apresentação · Mobile"): the drawing covers the screen, text sits on dark shades at the top and bottom. */
export function PhoneStage({ player, clock, onClose }: { player: Player; clock: string; onClose: () => void }) {
  const { project, ordered } = useWD()
  const { playback, exit, loop } = player
  const index = playback.index
  const frame = ordered[index]
  const next = index < ordered.length - 1 ? index + 1 : loop && ordered.length > 1 ? 0 : undefined
  const layers = useSceneLayers(index, next, exit)
  const { line } = parseDialogue(frame.dialogue)
  const zones = useTapZones(player)

  return (
    <div className="absolute inset-0 select-none">
      {layers.map((l) => (
        <div
          key={ordered[l.index].id}
          className={cx('scene-fade absolute inset-0 overflow-clip', l.role === 'current' ? 'opacity-100' : 'opacity-0')}
          style={{ zIndex: LAYER_Z[l.role] }}
        >
          <SceneImage frame={ordered[l.index]} t={l.t} />
        </div>
      ))}
      <div className="absolute inset-x-0 top-0 z-10 h-[170px]" style={{ backgroundImage: 'linear-gradient(in oklab 180deg, #0000008C 0%, #00000000 100%)' }} />
      <div className="absolute inset-x-0 bottom-0 z-10 h-[374px]" style={{ backgroundImage: 'linear-gradient(in oklab 0deg, #000000DB 0%, #0000009E 45%, #00000000 100%)' }} />

      <div aria-hidden className="absolute inset-0 z-10 touch-manipulation" onContextMenu={(e) => e.preventDefault()} {...zones} />

      <div className="pointer-events-none absolute inset-x-4 z-20 flex flex-col gap-3.5" style={{ top: 'max(16px, env(safe-area-inset-top))' }}>
        <ProgressBar frames={ordered} index={index} look="phone" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="truncate text-[14px] leading-[18px] font-semibold text-white">{project.name}</h2>
            <span className="text-[12px] leading-4 text-[#FFFFFFB3] tabular-nums">
              Cena {index + 1} de {ordered.length} · {clock}
            </span>
          </div>
          <button
            aria-label="Sair da apresentação"
            onClick={onClose}
            className="pointer-events-auto flex size-9 shrink-0 items-center justify-center rounded-[18px] border border-[#FFFFFF2E] bg-[#00000047] backdrop-blur-[20px]"
          >
            <CloseIcon size={12} />
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-5 z-20 flex flex-col gap-3" style={{ bottom: 'max(20px, calc(env(safe-area-inset-bottom) + 10px))' }}>
        <div key={frame.id} className="scene-fade flex flex-col gap-3">
          <h3 className="font-display text-[44px] leading-[44px] text-white">{frame.title}</h3>
          {line && <p className="text-[20px] leading-[27px] font-medium tracking-[-0.01em] text-white">{quoted(line)}</p>}
        </div>
        <div className="flex items-center justify-between gap-3 pt-1.5">
          <ScenePills frame={frame} look="phone" />
          <button
            aria-label={playback.status === 'playing' ? 'Pausar' : 'Reproduzir'}
            onClick={player.toggle}
            className="pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-full bg-white transition-transform active:scale-95"
          >
            {playback.status === 'playing' ? <PauseIcon /> : <PlayIcon color="#09090B" />}
          </button>
        </div>
      </div>
    </div>
  )
}
