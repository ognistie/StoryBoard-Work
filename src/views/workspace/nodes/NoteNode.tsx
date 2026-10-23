import type { Node, NodeProps } from '@xyflow/react'
import { useEffect, useRef, useState } from 'react'
import { toastError } from '../../../components/ui'
import { timeAgo } from '../../../lib/hooks'
import { deleteNote, updateNote } from '../../../lib/repo'
import { userById } from '../../../lib/session'
import type { Note } from '../../../lib/types'

export type NoteNodeData = { note: Note; userId: string }
export type NoteNodeType = Node<NoteNodeData, 'note'>

// Paper colours: a yellow pad lit from the top-right corner.
const PAPER =
  'radial-gradient(ellipse 80% 50% at 100% 100% in oklab, #FFFFFF80 0%, #FFFFFF00 60%), linear-gradient(in oklab 180deg, #F7DE6E 0%, #FBE98C 15%, #FEF0A6 72%, #FFF5C2 100%)'

/** A sticky note. Drag it anywhere; double-click to write. A note left empty is removed. */
export function NoteNode({ data }: NodeProps<NoteNodeType>) {
  const { note, userId } = data
  // Only a note that was just added opens for writing; an old empty one waits for a click.
  const [draft, setDraft] = useState<string | undefined>(!note.text && Date.now() - note.createdAt < 5000 ? '' : undefined)
  const author = note.authorId === userId ? 'Você' : userById(note.authorId).name.split(' ')[0]
  const field = useRef<HTMLTextAreaElement>(null)
  const editing = draft !== undefined

  // React Flow keeps a new node hidden until it has measured it, and a hidden field cannot take focus.
  // So focus is retried for a few frames instead of relying on autoFocus.
  useEffect(() => {
    if (!editing) return
    let frame = 0
    let tries = 0
    const tryFocus = () => {
      field.current?.focus()
      if (document.activeElement !== field.current && ++tries < 20) frame = requestAnimationFrame(tryFocus)
    }
    frame = requestAnimationFrame(tryFocus)
    return () => cancelAnimationFrame(frame)
  }, [editing])

  const save = async () => {
    const text = (draft ?? '').trim()
    setDraft(undefined)
    try {
      if (!text) await deleteNote(note.id, userId)
      else if (text !== note.text) await updateNote(note.id, userId, { text })
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div
      className="relative flex size-[168px] flex-col overflow-clip rounded-[2px] shadow-[0_0_0_0.5px_#785A0029,0_1px_1px_#0000000D,0_10px_10px_-8px_#46320038]"
      style={{ backgroundImage: PAPER, rotate: `${note.rotation}deg`, transformOrigin: '0 0' }}
    >
      <div className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-multiply" style={{ backgroundImage: 'url(/note-grain.webp)' }} />
      <div className="relative flex h-full flex-col justify-between pt-4 pr-3.5 pb-[11px] pl-[15px]">
        {draft === undefined ? (
          <p onDoubleClick={() => setDraft(note.text)} title="Arraste para mover. Clique duas vezes para escrever." className="flex-1 cursor-grab font-hand text-[22px] leading-[23px] font-medium text-[#3B3626] active:cursor-grabbing">
            {note.text}
          </p>
        ) : (
          <textarea
            ref={field}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void save()}
            onKeyDown={(e) => e.key === 'Escape' && (e.target as HTMLTextAreaElement).blur()}
            aria-label="Nota"
            placeholder="Escreva…"
            className="nodrag nowheel h-full resize-none bg-transparent font-hand text-[22px] leading-[23px] font-medium text-[#3B3626] outline-none placeholder:text-[#3B3626]/40"
          />
        )}
        <span className="text-[11px] leading-[14px] font-medium text-[#5A460A]/55">
          {author} · {timeAgo(note.createdAt)}
        </span>
      </div>
    </div>
  )
}
