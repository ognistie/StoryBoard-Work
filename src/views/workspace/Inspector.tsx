import { useState } from 'react'
import { cx, Select, Spinner, toast, toastError } from '../../components/ui'
import { timeAgo } from '../../lib/hooks'
import { commitFrame, restoreRevision, updateFrame } from '../../lib/repo'
import { userById } from '../../lib/session'
import { CAMERA_MOVES, SHOT_TYPES, type Frame, type FrameContent, type Revision } from '../../lib/types'
import { MOVE_LABEL, SHOT_LABEL } from '../../lib/context'
import { useWD } from './context'
import { changeSummary, FORMAT_LABEL, parseDialogue, quoted, type Aspect } from './scene'
import { useWS, type InspectorTab } from './store'

const BADGE = 'flex h-5 items-center rounded-[10px] px-2 text-[11px] leading-[14px] font-semibold'

function Tabs({ value, onChange, className }: { value: InspectorTab; onChange: (t: InspectorTab) => void; className?: string }) {
  const tab = (id: InspectorTab, label: string) => (
    <button
      role="tab"
      aria-selected={value === id}
      onClick={() => onChange(id)}
      className={cx(
        'flex h-[30px] flex-1 items-center justify-center rounded-full text-[13px] leading-4 transition-colors',
        value === id ? 'bg-white font-semibold text-black shadow-[0_1px_2px_#0000001A]' : 'font-medium text-[#3A3A3C] hover:text-black',
      )}
    >
      {label}
    </button>
  )
  return (
    <div role="tablist" className={cx('flex rounded-full bg-[#F4F4F5] p-[3px]', className)}>
      {tab('versions', 'Versões')}
      {tab('sheet', 'Ficha')}
    </div>
  )
}

/** The first text field that differs between two versions, labelled the way the scene card labels it. */
function textChange(rev: Revision, parent?: Revision) {
  if (!parent) return undefined
  const a = parent.snapshot
  const b = rev.snapshot
  if (a.dialogue !== b.dialogue) {
    const before = parseDialogue(a.dialogue)
    const after = parseDialogue(b.dialogue)
    const speaker = after.speaker ?? before.speaker ?? 'Diálogo'
    return { label: speaker.charAt(0) + speaker.slice(1).toLowerCase(), before: quoted(before.line), after: quoted(after.line) }
  }
  if (a.description !== b.description) return { label: 'Descrição', before: a.description, after: b.description }
  if (a.title !== b.title) return { label: 'Título', before: a.title, after: b.title }
  return undefined
}

function VersionRow({ rev, parent, current, userId }: { rev: Revision; parent?: Revision; current: boolean; userId: string }) {
  const [busy, setBusy] = useState(false)
  const browsing = useWS((s) => s.browsing[rev.frameId])
  const author = rev.authorId === userId ? 'Você' : userById(rev.authorId).name.split(' ')[0]
  const change = rev.kind === 'briefing' ? textChange(rev, parent) : undefined
  const original = rev.kind === 'initial'
  // Versions made by a person carry an author line; the briefing ones explain themselves.
  const withAuthor = !original && rev.kind !== 'briefing'
  const previewing = browsing === rev.id

  const preview = () => {
    const next = { ...useWS.getState().browsing }
    if (current || previewing) delete next[rev.frameId]
    else next[rev.frameId] = rev.id
    useWS.getState().set({ browsing: next })
  }

  const restore = async () => {
    setBusy(true)
    try {
      await restoreRevision(rev.id, userId)
      const next = { ...useWS.getState().browsing }
      delete next[rev.frameId]
      useWS.getState().set({ browsing: next })
      toast(`Versão ${rev.number} restaurada`, { tone: 'ok' })
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      onClick={preview}
      className={cx(
        'group flex cursor-pointer flex-col rounded-[14px] p-3.5 transition-colors',
        rev.kind === 'briefing' ? 'gap-2' : 'gap-1.5',
        current ? 'bg-[#F4F4F5]' : previewing ? 'bg-[#0071E30D]' : 'hover:bg-[#FAFAFA]',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[15px] leading-[18px] font-medium text-black">v{rev.number}</span>
          {current && <span className={cx(BADGE, 'bg-accent text-white')}>Atual</span>}
          {rev.kind === 'briefing' && <span className={cx(BADGE, 'bg-[#0071E31A] text-accent')}>Briefing mudou</span>}
          {original && <span className={cx(BADGE, 'bg-[#F4F4F5] text-muted')}>Briefing original</span>}
          {rev.kind === 'restore' && <span className={cx(BADGE, 'bg-[#F4F4F5] text-muted')}>Restaurada</span>}
        </div>
        {withAuthor || current ? (
          <span className="text-[12px] leading-4 text-faint">{timeAgo(rev.createdAt)}</span>
        ) : (
          // Restaurar takes the timestamp's place on hover, or while the row is previewed (how a touch screen gets to it).
          <span className="relative flex h-4 items-center">
            <span className={cx('text-[12px] leading-4 text-faint transition-opacity group-hover:opacity-0', previewing && 'opacity-0')}>{timeAgo(rev.createdAt)}</span>
            <button
              disabled={busy}
              onClick={(e) => (e.stopPropagation(), void restore())}
              className={cx(
                'absolute right-0 flex h-7 items-center rounded-[14px] bg-[#0071E31A] px-3 text-[13px] leading-4 font-semibold whitespace-nowrap text-accent transition-opacity',
                previewing ? 'opacity-100' : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 focus:pointer-events-auto focus:opacity-100',
              )}
            >
              Restaurar
            </button>
          </span>
        )}
      </div>
      <p className={cx('text-[14px] leading-5', original ? 'text-muted' : 'text-[#1D1D1F]')}>{rev.kind === 'ai-edit' ? quoted(rev.message) : rev.message}</p>
      {change && (
        <div className={cx('flex flex-col gap-[3px] rounded-[14px] px-3 py-2.5', current ? 'bg-white' : 'bg-[#F4F4F5]')}>
          <span className="text-[11px] leading-[14px] font-semibold text-[#8E8E93]">{change.label}</span>
          {change.before && <span className="text-[13px] leading-[18px] text-faint line-through decoration-1">{change.before}</span>}
          <span className="text-[13px] leading-[18px] font-medium text-[#1D1D1F]">{change.after}</span>
        </div>
      )}
      {withAuthor && (
        <div className={cx('flex items-center justify-between', !current && 'min-h-7 pt-0.5')}>
          <span className="text-[12px] leading-4 text-muted">
            {author} · {changeSummary(rev, parent)}
          </span>
          {!current && (
            <button
              disabled={busy}
              onClick={(e) => (e.stopPropagation(), void restore())}
              className="flex h-7 items-center gap-1.5 rounded-[14px] bg-[#0071E31A] px-3 text-[13px] leading-4 font-semibold text-accent transition-colors hover:bg-[#0071E326]"
            >
              {busy && <Spinner className="size-3.5 text-accent" />}
              Restaurar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Versions({ frame, revisions }: { frame: Frame; revisions: Revision[] }) {
  const { userId } = useWD()
  const newestFirst = [...revisions].reverse()
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pt-1 pb-3">
      {newestFirst.map((rev) => (
        <VersionRow key={rev.id} rev={rev} parent={revisions.find((r) => r.id === rev.parentId)} current={rev.id === frame.headRevisionId} userId={userId} />
      ))}
    </div>
  )
}

const FIELD_LABEL = 'text-[12px] leading-4 font-medium text-muted'
// 16px on a phone: iOS zooms into any field with smaller text.
const FIELD = 'w-full rounded-[10px] border border-[#E4E4E7] bg-white px-3 py-2 text-[14px] leading-5 text-[#18181B] outline-none transition-colors focus:border-accent max-md:text-[16px] max-md:leading-[22px]'
// The same box for the app's own dropdowns, which draw their label and chevron.
const SELECT = 'flex h-[38px] w-full justify-between rounded-[10px] border border-[#E4E4E7] bg-white px-3 hover:border-[#D4D4D8] aria-expanded:border-accent max-md:text-[16px]'

function Sheet({ frame }: { frame: Frame }) {
  const { project, userId } = useWD()
  const [saving, setSaving] = useState(false)
  const set = (patch: Partial<FrameContent>) => void updateFrame(frame.id, userId, patch).catch(toastError)

  const save = async () => {
    setSaving(true)
    try {
      await commitFrame(frame.id, userId, 'Edição na ficha', 'manual')
      toast('Nova versão salva', { tone: 'ok' })
    } catch (e) {
      toastError(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-[22px] pt-1 pb-4">
        <label className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>Título</span>
          <input className={FIELD} value={frame.title} onChange={(e) => set({ title: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>Descrição</span>
          <textarea rows={3} className={cx(FIELD, 'resize-none')} value={frame.description} onChange={(e) => set({ description: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>Diálogo</span>
          <textarea rows={2} className={cx(FIELD, 'resize-none')} value={frame.dialogue} placeholder="QUEM FALA: a fala" onChange={(e) => set({ dialogue: e.target.value })} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL}>Duração (s)</span>
            <input type="number" min={1} max={60} className={FIELD} value={frame.duration} onChange={(e) => set({ duration: Math.max(1, Number(e.target.value) || 1) })} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL}>Formato</span>
            <Select
              label="Formato"
              className={SELECT}
              value={frame.aspect ?? project.aspect}
              options={(Object.keys(FORMAT_LABEL) as Aspect[]).map((a) => ({ value: a, label: FORMAT_LABEL[a] }))}
              onChange={(a) => set({ aspect: a === project.aspect ? undefined : a })}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL}>Plano</span>
            <Select label="Plano" className={SELECT} value={frame.shot} options={SHOT_TYPES.map((s) => ({ value: s, label: SHOT_LABEL[s] }))} onChange={(shot) => set({ shot })} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL}>Câmera</span>
            <Select label="Câmera" className={SELECT} value={frame.movement} options={CAMERA_MOVES.map((m) => ({ value: m, label: MOVE_LABEL[m] }))} onChange={(movement) => set({ movement })} align="right" />
          </label>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[#E4E4E7] px-[22px] py-3">
        <span className="text-[12px] leading-4 text-muted">{frame.dirty ? 'Alterações ainda sem versão' : 'Tudo salvo'}</span>
        <button
          disabled={!frame.dirty || saving}
          onClick={() => void save()}
          className="flex h-8 items-center gap-1.5 rounded-full bg-accent px-4 text-[13px] leading-4 font-medium text-white transition-opacity disabled:opacity-40"
        >
          {saving && <Spinner className="size-3.5 text-white" />}
          Salvar versão
        </button>
      </div>
    </div>
  )
}

function useSelectedScene() {
  const { ordered, revisions } = useWD()
  const { selectedId, inspectorTab, set } = useWS()
  const index = ordered.findIndex((f) => f.id === selectedId)
  const frame = ordered[index]
  return { index, frame, revisions: frame ? revisions.filter((r) => r.frameId === frame.id) : [], tab: inspectorTab, setTab: (t: InspectorTab) => set({ inspectorTab: t }) }
}

function SceneTitle({ index, frame }: { index: number; frame: Frame }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[13px] leading-4 font-medium text-muted">Cena {index + 1}</span>
      <h2 className="truncate text-[24px] leading-[30px] font-medium tracking-[-0.025em] text-black">{frame.title}</h2>
    </div>
  )
}

function NoScene() {
  const { ordered } = useWD()
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-[#F4F4F5]">
        <svg width="16" height="16" viewBox="0 0 12 12" aria-hidden>
          <rect x="1" y="2" width="10" height="8" rx="1.5" fill="none" stroke="#71717B" strokeWidth="1" />
          <path d="M1 4.5h10" fill="none" stroke="#71717B" strokeWidth="1" />
        </svg>
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-[15px] leading-5 font-medium text-[#18181B]">{ordered.length ? 'Nenhuma cena selecionada' : 'Este projeto ainda não tem cenas'}</span>
        {ordered.length > 0 && <span className="max-w-60 text-[13px] leading-[18px] text-balance text-muted">Clique numa cena no canvas para ver as versões e a ficha.</span>}
      </div>
    </div>
  )
}

/** The panel for the selected scene on desktop: its versions, or its sheet of fields. */
export function Inspector() {
  const { index, frame, revisions, tab, setTab } = useSelectedScene()
  return (
    <aside className="flex h-full w-full flex-col overflow-clip rounded-2xl border border-[#E4E4E7] bg-white shadow-[0_1px_2px_#0000000A,0_8px_24px_#0000000F]">
      {frame ? (
        <>
          <div className="flex flex-col gap-3.5 px-[22px] pt-[22px] pb-4">
            <SceneTitle index={index} frame={frame} />
            <Tabs value={tab} onChange={setTab} />
          </div>
          {tab === 'versions' ? <Versions frame={frame} revisions={revisions} /> : <Sheet frame={frame} />}
        </>
      ) : (
        <NoScene />
      )}
    </aside>
  )
}

/**
 * The same content inside a bottom sheet. On tablet the title and the tabs share a row;
 * on a phone they stack, because the row would leave the title no room.
 */
export function InspectorSheetContent({ layout }: { layout: 'row' | 'stack' }) {
  const { index, frame, revisions, tab, setTab } = useSelectedScene()
  if (!frame) return <NoScene />
  return (
    <>
      {layout === 'row' ? (
        <div className="flex items-center justify-between gap-6 px-[22px] pt-1 pb-2.5">
          <SceneTitle index={index} frame={frame} />
          <Tabs value={tab} onChange={setTab} className="w-[240px] shrink-0" />
        </div>
      ) : (
        <div className="flex flex-col gap-3.5 px-[22px] pt-1 pb-4">
          <SceneTitle index={index} frame={frame} />
          <Tabs value={tab} onChange={setTab} />
        </div>
      )}
      {tab === 'versions' ? <Versions frame={frame} revisions={revisions} /> : <Sheet frame={frame} />}
    </>
  )
}
