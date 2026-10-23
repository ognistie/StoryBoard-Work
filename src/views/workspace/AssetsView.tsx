import { ImagePlus, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { FrameImage } from '../../components/FrameImage'
import { Button, Field, Input, Modal, Select, Textarea, toast, toastError } from '../../components/ui'
import { getProvider } from '../../lib/ai'
import { STYLE_PROMPT } from '../../lib/context'
import { fileToImage } from '../../lib/fileText'
import { deleteAsset, putImage, saveAsset, updateProject } from '../../lib/repo'
import { can } from '../../lib/session'
import type { ArtStyle, Asset, AssetType } from '../../lib/types'
import { pickFile } from './actions'
import { useWD } from './context'

const STYLE_OPTIONS: { value: ArtStyle; label: string }[] = [
  { value: 'pencil', label: 'Storyboard a lápis (P&B)' },
  { value: 'sketch', label: 'Sketch cinematográfico' },
  { value: 'concept', label: 'Concept art' },
  { value: 'cinematic', label: 'Realista / cinematográfico' },
  { value: 'custom', label: 'Customizado' },
]

const TYPE_LABEL: Record<AssetType, string> = {
  character: 'Personagens',
  location: 'Cenários e locações',
  wardrobe: 'Figurinos',
  prop: 'Objetos e elementos recorrentes',
  lighting: 'Identidade de iluminação',
  palette: 'Paletas e estilos',
  reference: 'Referências do briefing',
}

export function AssetsView() {
  const { project, assets, role, userId } = useWD()
  const [editing, setEditing] = useState<Partial<Asset> | null>(null)
  const editable = can(role, 'edit')
  const [notes, setNotes] = useState(project.styleNotes)

  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-8 p-6">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-[15px] font-semibold tracking-tight">Direção de arte do projeto</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">Herdada por todos os quadros e enviada em cada geração.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-[260px_1fr]">
            <Field label="Estilo visual">
              <Select
                disabled={!can(role, 'manage')}
                value={project.style}
                onChange={(e) => updateProject(project.id, userId, { style: e.target.value as ArtStyle }).catch(toastError)}
              >
                {STYLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Notas de estilo" hint={STYLE_PROMPT[project.style].slice(0, 60) + '…'}>
              <Input
                disabled={!can(role, 'manage')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => notes !== project.styleNotes && updateProject(project.id, userId, { styleNotes: notes }).catch(toastError)}
                placeholder="Ex.: traço limpo, sem cor, personagens identificados"
              />
            </Field>
          </div>
        </section>

        {(Object.keys(TYPE_LABEL) as AssetType[]).map((type) => {
          const list = assets.filter((a) => a.type === type)
          if (!list.length && type !== 'character' && !editable) return null
          return (
            <section key={type}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[14px] font-semibold tracking-tight">
                  {TYPE_LABEL[type]} <span className="font-normal text-muted">{list.length}</span>
                </h2>
                {editable && (
                  <Button size="sm" variant="ghost" icon={<Plus className="size-3.5" />} onClick={() => setEditing({ type, name: '', description: '' })}>
                    Adicionar
                  </Button>
                )}
              </div>
              {list.length ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {list.map((a) => (
                    <button key={a.id} onClick={() => editable && setEditing(a)} className="overflow-hidden rounded-xl border border-line bg-surface text-left shadow-sm transition-shadow hover:shadow-md">
                      <FrameImage imageId={a.imageId} alt={a.name} />
                      <div className="p-3">
                        <div className="text-[13px] font-semibold">{a.name}</div>
                        <p className="mt-0.5 line-clamp-2 text-[12px] text-muted">{a.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[12.5px] text-muted">Nada cadastrado.</p>
              )}
            </section>
          )
        })}
        <p className="text-[12px] text-muted">Dica: ao escrever “Adicionar Ana” no editor de IA, a ficha e a imagem de referência da personagem são usadas automaticamente.</p>
      </div>
      {editing && <AssetModal asset={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function AssetModal({ asset, onClose }: { asset: Partial<Asset>; onClose: () => void }) {
  const { project, userId } = useWD()
  const [a, setA] = useState(asset)
  const [busy, setBusy] = useState(false)

  const upload = async () => {
    const f = await pickFile('image/*')
    if (!f) return
    try {
      const { blob, width, height } = await fileToImage(f)
      setA({ ...a, imageId: await putImage(blob, width, height) })
    } catch (e) {
      toastError(e)
    }
  }
  const generate = async () => {
    setBusy(true)
    try {
      const provider = getProvider()
      const res = await provider.generateImage({
        prompt: `Ficha de referência de personagem/elemento para storyboard. ${STYLE_PROMPT[project.style]}. ${a.name}: ${a.description}. Corpo inteiro, fundo neutro, sem texto.`,
        description: `${a.name} ${a.description}`,
        shot: 'americano',
        timeOfDay: 'day',
        characters: a.type === 'character' ? [{ ...(a as Asset) }] : [],
        references: [],
        aspect: project.aspect,
        signal: new AbortController().signal,
      })
      setA({ ...a, imageId: await putImage(res.blob, res.width, res.height) })
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }
  const save = async () => {
    if (!a.name?.trim()) return toast('Informe um nome', { tone: 'danger' })
    try {
      await saveAsset(project.id, userId, { ...a, name: a.name.trim(), type: a.type! })
      onClose()
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={asset.id ? 'Editar asset' : 'Novo asset'}
      footer={
        <>
          {asset.id && (
            <Button variant="ghost" className="mr-auto text-danger" icon={<Trash2 className="size-4" />} onClick={() => deleteAsset(asset.id!, userId).then(onClose).catch(toastError)}>
              Excluir
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={save}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <FrameImage imageId={a.imageId} alt={a.name ?? ''} className="rounded-lg border border-line" />
        <div className="flex gap-2">
          <Button size="sm" icon={<ImagePlus className="size-3.5" />} onClick={upload}>
            Enviar referência
          </Button>
          <Button size="sm" icon={<Sparkles className="size-3.5" />} loading={busy} disabled={!a.description} onClick={generate}>
            Gerar referência
          </Button>
        </div>
        <Field label="Nome">
          <Input value={a.name ?? ''} onChange={(e) => setA({ ...a, name: e.target.value })} placeholder="Ex.: Ana" />
        </Field>
        <Field label="Tipo">
          <Select value={a.type} onChange={(e) => setA({ ...a, type: e.target.value as AssetType })}>
            {Object.entries(TYPE_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Descrição / ficha">
          <Textarea rows={3} value={a.description ?? ''} onChange={(e) => setA({ ...a, description: e.target.value })} placeholder="Idade, aparência, figurino, traços que precisam se manter…" />
        </Field>
      </div>
    </Modal>
  )
}
