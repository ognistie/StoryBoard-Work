import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, FilePlus2, Lock, Upload } from 'lucide-react'
import { useState } from 'react'
import { Button, cx, Empty, toast, toastError } from '../../components/ui'
import { db } from '../../lib/db'
import { ACCEPT_DOCS, extractText } from '../../lib/fileText'
import { timeAgo } from '../../lib/hooks'
import { saveDoc } from '../../lib/repo'
import { can } from '../../lib/session'
import type { DocKind } from '../../lib/types'
import { pickFile } from './actions'
import { useWD } from './context'
import { DOC_KIND_LABEL, DocEditor } from './DocEditor'

function guessKind(name: string, text: string): DocKind {
  const n = `${name} ${text.slice(0, 400)}`.toLowerCase()
  if (/\b(int|ext)\./.test(n) || /roteiro|script/.test(n)) return 'script'
  if (/brief/.test(n)) return 'brief'
  if (/personage|bíblia|biblia/.test(n)) return 'bible'
  if (/arte|moodboard|paleta/.test(n)) return 'art'
  if (/continuidade|técnic|tecnic/.test(n)) return 'tech'
  if (/tratamento/.test(n)) return 'treatment'
  return 'other'
}

export function ContextView() {
  const { project, role, userId } = useWD()
  const docs = useLiveQuery(() => db.docs.where('projectId').equals(project.id).toArray(), [project.id]) ?? []
  const readable = can(role, 'docs') ? docs : docs.filter((d) => !d.confidential)
  const [selected, setSelected] = useState<string>()
  const doc = readable.find((d) => d.id === selected) ?? readable[0]
  const editable = can(role, 'edit')

  const upload = async () => {
    const f = await pickFile(ACCEPT_DOCS)
    if (!f) return
    try {
      const text = await extractText(f)
      const id = await saveDoc(project.id, userId, { title: f.name.replace(/\.[^.]+$/, ''), kind: guessKind(f.name, text), text, confidential: false, fileName: f.name })
      setSelected(id)
      toast(`“${f.name}” importado`, { tone: 'ok' })
    } catch (e) {
      toastError(e)
    }
  }
  const blank = async () => {
    try {
      setSelected(await saveDoc(project.id, userId, { title: 'Novo documento', kind: 'other', text: '', confidential: false }))
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div className="flex min-w-0 flex-1">
      <aside className="flex w-72 shrink-0 flex-col border-r border-line bg-surface">
        <div className="space-y-2 border-b border-line p-3">
          <h2 className="text-[13px] font-semibold">Contexto do projeto</h2>
          <p className="text-[11.5px] leading-snug text-muted">Roteiro, briefing, bíblia e regras: a fonte de verdade criativa que a IA consulta a cada alteração.</p>
          {editable && (
            <div className="flex gap-1.5">
              <Button size="sm" className="flex-1" icon={<Upload className="size-3.5" />} onClick={upload}>
                Importar
              </Button>
              <Button size="sm" icon={<FilePlus2 className="size-3.5" />} onClick={blank}>
                Novo
              </Button>
            </div>
          )}
        </div>
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
          {readable.map((d) => (
            <li key={d.id}>
              <button onClick={() => setSelected(d.id)} className={cx('w-full rounded-lg px-2.5 py-2 text-left transition-colors', doc?.id === d.id ? 'bg-surface-2' : 'hover:bg-surface-2')}>
                <span className="flex items-center gap-1.5 text-[13px] font-medium">
                  {d.confidential && <Lock className="size-3 text-muted" />}
                  <span className="truncate">{d.title}</span>
                </span>
                <span className="block text-[11.5px] text-muted">
                  {DOC_KIND_LABEL[d.kind]} · v{d.version} · {timeAgo(d.updatedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {docs.length > readable.length && (
          <p className="flex items-center gap-1.5 border-t border-line p-3 text-[11.5px] text-muted">
            <Lock className="size-3" />
            {docs.length - readable.length} documento(s) confidencial(is) restrito(s) à equipe.
          </p>
        )}
      </aside>
      {doc ? (
        <DocEditor key={doc.id} doc={doc} mono={doc.kind === 'script'} onDeleted={() => setSelected(undefined)} />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <Empty icon={<BookOpen />} title="Nenhum documento">
            Importe PDF, DOCX, TXT ou Markdown.
          </Empty>
        </div>
      )}
    </div>
  )
}
