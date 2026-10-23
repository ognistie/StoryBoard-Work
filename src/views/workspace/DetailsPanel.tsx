import { GitCommitHorizontal, ImagePlus, Wand2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { FrameImage } from '../../components/FrameImage'
import { Badge, Button, cx, Field, Input, Select, Textarea, toast, toastError } from '../../components/ui'
import { getProvider } from '../../lib/ai'
import { MOVE_LABEL, SHOT_LABEL } from '../../lib/context'
import { db } from '../../lib/db'
import { commitFrame, updateFrame } from '../../lib/repo'
import { can } from '../../lib/session'
import type { CameraMove, Frame, FrameContent, ShotType } from '../../lib/types'
import { replaceImage } from './actions'
import { ApprovalBox } from './ApprovalBox'
import { useWD } from './context'
import { useWS } from './store'

export function DetailsPanel({ frame }: { frame: Frame }) {
  const { role, userId, assets, scenes } = useWD()
  const editable = can(role, 'edit')
  const [draft, setDraft] = useState<Partial<FrameContent>>({})
  const [message, setMessage] = useState('')
  const [describing, setDescribing] = useState(false)
  useEffect(() => setDraft({}), [frame.id])

  const v = <K extends keyof FrameContent>(k: K): FrameContent[K] => (k in draft ? (draft[k] as FrameContent[K]) : frame[k])
  const change = <K extends keyof FrameContent>(k: K, value: FrameContent[K]) => setDraft((d) => ({ ...d, [k]: value }))
  const save = async (k: keyof FrameContent) => {
    if (!(k in draft) || JSON.stringify(draft[k]) === JSON.stringify(frame[k])) return
    try {
      await updateFrame(frame.id, userId, { [k]: draft[k] })
    } catch (e) {
      toastError(e)
    }
  }
  const setNow = async (patch: Partial<FrameContent>) => {
    try {
      await updateFrame(frame.id, userId, patch)
    } catch (e) {
      toastError(e)
    }
  }
  const commit = async () => {
    try {
      const rev = await commitFrame(frame.id, userId, message.trim() || 'Metadados atualizados', 'manual')
      toast(`Versão v${rev.number} (${rev.short}) registrada`, { tone: 'ok' })
      setMessage('')
    } catch (e) {
      toastError(e)
    }
  }
  const describe = async () => {
    if (!frame.imageId) return
    setDescribing(true)
    try {
      const img = await db.images.get(frame.imageId)
      const text = await getProvider().describeImage(img!.blob, new AbortController().signal)
      await setNow({ description: text })
    } catch (e) {
      toastError(e)
    } finally {
      setDescribing(false)
    }
  }

  const characters = assets.filter((a) => a.type === 'character')
  const text = (k: 'title' | 'description' | 'action' | 'dialogue' | 'angle' | 'composition' | 'location' | 'lighting' | 'notes', rows = 0, placeholder = '') =>
    rows ? (
      <Textarea rows={rows} disabled={!editable} value={v(k) as string} placeholder={placeholder} onChange={(e) => change(k, e.target.value)} onBlur={() => save(k)} />
    ) : (
      <Input disabled={!editable} value={v(k) as string} placeholder={placeholder} onChange={(e) => change(k, e.target.value)} onBlur={() => save(k)} />
    )

  return (
    <div className="space-y-4 p-4">
      <div className="group relative">
        <FrameImage imageId={frame.imageId} alt={frame.title} className="cursor-zoom-in rounded-lg border border-line" />
        <button className="absolute inset-0" aria-label="Ampliar" onClick={() => useWS.getState().set({ viewerId: frame.id })} />
        {editable && (
          <Button size="sm" className="absolute right-2 bottom-2 opacity-0 transition-opacity group-hover:opacity-100" icon={<ImagePlus className="size-3.5" />} onClick={() => replaceImage(frame, userId)}>
            Importar imagem
          </Button>
        )}
      </div>

      <ApprovalBox frame={frame} />

      {frame.dirty && editable && (
        <div className="space-y-2 rounded-xl border border-accent/30 bg-accent-soft/40 p-3">
          <div className="flex items-center gap-2 text-[12.5px] font-medium">
            <GitCommitHorizontal className="size-4 text-accent" />
            Alterações não versionadas
          </div>
          <div className="flex gap-1.5">
            <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mensagem da versão (ex.: ajuste de enquadramento)" onKeyDown={(e) => e.key === 'Enter' && commit()} />
            <Button size="md" variant="primary" onClick={commit}>
              Registrar
            </Button>
          </div>
        </div>
      )}

      <Field label="Título">{text('title')}</Field>
      <Field
        label="Descrição visual (prompt-base)"
        hint={
          editable && frame.imageId ? (
            <button className="flex items-center gap-1 text-accent hover:underline disabled:opacity-50" disabled={describing} onClick={describe}>
              <Wand2 className="size-3" />
              {describing ? 'descrevendo…' : 'descrever imagem'}
            </button>
          ) : undefined
        }
      >
        {text('description', 3, 'Descrição curta e objetiva do que aparece no quadro')}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Enquadramento">
          <Select disabled={!editable} value={frame.shot} onChange={(e) => setNow({ shot: e.target.value as ShotType })}>
            {Object.entries(SHOT_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Movimento">
          <Select disabled={!editable} value={frame.movement} onChange={(e) => setNow({ movement: e.target.value as CameraMove })}>
            {Object.entries(MOVE_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ângulo">{text('angle')}</Field>
        <Field label="Duração (s)">
          <Input
            type="number"
            min={0.5}
            step={0.5}
            disabled={!editable}
            value={v('duration')}
            onChange={(e) => change('duration', Number(e.target.value))}
            onBlur={() => save('duration')}
          />
        </Field>
      </div>

      <Field label="Ação">{text('action', 2)}</Field>
      <Field label="Diálogo / narração">{text('dialogue', 2, 'NOME: fala')}</Field>
      <Field label="Composição">{text('composition', 2, 'Posição dos personagens, eixo, profundidade…')}</Field>

      <Field label="Personagens">
        <div className="flex flex-wrap gap-1.5">
          {characters.map((c) => {
            const on = frame.characters.includes(c.name)
            return (
              <button
                key={c.id}
                disabled={!editable}
                onClick={() => setNow({ characters: on ? frame.characters.filter((x) => x !== c.name) : [...frame.characters, c.name] })}
                className={cx('rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors', on ? 'bg-fg text-bg' : 'bg-surface-2 text-fg-2 hover:bg-surface-3')}
              >
                {c.name}
              </button>
            )
          })}
          {!characters.length && <span className="text-[12px] text-muted">Cadastre personagens em Assets.</span>}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Locação">{text('location')}</Field>
        <Field label="Iluminação">{text('lighting')}</Field>
      </div>
      <Field label="Cena">
        <Select
          disabled={!editable}
          value={frame.sceneId}
          onChange={(e) => db.frames.update(frame.id, { sceneId: e.target.value }).catch(toastError)}
        >
          {scenes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.number}. {s.heading}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Observações técnicas">{text('notes', 2)}</Field>
      {frame.annotations.length > 0 && (
        <p className="text-[12px] text-muted">
          <Badge>{frame.annotations.length}</Badge> anotações gráficas — edite no modo ampliado.
        </p>
      )}
    </div>
  )
}
