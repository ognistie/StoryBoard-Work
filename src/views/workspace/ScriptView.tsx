import { useLiveQuery } from 'dexie-react-hooks'
import { FileText, Sparkles, Upload } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Empty, toast, toastError } from '../../components/ui'
import { getProvider } from '../../lib/ai'
import { parseScript, STYLE_PROMPT } from '../../lib/context'
import { db } from '../../lib/db'
import { ACCEPT_DOCS, extractText } from '../../lib/fileText'
import { startGenerateBatch } from '../../lib/jobs'
import { createFrame, createScene, saveDoc } from '../../lib/repo'
import { can } from '../../lib/session'
import { pickFile } from './actions'
import { useWD } from './context'
import { DocEditor } from './DocEditor'
import { useWS } from './store'

export function ScriptView() {
  const { project, scenes, frames, role, userId } = useWD()
  const script = useLiveQuery(() => db.docs.where('projectId').equals(project.id).filter((d) => d.kind === 'script').first(), [project.id], null)
  const [busy, setBusy] = useState(false)
  const editable = can(role, 'edit')
  const parsed = script ? parseScript(script.text) : []
  const missing = parsed.filter((p) => !scenes.some((s) => s.number === p.number))
  const outdated = frames.filter((f) => f.contextOutdated).length

  const importFile = async () => {
    const f = await pickFile(ACCEPT_DOCS)
    if (!f) return
    try {
      const text = await extractText(f)
      await saveDoc(project.id, userId, { id: script?.id, title: script?.title ?? 'Roteiro', kind: 'script', text, confidential: false, fileName: f.name })
      toast('Roteiro importado', { tone: 'ok' })
    } catch (e) {
      toastError(e)
    }
  }

  const createMissing = async () => {
    setBusy(true)
    try {
      const provider = getProvider()
      const plan = await provider.planShots(missing, STYLE_PROMPT[project.style], new AbortController().signal)
      const ids: string[] = []
      for (const s of missing) {
        const sceneId = await createScene(project.id, userId, {
          number: s.number,
          heading: s.heading,
          summary: s.summary,
          timeOfDay: s.timeOfDay,
          characters: s.characters,
          scriptExcerpt: s.excerpt,
          sequence: `Sequência ${s.number}`,
          order: s.number - 1,
        })
        for (const f of plan.find((p) => p.sceneNumber === s.number)?.frames ?? []) {
          ids.push(await createFrame(project.id, sceneId, userId, { ...f, location: s.heading }, { message: 'Quadro proposto pela decupagem' }))
        }
      }
      if (ids.length) await startGenerateBatch(project.id, ids, userId)
      toast(`${missing.length} cenas e ${ids.length} quadros criados. Gerando imagens…`, { tone: 'ok' })
      useWS.getState().set({ tab: 'storyboard' })
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  if (script === null) return <div className="flex-1" />
  if (!script)
    return (
      <div className="flex flex-1 items-center justify-center">
        <Empty
          icon={<FileText />}
          title="Nenhum roteiro ainda"
          action={
            editable && (
              <Button variant="primary" icon={<Upload className="size-4" />} onClick={importFile}>
                Importar roteiro
              </Button>
            )
          }
        >
          Importe TXT, Markdown, PDF ou DOCX. O roteiro vira a principal fonte de contexto da IA.
        </Empty>
      </div>
    )

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-6 py-3">
        <FileText className="size-4 text-muted" />
        <span className="text-[13px] font-semibold">{script.title}</span>
        <Badge>v{script.version}</Badge>
        <span className="text-[12px] text-muted">
          {parsed.length} cenas detectadas · {scenes.length} no storyboard
        </span>
        {outdated > 0 && <Badge tone="info">{outdated} quadros sinalizados após mudança no roteiro</Badge>}
        <div className="flex-1" />
        {editable && (
          <Button size="sm" icon={<Upload className="size-3.5" />} onClick={importFile}>
            Importar nova versão
          </Button>
        )}
        {editable && missing.length > 0 && (
          <Button size="sm" accent loading={busy} icon={<Sparkles className="size-3.5" />} onClick={createMissing}>
            Criar quadros para {missing.length} {missing.length === 1 ? 'cena nova' : 'cenas novas'}
          </Button>
        )}
      </div>
      <DocEditor doc={script} mono />
    </div>
  )
}
