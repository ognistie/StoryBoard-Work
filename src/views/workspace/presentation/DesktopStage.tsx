import { cx } from '../../../components/ui'
import { useImageUrl } from '../../../lib/hooks'
import type { Frame } from '../../../lib/types'
import { useWD } from '../context'
import { ASPECT_RATIO, FORMAT_LABEL, parseDialogue, quoted } from '../scene'
import { useIdle } from './hooks'
import { CloseIcon, LoopIcon, PauseIcon, PlayIcon, SkipIcon } from './icons'
import { columnInset, frameSize, stageRoom } from './layout'
import { ProgressBar } from './ProgressBar'
import { LAYER_Z, SceneImage, useSceneLayers, type Layer } from './SceneLayers'
import { ScenePills } from './ScenePills'
import type { Player } from './usePlayback'

const EYEBROW = 'text-[13px] leading-4 font-semibold tracking-[0.08em] text-[#FFFFFF80] uppercase'
const ROUND = 'flex size-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[#FFFFFF14]'

/** Desktop and tablet ("03 — Apresentação"): the framed scene over its own blurred drawing. Tablet drops the side columns. */
export function DesktopStage({ layout, width, height, player, clock, onClose }: { layout: 'desktop' | 'tablet'; width: number; height: number; player: Player; clock: string; onClose: () => void }) {
  const { project, ordered } = useWD()
  const { playback, exit, loop } = player
  const index = playback.index
  const frame = ordered[index]
  const next = index < ordered.length - 1 ? index + 1 : loop && ordered.length > 1 ? 0 : undefined
  const layers = useSceneLayers(index, next, exit)
  const room = stageRoom(layout, width, height)
  const inset = columnInset(width)
  const [idle, wake] = useIdle(2500)
  const total = ordered.reduce((sum, f) => sum + f.duration, 0)

  return (
    <div onPointerMove={wake} className={cx('absolute inset-0', idle && 'cursor-none')}>
      <div className="absolute inset-0 isolate">
        {layers
          .filter((l) => l.role !== 'next')
          .map((l) => (
            <Backdrop key={ordered[l.index].id} frame={ordered[l.index]} layer={l} />
          ))}
      </div>
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(ellipse 70% 70% at 50% 45% in oklab, #09090B59 0%, #09090BEB 100%)' }} />

      <header className="absolute inset-x-10 top-7 flex flex-col gap-[18px]">
        <ProgressBar frames={ordered} index={index} look="desktop" />
        <div className="flex items-center justify-between gap-6">
          <div className="flex min-w-0 items-baseline gap-3">
            <span className="shrink-0 font-display text-[24px] leading-7 text-white">Decupa</span>
            <h2 className="truncate text-[14px] leading-[18px] font-medium text-[#FFFFFFD9]">{project.name}</h2>
            <span className="shrink-0 text-[13px] leading-[18px] text-[#FFFFFF73]">
              {FORMAT_LABEL[project.aspect]} · {total}s
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 shrink-0 items-center gap-2.5 rounded-[18px] border border-[#FFFFFF1F] bg-[#FFFFFF14] pr-2 pl-3.5 backdrop-blur-[20px] transition-colors hover:bg-[#FFFFFF1F]"
          >
            <span className="text-[13px] leading-4 text-[#FFFFFF99]">Esc para sair</span>
            <span className="flex size-6 items-center justify-center rounded-xl bg-[#FFFFFF1F]">
              <CloseIcon size={10} />
            </span>
          </button>
        </div>
      </header>

      <div className="absolute inset-x-0 top-28 bottom-28 flex flex-col items-center justify-center">
        <div className="relative isolate w-full shrink-0" style={{ height: room.tall }}>
          {layout === 'desktop' && (
            <>
              <SceneInfo key={frame.id} frame={frame} number={index + 1} count={ordered.length} left={inset} />
              {next !== undefined && <UpNext key={ordered[next].id} frame={ordered[next]} number={next + 1} right={inset} />}
            </>
          )}
          {layers.map((l) => (
            <FrameLayer key={ordered[l.index].id} frame={ordered[l.index]} layer={l} room={room} />
          ))}
        </div>
        <Caption key={frame.id} frame={frame} withTitle={layout === 'tablet'} />
      </div>

      <div
        className={cx(
          'absolute bottom-8 left-1/2 flex h-14 w-[336px] -translate-x-1/2 items-center justify-between rounded-[28px] border border-[#FFFFFF1F] bg-[#FFFFFF14] pr-2 pl-2.5 shadow-[0_12px_40px_#00000066] backdrop-blur-[24px] backdrop-saturate-160 transition-opacity duration-300',
          idle && 'pointer-events-none opacity-0 has-[:focus-visible]:pointer-events-auto has-[:focus-visible]:opacity-100',
        )}
      >
        <div className="flex items-center gap-1">
          <button aria-label="Cena anterior" onClick={() => player.step(-1)} className={ROUND}>
            <SkipIcon dir="back" />
          </button>
          <button
            aria-label={playback.status === 'playing' ? 'Pausar' : 'Reproduzir'}
            onClick={player.toggle}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white transition-transform active:scale-95"
          >
            {playback.status === 'playing' ? <PauseIcon /> : <PlayIcon color="#09090B" />}
          </button>
          <button aria-label="Próxima cena" onClick={() => player.step(1)} className={ROUND}>
            <SkipIcon dir="forward" />
          </button>
        </div>
        <span className="text-[14px] leading-[18px] font-medium text-[#FFFFFF73] tabular-nums">{clock}</span>
        <button aria-label="Repetir" aria-pressed={loop} onClick={player.toggleLoop} className={cx(ROUND, loop && 'bg-[#FFFFFF1F]')}>
          <LoopIcon on={loop} />
        </button>
      </div>
    </div>
  )
}

const layerOpacity = (l: Layer) => (l.role === 'current' ? 'opacity-100' : 'opacity-0')

function Backdrop({ frame, layer }: { frame: Frame; layer: Layer }) {
  const url = useImageUrl(frame.imageId)
  return (
    <div className={cx('scene-fade absolute inset-0', layerOpacity(layer))} style={{ zIndex: LAYER_Z[layer.role] }}>
      {url && <img src={url} alt="" className="absolute -top-[200px] -left-[120px] h-[calc(100%+400px)] w-[calc(100%+240px)] max-w-none object-cover opacity-35 blur-[80px] saturate-140" />}
    </div>
  )
}

function FrameLayer({ frame, layer, room }: { frame: Frame; layer: Layer; room: { tall: number; wide: number } }) {
  const size = frameSize('16:9', room)
  return (
    <div
      className={cx(
        'scene-fade absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-clip rounded-[20px] bg-white shadow-[0_0_0_1px_#FFFFFF14,0_30px_80px_#0000008C,0_8px_24px_#00000059]',
        layerOpacity(layer),
      )}
      style={{ ...size, zIndex: LAYER_Z[layer.role] }}
    >
      <SceneImage frame={frame} t={layer.t} />
    </div>
  )
}

/** Left column: which scene, its title, description and pills. Its top sits 112px above the frame's centre, as in Paper. */
function SceneInfo({ frame, number, count, left }: { frame: Frame; number: number; count: number; left: number }) {
  return (
    <div className="scene-fade absolute top-[calc(50%-112px)] flex w-[340px] flex-col gap-4" style={{ left }}>
      <span className={EYEBROW}>
        Cena {number} de {count}
      </span>
      <h3 className="font-display text-[64px] leading-[64px] tracking-[-0.01em] text-white">{frame.title}</h3>
      {frame.description && <p className="line-clamp-4 text-[17px] leading-[26px] text-[#FFFFFFB8]">{frame.description}</p>}
      <div className="pt-1">
        <ScenePills frame={frame} look="desktop" />
      </div>
    </div>
  )
}

/** Right column: the next scene, its thumbnail in its own format inside a 96px square. */
function UpNext({ frame, number, right }: { frame: Frame; number: number; right: number }) {
  const { project } = useWD()
  const url = useImageUrl(frame.imageId)
  const aspect = frame.aspect ?? project.aspect
  const ratio = ASPECT_RATIO['16:9']
  const thumb = ratio >= 1 ? { width: 96, height: Math.round(96 / ratio) } : { width: Math.round(96 * ratio), height: 96 }
  return (
    <div className="scene-fade absolute top-[calc(50%-112px)] flex w-[280px] flex-col gap-3.5" style={{ right }}>
      <span className={EYEBROW}>A seguir</span>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0 overflow-clip rounded-xl bg-white opacity-80 shadow-[0_0_0_1px_#FFFFFF1A,0_8px_24px_#00000066]" style={thumb}>
          {url && <img src={url} alt="" className="absolute inset-0 size-full object-cover" />}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[17px] leading-[22px] font-medium text-[#FFFFFFD9]">{frame.title}</span>
          <span className="text-[13px] leading-[18px] text-[#FFFFFF73]">
            Cena {number} · {frame.duration}s · {aspect}
          </span>
        </div>
      </div>
    </div>
  )
}

/** The line under the frame, with who says it as the label. Tablet adds the scene title, since it has no side columns. */
function Caption({ frame, withTitle }: { frame: Frame; withTitle: boolean }) {
  const { speaker, line } = parseDialogue(frame.dialogue)
  return (
    <div className={cx('scene-fade mt-6 flex w-[800px] max-w-[calc(100%-80px)] flex-col items-center gap-1.5 text-center', withTitle ? 'min-h-24' : 'min-h-[52px]')}>
      {withTitle && <h3 className="mb-0.5 font-display text-[32px] leading-9 text-white">{frame.title}</h3>}
      {speaker && <span className="text-[11px] leading-[14px] font-semibold tracking-[0.12em] text-[#FFFFFF73] uppercase">{speaker}</span>}
      {line && <p className="text-[24px] leading-8 font-medium tracking-[-0.01em] text-white">{quoted(line)}</p>}
    </div>
  )
}
