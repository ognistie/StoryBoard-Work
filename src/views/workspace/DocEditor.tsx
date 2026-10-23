import { useLiveQuery } from 'dexie-react-hooks'
import { Lock, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge, Button, Field, Input, Select, Textarea, Toggle, toast, toastError } from '../../components/ui'
import { chunkText } from '../../lib/context'
import { db } from '../../lib/db'
import { formatDate } from '../../lib/hooks'
import { deleteDoc, saveDoc } from '../../lib/repo'
import { can, userById } from '../../lib/session'
import type { ContextDoc, DocKind } from '../../lib/types'
import { useWD } from './context'

export const DOC_KIND_LABEL: Record<DocKind, string> = {
  script: 'Roteiro / decupagem',
  brief: 'Briefing',
  treatment: 'Tratamento',
  bible: 'Bíblia de personagens',
  art: 'Direção de arte',
  tech: 'Técnico / continuidade',
  other: 'Outro',
}

export function DocEditor({ doc, onDeleted, mono }: { doc: ContextDoc; onDeleted?: () => void; mono?: boolean }) {
  const { role, userId, project } = useWD()
  const editable = can(role, 'edit')
  const [title, setTitle] = useState(doc.title)
  const [text, setText] = useState(doc.text)
  const [kind, setKind] = useState<DocKind>(doc.kind)
  const [confidential, setConfidential] = useState(doc.confidential)
  const [busy, setBusy] = useState(false)
  const versions = useLiveQuery(() => db.docVersions.where('docId').equals(doc.id).reverse().sortBy('version'), [doc.id, doc.version]) ?? []
  useEffect(() => {
    setTitle(doc.title)
    setText(doc.text)
    setKind(doc.kind)
    setConfidential(doc.confidential)
  }, [doc.id, doc.version]) // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = title !== doc.title || text !== doc.text || kind !== doc.kind || confidential !== doc.confidential
  const chunks = chunkText(text, kind)

  const save = async () => {
    setBusy(true)
    try {
      const before = await db.frames.where('projectId').equals(project.id).filter((f) => !!f.contextOutdated).count()
      await saveDoc(project.id, userId, { id: doc.id, title, kind, text, confidential })
      const after = await db.frames.where('projectId').equals(project.id).filter((f) => !!f.contextOutdated).count()
      toast(after > before ? `Documento salvo. ${after - before} quadro(s) podem ter sido afetados pela mudança no roteiro.` : 'Documento salvo', { tone: 'ok', duration: 6000 })
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-6 xl:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Título" className="min-w-60 flex-1">
            <Input value={title} disabled={!editable} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Tipo" className="w-52">
            <Select value={kind} disabled={!editable} onChange={(e) => setKind(e.target.value as DocKind)}>
              {Object.entries(DOC_KIND_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          {editable && (
            <Button variant="primary" icon={<Save className="size-4" />} disabled={!dirty} loading={busy} onClick={save}>
              Salvar v{doc.version + (text !== doc.text ? 1 : 0)}
            </Button>
          )}
        </div>
        <Textarea
          value={text}
          disabled={!editable}
          onChange={(e) => setText(e.target.value)}
          className={`min-h-[60vh] ${mono ? 'font-mono text-[12.5px]' : 'text-[13.5px]'}`}
          aria-label="Conteúdo do documento"
        />
      </div>
      <aside className="space-y-5">
        {editable && <Toggle checked={confidential} onChange={setConfidential} label="Confidencial" description="Visível só para a equipe interna; nunca entra em gerações pedidas por clientes." />}
        <div>
          <h3 className="mb-2 text-[12.5px] font-semibold">Como a IA lê este documento</h3>
          <p className="mb-2 text-[11.5px] text-muted">{chunks.length} trechos rastreáveis. Conteúdo importado é tratado como dado, nunca como instrução.</p>
          <ul className="space-y-1">
            {chunks.slice(0, 12).map((c) => (
              <li key={c.id} className="truncate rounded-md bg-surface-2 px-2 py-1 text-[11.5px] text-fg-2" title={c.text.slice(0, 300)}>
                {c.section}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-[12.5px] font-semibold">Versões</h3>
          <ul className="space-y-1.5">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between text-[12px]">
                <span>
                  <Badge tone={v.version === doc.version ? 'accent' : 'neutral'}>v{v.version}</Badge> {userById(v.authorId).name.split(' ')[0]}
                </span>
                <span className="text-muted">{formatDate(v.createdAt)}</span>
              </li>
            ))}
            {!versions.length && <li className="text-[12px] text-muted">v{doc.version} · importado</li>}
          </ul>
        </div>
        {doc.fileName && <p className="text-[11.5px] text-muted">Arquivo de origem: {doc.fileName}</p>}
        {doc.confidential && (
          <p className="flex items-center gap-1 text-[11.5px] text-muted">
            <Lock className="size-3" /> Documento confidencial
          </p>
        )}
        {editable && onDeleted && (
          <Button
            variant="ghost"
            size="sm"
            className="text-danger"
            icon={<Trash2 className="size-3.5" />}
            onClick={async () => {
              if (!confirm(`Remover “${doc.title}”?`)) return
              await deleteDoc(doc.id, userId).catch(toastError)
              onDeleted()
            }}
          >
            Remover documento
          </Button>
        )}
      </aside>
    </div>
  )
}
