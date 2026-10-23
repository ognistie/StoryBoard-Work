import { FileText, PenLine, Sparkles, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { navigate } from '../App'
import { Button, cx, Field, Input, Modal, Select, Textarea, toast, toastError, Toggle } from '../components/ui'
import { getProvider } from '../lib/ai'
import { parseScript, STYLE_PROMPT } from '../lib/context'
import { ACCEPT_DOCS, extractText } from '../lib/fileText'
import { startGenerateBatch } from '../lib/jobs'
import { createFrame, createProject, createScene, saveDoc } from '../lib/repo'
import { DEMO_SCRIPT } from '../lib/seed'
import { USERS, useSession } from '../lib/session'
import type { ArtStyle } from '../lib/types'

export const STYLE_OPTIONS: { value: ArtStyle; label: string }[] = [
  { value: 'pencil', label: 'Storyboard a lápis (P&B)' },
  { value: 'sketch', label: 'Sketch cinematográfico' },
  { value: 'concept', label: 'Concept art' },
  { value: 'cinematic', label: 'Realista / cinematográfico' },
  { value: 'custom', label: 'Customizado' },
]

export function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const userId = useSession((s) => s.userId)
  const [mode, setMode] = useState<'manual' | 'ai'>('ai')
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [style, setStyle] = useState<ArtStyle>('pencil')
  const [script, setScript] = useState('')
  const [fileName, setFileName] = useState<string>()
  const [genImages, setGenImages] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const scenes = mode === 'ai' && script ? parseScript(script) : []

  const onFile = async (f?: File) => {
    if (!f) return
    try {
      setBusy('Lendo arquivo…')
      setScript(await extractText(f))
      setFileName(f.name)
      if (!name) setName(f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '))
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(null)
    }
  }

  const create = async () => {
    if (!name.trim()) return toast('Dê um nome ao projeto.', { tone: 'danger' })
    try {
      setBusy('Criando projeto…')
      const me = USERS.find((u) => u.id === userId)
      const projectId = await createProject({
        name: name.trim(),
        client: client.trim() || 'Cliente',
        producer: me?.org ?? 'Produtora',
        style,
        ownerId: userId,
        members: [
          { userId, role: 'producer' },
          ...USERS.filter((u) => u.id !== userId && u.org === me?.org).map((u) => ({ userId: u.id, role: 'editor' as const })),
        ],
      })
      if (mode === 'manual' || !scenes.length) {
        const sceneId = await createScene(projectId, userId, { heading: 'CENA 1', sequence: 'Sequência 1' })
        await createFrame(projectId, sceneId, userId, { title: 'Quadro 1', description: '' }, { message: 'Quadro inicial' })
        if (script.trim()) await saveDoc(projectId, userId, { title: 'Roteiro', kind: 'script', text: script, confidential: false, fileName })
      } else {
        await saveDoc(projectId, userId, { title: 'Roteiro', kind: 'script', text: script, confidential: false, fileName })
        setBusy('Decupando roteiro em quadros…')
        const provider = getProvider()
        const plan = await provider.planShots(scenes, STYLE_PROMPT[style], new AbortController().signal)
        const frameIds: string[] = []
        for (const s of scenes) {
          const sceneId = await createScene(projectId, userId, {
            number: s.number,
            heading: s.heading,
            summary: s.summary,
            timeOfDay: s.timeOfDay,
            characters: s.characters,
            scriptExcerpt: s.excerpt,
            sequence: `Sequência ${s.number}`,
          })
          const frames = plan.find((p) => p.sceneNumber === s.number)?.frames ?? []
          for (const f of frames) {
            frameIds.push(
              await createFrame(
                projectId,
                sceneId,
                userId,
                { title: f.title, description: f.description, action: f.action, dialogue: f.dialogue, shot: f.shot, movement: f.movement, characters: f.characters, duration: f.duration, location: s.heading },
                { message: `Quadro proposto pela decupagem (${provider.isDemo ? 'heurística local' : provider.label})`, kind: 'initial' },
              ),
            )
          }
        }
        if (genImages && frameIds.length) await startGenerateBatch(projectId, frameIds, userId)
        toast(`${frameIds.length} quadros criados a partir de ${scenes.length} cenas`, { tone: 'ok' })
      }
      onClose()
      navigate(`/p/${projectId}`)
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo projeto"
      description="Comece do zero ou deixe a IA transformar o roteiro em quadros."
      width={640}
      footer={
        <>
          <span className="mr-auto text-[12px] text-muted">{busy}</span>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={create} loading={!!busy} icon={mode === 'ai' ? <Sparkles className="size-4" /> : undefined}>
            {mode === 'ai' ? 'Criar e gerar quadros' : 'Criar projeto'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ['manual', <PenLine key="i" className="size-4" />, 'Storyboard manual', 'Quadro vazio; importe imagens quando quiser.'],
            ['ai', <Sparkles key="i" className="size-4" />, 'Storyboard com IA', 'Importe o roteiro e receba cenas e quadros iniciais.'],
          ] as const
        ).map(([m, icon, title, desc]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cx(
              'rounded-xl border p-3.5 text-left transition-all',
              mode === m ? 'border-accent bg-accent-soft/60 ring-3 ring-accent/10' : 'border-line hover:border-line-strong',
            )}
          >
            <span className={cx('flex size-8 items-center justify-center rounded-lg', mode === m ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-fg-2')}>{icon}</span>
            <span className="mt-2.5 block text-[13.5px] font-semibold">{title}</span>
            <span className="mt-0.5 block text-[12px] leading-snug text-muted">{desc}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Field label="Nome do projeto">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Casa Nova — Filme 30”" />
        </Field>
        <Field label="Cliente">
          <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Ex.: Horizonte Imóveis" />
        </Field>
        <Field label="Direção de arte" className="col-span-2">
          <Select value={style} onChange={(e) => setStyle(e.target.value as ArtStyle)}>
            {STYLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {mode === 'ai' && (
        <div className="mt-4 space-y-3">
          <Field
            label="Roteiro"
            hint={
              <span className="flex gap-3">
                <button className="text-accent hover:underline" onClick={() => setScript(DEMO_SCRIPT)}>
                  usar exemplo
                </button>
                <button className="flex items-center gap-1 text-accent hover:underline" onClick={() => fileRef.current?.click()}>
                  <Upload className="size-3" />
                  importar arquivo
                </button>
              </span>
            }
          >
            <Textarea rows={8} value={script} onChange={(e) => setScript(e.target.value)} placeholder={'Cole o roteiro aqui (formato com cabeçalhos INT./EXT.)\n\n1. EXT. PRAIA — DIA\nMARIA (30) caminha pela areia…'} className="font-mono text-[12px]" />
          </Field>
          <input ref={fileRef} type="file" accept={ACCEPT_DOCS} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[12px] text-muted">
              <FileText className="size-3.5" />
              {fileName ? `${fileName} · ` : ''}
              {scenes.length ? `${scenes.length} cenas detectadas: ${scenes.map((s) => s.heading).slice(0, 3).join(' · ')}${scenes.length > 3 ? '…' : ''}` : 'Nenhuma cena detectada ainda'}
            </div>
          </div>
          <Toggle checked={genImages} onChange={setGenImages} label="Gerar imagens dos quadros agora" description="Roda em segundo plano; você já pode navegar pelo projeto enquanto isso." />
        </div>
      )}
    </Modal>
  )
}
