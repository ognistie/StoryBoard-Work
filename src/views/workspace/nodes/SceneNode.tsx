import { Handle, NodeResizeControl, Position, type Node, type NodeProps } from '@xyflow/react'
import { cx, toastError } from '../../../components/ui'
import { useImageUrl } from '../../../lib/hooks'
import { commitFrame, updateFrame } from '../../../lib/repo'
import type { Frame, FrameContent, Revision } from '../../../lib/types'
import { ASPECT_RATIO, FORMAT_LABEL, MOVE_TAG, parseDialogue, quoted, SHOT_TAG, type Aspect } from '../scene'
import { useWS } from '../store'

export type SceneNodeData = {
  frame: Frame
  number: number
  /** The scene's versions, oldest first. */
  revisions: Revision[]
  projectAspect: Aspect
  width: number
  selected: boolean
  /** Whether the edge on each side touches the selected scene. */
  activeIn: boolean
  activeOut: boolean
  hasIn: boolean
  hasOut: boolean
  userId: string
}
export type SceneNodeType = Node<SceneNodeData, 'scene'>

// Shade under the text, from the Paper design. Wider formats need it to reach higher.
const SHADE: Record<Aspect, string> = {
  '9:16': 'linear-gradient(in oklab 0deg, #000000D1 0%, #0000009E 30%, #00000000 52%)',
  '1:1': 'linear-gradient(in oklab 0deg, #000000D1 0%, #0000009E 42%, #00000000 66%)',
  '16:9': 'linear-gradient(in oklab 0deg, #000000D1 0%, #0000009E 55%, #00000000 85%)',
  '2.39:1': 'linear-gradient(in oklab 0deg, #000000D1 0%, #0000009E 65%, #00000000 95%)',
}

/** Port centre, from the top of the node: the 26px label row plus 129px into the card. */
const PORT_TOP = 155

const PILL = 'flex h-5 items-center rounded-[10px] bg-white/75 px-[7px] text-[10px] leading-3 font-semibold text-[#18181B] backdrop-blur-md'

function Chevron({ dir, color = '#18181B' }: { dir: 'left' | 'right' | 'down'; color?: string }) {
  const d = dir === 'left' ? 'M6.5 2L3.5 5l3 3' : dir === 'right' ? 'M3.5 2l3 3-3 3' : 'M2.5 3.8L5 6.3l2.5-2.5'
  return (
    <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden className="shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth={dir === 'down' ? 1.6 : 1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function portClass(active: boolean) {
  return cx('!size-2.5 !min-h-0 !min-w-0 !rounded-[5px] !border-[1.5px] !bg-white', active ? '!border-accent' : '!border-[#D4D4D8]')
}

/** A scene on the canvas: the drawing fills the card, the text sits on a dark shade at the bottom. */
export function SceneNode({ data }: NodeProps<SceneNodeType>) {
  const { frame, number, revisions, projectAspect, width, selected, userId } = data
  const browsingId = useWS((s) => s.browsing[frame.id])
  const browsed = revisions.find((r) => r.id === browsingId)
  const shown: FrameContent = browsed?.snapshot ?? frame
  const aspect = shown.aspect ?? projectAspect
  const height = Math.round(width / ASPECT_RATIO[aspect])
  const url = useImageUrl(shown.imageId)
  const { speaker, line } = parseDialogue(shown.dialogue)

  const total = Math.max(revisions.length, 1)
  const headIndex = revisions.findIndex((r) => r.id === frame.headRevisionId)
  const index = browsed ? revisions.indexOf(browsed) : headIndex >= 0 ? headIndex : total - 1
  const browse = (step: number) => {
    const next = revisions[index + step]
    if (!next) return
    const browsing = { ...useWS.getState().browsing }
    if (next.id === frame.headRevisionId) delete browsing[frame.id]
    else browsing[frame.id] = next.id
    useWS.getState().set({ browsing })
  }

  const setAspect = async (value: Aspect) => {
    try {
      await updateFrame(frame.id, userId, { aspect: value === projectAspect ? undefined : value })
      await commitFrame(frame.id, userId, `Formato ${value}`, 'manual')
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div className="group relative flex flex-col gap-2" style={{ width }}>
      <div className="flex h-[18px] shrink-0 items-center gap-1.5 px-0.5">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="shrink-0">
          <rect x="1" y="2" width="10" height="8" rx="1.5" fill="none" stroke={selected ? '#0071E3' : '#71717B'} strokeWidth="1.2" />
          <path d="M1 4.5h10" fill="none" stroke={selected ? '#0071E3' : '#71717B'} strokeWidth="1.2" />
        </svg>
        <span className={cx('truncate text-[13px] leading-4 font-medium', selected ? 'text-accent' : 'text-[#18181B]')}>{shown.title}</span>
        <span className="shrink-0 text-[13px] leading-4 text-faint">Cena {number}</span>
        <span className="flex-1" />
        <span className="shrink-0 text-[12px] leading-4 font-medium text-muted">{shown.duration}s</span>
      </div>

      <div
        className={cx(
          'relative shrink-0 overflow-clip rounded-2xl bg-[#E4E4E7]',
          selected
            ? 'border-2 border-accent shadow-[0_0_0_4px_#0071E329,0_8px_24px_#0000001A]'
            : 'border border-[#E4E4E7] shadow-[0_1px_2px_#0000000F,0_8px_24px_#00000014]',
        )}
        style={{ height }}
      >
        {url && <img src={url} alt="" draggable={false} className="absolute inset-0 size-full object-cover select-none" />}
        <div className="absolute inset-0" style={{ backgroundImage: SHADE[aspect] }} />

        <div className="absolute top-2.5 right-2.5 left-2.5 flex justify-end">
          <div className="nodrag flex h-6 items-center gap-1.5 rounded-xl bg-white/75 px-2 backdrop-blur-md">
            <button aria-label="Versão anterior" disabled={index <= 0} onClick={() => browse(-1)} className="flex size-3 items-center justify-center disabled:cursor-default">
              <Chevron dir="left" />
            </button>
            <span className={cx('text-[11px] leading-[14px] font-semibold tabular-nums', total > 1 ? 'text-accent' : 'text-[#18181B]')}>
              {index + 1}/{total}
            </span>
            <button aria-label="Próxima versão" disabled={index >= total - 1} onClick={() => browse(1)} className="flex size-3 items-center justify-center disabled:cursor-default">
              <Chevron dir="right" />
            </button>
          </div>
        </div>

        <div className="absolute right-3 bottom-3 left-3 flex flex-col gap-2.5">
          <div className="flex flex-col gap-[3px]">
            {speaker && <span className="text-[9.5px] leading-3 font-semibold tracking-[0.08em] text-white/70 uppercase">{speaker}</span>}
            {line && <span className="text-[14px] leading-[18px] font-semibold text-white">{quoted(line)}</span>}
            {shown.description && <span className="line-clamp-3 text-[11.5px] leading-[15px] text-white/82">{shown.description}</span>}
          </div>
          <div className="flex flex-wrap gap-1">
            <span className={PILL}>{SHOT_TAG[shown.shot]}</span>
            <span className={cx(PILL, 'gap-1')}>
              <span className="size-[5px] shrink-0 rounded-[3px] bg-[#E5484D]" />
              {MOVE_TAG[shown.movement]}
            </span>
            <label
              className={cx(
                PILL,
                'nodrag relative cursor-pointer gap-[3px]',
                shown.aspect && shown.aspect !== projectAspect && '!bg-white/92 !font-bold !text-accent',
              )}
            >
              {aspect}
              {shown.aspect && shown.aspect !== projectAspect && <Chevron dir="down" color="#0071E3" />}
              <select
                aria-label="Formato da cena"
                value={aspect}
                disabled={!!browsed}
                onChange={(e) => void setAspect(e.target.value as Aspect)}
                className="absolute inset-0 cursor-pointer appearance-none opacity-0"
              >
                {(Object.keys(FORMAT_LABEL) as Aspect[]).map((a) => (
                  <option key={a} value={a}>
                    {FORMAT_LABEL[a]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <Handle id="in" type="target" position={Position.Left} isConnectable={false} className={cx(portClass(data.activeIn), !data.hasIn && '!hidden')} style={{ top: PORT_TOP }} />
      <Handle id="out" type="source" position={Position.Right} isConnectable={false} className={cx(portClass(data.activeOut), !data.hasOut && '!hidden')} style={{ top: PORT_TOP }} />
      {/* Where the briefing's dashed link lands on the first scene; under the briefing's own port when neither has moved. */}
      <Handle id="brief" type="target" position={Position.Top} isConnectable={false} className="!size-px !min-h-0 !min-w-0 !border-0 !bg-transparent" style={{ left: 110, top: 5 }} />

      <NodeResizeControl
        position="bottom-left"
        minWidth={140}
        maxWidth={520}
        resizeDirection="horizontal"
        className={cx('!size-7 !rounded-none !border-0 !bg-transparent transition-opacity', selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
      >
        <svg width="36" height="40" viewBox="-12 -28 36 40" aria-hidden className="pointer-events-none absolute top-[-14px] left-[2px]">
          <path d="M-6 -16 A 22 22 0 0 0 16 6" fill="none" stroke="#A1A1AA" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      </NodeResizeControl>
    </div>
  )
}
