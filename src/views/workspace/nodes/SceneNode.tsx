import { Handle, NodeResizeControl, Position, type Node, type NodeProps } from '@xyflow/react'
import { cx, toastError } from '../../../components/ui'
import { useImageUrl } from '../../../lib/hooks'
import { commitFrame, updateFrame } from '../../../lib/repo'
import { can } from '../../../lib/session'
import { useWD } from '../context'
import type { Frame, FrameContent, Revision } from '../../../lib/types'
import { FORMAT_LABEL, MOVE_TAG, parseDialogue, quoted, SHOT_TAG, type Aspect } from '../scene'
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

const PILL = 'flex h-5 items-center rounded-[10px] bg-surface-2 px-[7px] text-[10px] leading-3 font-semibold text-[#18181B]'

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

/** 16:9 drawing and a separate technical sheet keep long scripts legible. */
export function SceneNode({ data, width: liveWidth }: NodeProps<SceneNodeType>) {
  const editable = can(useWD().role, 'edit')
  const { frame, number, revisions, projectAspect, selected, userId } = data
  // React Flow's width follows the pointer during a resize; the layout's width is the one at rest.
  const width = liveWidth ?? data.width
  const browsingId = useWS((s) => s.browsing[frame.id])
  const browsed = revisions.find((r) => r.id === browsingId)
  const shown: FrameContent = browsed?.snapshot ?? frame
  const aspect = shown.aspect ?? projectAspect
  const height = Math.round(width * 9 / 16)
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
        <span className="shrink-0 text-[13px] leading-4 text-faint">PL {String(number).padStart(3, '0')}</span>
        <span className="flex-1" />
        <span className="shrink-0 text-[12px] leading-4 font-medium text-muted">{shown.duration}s</span>
      </div>

      <div
        className={cx(
          'relative shrink-0 overflow-clip rounded-2xl bg-white',
          selected
            ? 'border-2 border-accent shadow-[0_0_0_4px_#0071E329,0_8px_24px_#0000001A]'
            : 'border border-[#E4E4E7] shadow-[0_1px_2px_#0000000F,0_8px_24px_#00000014]',
        )}
      >
        <div className="relative flex items-center justify-center bg-[#FAFAFA]" style={{ height }}>
          {url ? <img src={url} alt={shown.description || shown.title} draggable={false} className="size-full object-contain grayscale select-none" /> : <span className="text-[12px] text-muted">{shown.imageId ? 'Carregando prévia…' : 'Sem imagem'}</span>}
        </div>


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

        <div className="flex flex-col gap-3 border-t border-line p-3">
          <div role="region" aria-label={`Ficha do plano ${number}`} tabIndex={0} className="nodrag nowheel flex max-h-[180px] flex-col gap-[3px] overflow-y-auto rounded-md break-words outline-none focus-visible:ring-2 focus-visible:ring-accent/30">
            {shown.action && <p className="mb-1 text-[12px] leading-[17px] text-fg"><strong>Ação: </strong>{shown.action}</p>}
            {speaker && <span className="text-[9.5px] leading-3 font-semibold tracking-[0.08em] text-muted uppercase">{speaker}</span>}
            {line && <span className="text-[12px] leading-[17px] italic text-fg">{quoted(line)}</span>}
            {shown.description && <span className="text-[12px] leading-[17px] text-fg-2">{shown.description}</span>}
          </div>
          <div className="flex flex-wrap gap-1">
            <span className={PILL} title={shown.sketch ? 'Desenho esquemático do renderizador local' : 'Imagem original preservada sem corte'}>{shown.sketch ? 'PRÉVIA LOCAL' : 'PRANCHA'} · 16:9</span>
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
                disabled={!!browsed || !editable}
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

      <Handle id="in" type="target" position={Position.Left} isConnectable={false} className={cx(portClass(data.activeIn), !data.hasIn && '!hidden')} style={{ top: 26 + height / 2 }} />
      <Handle id="out" type="source" position={Position.Right} isConnectable={false} className={cx(portClass(data.activeOut), !data.hasOut && '!hidden')} style={{ top: 26 + height / 2 }} />
      {/* Where the briefing's dashed link ends: just above the first scene's label, under the briefing's port when neither has moved. */}
      <Handle id="brief" type="target" position={Position.Top} isConnectable={false} className="!size-px !min-h-0 !min-w-0 !border-0 !bg-transparent" style={{ left: 110, top: -1.5 }} />

      <NodeResizeControl
        position="bottom-left"
        minWidth={280}
        maxWidth={520}
        resizeDirection="horizontal"
        // The arc is part of the card and zooms with it, as in the design.
        autoScale={false}
        className={cx('!size-7 !rounded-none !border-0 !bg-transparent transition-opacity', selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
      >
        <svg width="36" height="40" viewBox="-12 -28 36 40" aria-hidden className="pointer-events-none absolute top-[-14px] left-[2px]">
          <path d="M-6 -16 A 22 22 0 0 0 16 6" fill="none" stroke="#A1A1AA" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      </NodeResizeControl>
    </div>
  )
}
