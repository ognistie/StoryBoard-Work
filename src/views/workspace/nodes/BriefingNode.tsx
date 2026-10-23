import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { useState } from 'react'
import { cx, Spinner, toast, toastError } from '../../../components/ui'
import { applyBriefingChange } from '../../../lib/scenes'
import type { ContextDoc } from '../../../lib/types'

export type BriefingNodeData = {
  projectId: string
  userId: string
  briefing?: ContextDoc
  /** Chips under the text: format, total length, scene count. */
  chips: string[]
  /** Scenes the latest briefing change rewrote. */
  redone: number
}
export type BriefingNodeType = Node<BriefingNodeData, 'briefing'>

const CHIP = 'flex h-[22px] items-center rounded-md bg-[#F4F4F5] px-2 text-[12px] leading-4 font-medium text-[#52525C]'

/** The briefing at the top of the canvas. Saving an edit rewrites only the scenes it affects. */
export function BriefingNode({ data }: NodeProps<BriefingNodeType>) {
  const { briefing, chips, redone } = data
  const [draft, setDraft] = useState<string>()
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (draft === undefined) return
    setBusy(true)
    try {
      const changed = await applyBriefingChange({ projectId: data.projectId, briefing: draft, userId: data.userId })
      setDraft(undefined)
      toast(changed.length ? `Briefing salvo. ${changed.length} ${changed.length === 1 ? 'cena refeita' : 'cenas refeitas'}.` : 'Briefing salvo. Nenhuma cena precisou mudar.', { tone: 'ok' })
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex w-[480px] flex-col gap-2">
      <div className="flex h-[18px] shrink-0 items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="shrink-0">
            <path d="M3 1.5h4l2.5 2.5v6.5H3z" fill="none" stroke="#71717B" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M4.5 6h3M4.5 8h3" fill="none" stroke="#71717B" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span className="text-[13px] leading-4 font-medium text-[#18181B]">Briefing</span>
          {briefing && <span className="text-[13px] leading-4 text-faint">v{briefing.version}</span>}
        </div>
        {redone > 0 && (
          <span className="flex h-5 items-center rounded-md bg-[#0071E31A] px-[7px] text-[11px] leading-[14px] font-semibold text-accent">
            Editado · {redone} {redone === 1 ? 'cena refeita' : 'cenas refeitas'}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3.5 rounded-2xl border border-[#E4E4E7] bg-white px-[18px] py-4 shadow-[0_1px_2px_#0000000A,0_4px_16px_#0000000A]">
        {draft === undefined ? (
          <p className="text-[15px] leading-[22px] whitespace-pre-line text-[#18181B]">{briefing?.text || 'Sem briefing.'}</p>
        ) : (
          <textarea
            autoFocus
            value={draft}
            disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setDraft(undefined)
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void save()
            }}
            rows={5}
            aria-label="Briefing"
            className="nodrag nowheel -mx-1 resize-none rounded-lg bg-[#F4F4F5] px-1 text-[15px] leading-[22px] text-[#18181B] outline-none"
          />
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {chips.map((c) => (
              <span key={c} className={CHIP}>
                {c}
              </span>
            ))}
          </div>
          {draft === undefined ? (
            <button onClick={() => setDraft(briefing?.text ?? '')} className="nodrag text-[13px] leading-4 font-medium text-link hover:underline">
              Editar
            </button>
          ) : (
            <div className="nodrag flex items-center gap-3">
              <button disabled={busy} onClick={() => setDraft(undefined)} className="text-[13px] leading-4 font-medium text-muted hover:text-fg">
                Cancelar
              </button>
              <button disabled={busy} onClick={() => void save()} className={cx('flex items-center gap-1.5 text-[13px] leading-4 font-medium text-link hover:underline')}>
                {busy && <Spinner className="size-3.5 text-link" />}
                {busy ? 'Refazendo cenas…' : 'Salvar'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* The dashed link to the first scene is an edge, so it follows the briefing when it moves. */}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="!size-2.5 !min-h-0 !min-w-0 !rounded-[5px] !border-[1.5px] !border-[#D4D4D8] !bg-white"
        style={{ left: 110 }}
      />
    </div>
  )
}
