import { useLiveQuery } from 'dexie-react-hooks'
import { FileText, Lock } from 'lucide-react'
import { Badge, Empty } from '../../components/ui'
import { retrieve } from '../../lib/context'
import { db } from '../../lib/db'
import { can } from '../../lib/session'
import type { Frame } from '../../lib/types'
import { ContextRefs } from './AIPanel'
import { useWD } from './context'

/** What the AI will consider for this frame: scene excerpt, characters and retrieved passages. */
export function FrameContextPanel({ frame }: { frame: Frame }) {
  const { scenes, assets, role, project, jobs } = useWD()
  const scene = scenes.find((s) => s.id === frame.sceneId)
  const docs = useLiveQuery(() => db.docs.where('projectId').equals(project.id).toArray(), [project.id]) ?? []
  const readable = can(role, 'docs') ? docs : docs.filter((d) => !d.confidential)
  const refs = retrieve(readable, `${frame.description} ${frame.action} ${scene?.heading ?? ''} ${frame.characters.join(' ')}`, 4, scene?.heading)
  const chars = assets.filter((a) => a.type === 'character' && frame.characters.includes(a.name))
  const lastAI = [...jobs].reverse().find((j) => j.frameId === frame.id && j.ai)
  const hidden = docs.length - readable.length

  return (
    <div className="space-y-5 p-4">
      {scene && (
        <section>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-fg-2">
            <FileText className="size-3.5" /> Trecho do roteiro · Cena {scene.number}
          </h3>
          {frame.contextOutdated && <Badge tone="info" className="mb-2">O roteiro desta cena mudou depois da última versão</Badge>}
          <pre className="max-h-56 overflow-auto rounded-lg bg-surface-2 p-3 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap text-fg-2">{scene.scriptExcerpt || scene.heading}</pre>
        </section>
      )}
      <section>
        <h3 className="mb-1.5 text-[12px] font-semibold text-fg-2">Personagens no quadro</h3>
        {chars.length ? (
          <ul className="space-y-1.5">
            {chars.map((c) => (
              <li key={c.id} className="rounded-lg bg-surface-2 p-2 text-[12px]">
                <b>{c.name}</b> <span className="text-muted">— {c.description}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-muted">Nenhum personagem vinculado.</p>
        )}
      </section>
      <section>
        <h3 className="mb-1.5 text-[12px] font-semibold text-fg-2">Trechos relevantes dos documentos</h3>
        {readable.length ? <ContextRefs refs={refs} /> : <Empty title="Sem documentos">Adicione roteiro, briefing ou regras na aba Contexto.</Empty>}
        {hidden > 0 && (
          <p className="mt-2 flex items-center gap-1 text-[11.5px] text-muted">
            <Lock className="size-3" /> {hidden} documento(s) confidencial(is) não disponível(is) para seu papel.
          </p>
        )}
      </section>
      {lastAI?.ai && (
        <section>
          <h3 className="mb-1.5 text-[12px] font-semibold text-fg-2">Última instrução estruturada enviada</h3>
          <pre className="max-h-64 overflow-auto rounded-lg bg-surface-2 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-fg-2">{lastAI.ai.structuredPrompt}</pre>
        </section>
      )}
    </div>
  )
}
