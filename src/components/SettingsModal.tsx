import { KeyRound, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { testOpenAIKey } from '../lib/ai/openai'
import { resetDemo } from '../lib/seed'
import { DEFAULT_IMAGE_MODEL, DEFAULT_TEXT_MODEL, useSettings, type ImageQuality, type ProviderId } from '../lib/settings'
import { Badge, Button, Field, Input, Modal, Segmented, Toggle, toast } from './ui'

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettings()
  const [key, setKey] = useState(s.openaiKey)
  const [provider, setProvider] = useState<ProviderId>(s.provider)
  const [imageModel, setImageModel] = useState(s.imageModel)
  const [textModel, setTextModel] = useState(s.textModel)
  const [quality, setQuality] = useState<ImageQuality>(s.imageQuality)
  const [stream, setStream] = useState(s.stream)
  const [budget, setBudget] = useState(s.budget)
  const [testing, setTesting] = useState(false)
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (!open) return
    setKey(s.openaiKey)
    setProvider(s.provider)
    setTestMsg(null)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    s.set({
      openaiKey: key.trim(),
      provider,
      imageModel: imageModel.trim() || DEFAULT_IMAGE_MODEL,
      textModel: textModel.trim() || DEFAULT_TEXT_MODEL,
      imageQuality: quality,
      stream,
      budget,
    })
    toast(provider === 'openai' && key ? 'OpenAI configurada' : 'Modo demonstração ativo', { tone: 'ok' })
    onClose()
  }

  const test = async () => {
    setTesting(true)
    setTestMsg(null)
    try {
      setTestMsg({ ok: true, text: await testOpenAIKey(key.trim(), imageModel.trim()) })
    } catch (e) {
      setTestMsg({ ok: false, text: (e as Error).message })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configurações"
      description="Provedor de IA, orçamento e dados locais."
      width={580}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={save}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="text-[12px] font-medium text-fg-2">Provedor de IA</div>
          <Segmented
            value={provider}
            onChange={setProvider}
            options={[
              { value: 'demo', label: 'Demonstração local' },
              { value: 'openai', label: 'OpenAI (ChatGPT)' },
            ]}
          />
          <p className="text-[12px] leading-snug text-muted">
            {provider === 'demo'
              ? 'Sem IA real: um renderizador local desenha os quadros e entende pedidos simples. Bom para testar o fluxo offline.'
              : 'Edição real com GPT Image: o quadro atual vai como imagem de entrada, com alta fidelidade ao que não deve mudar. Áreas marcadas viram máscara de edição.'}
          </p>
        </div>

        {provider === 'openai' && (
          <div className="space-y-3 rounded-xl border border-line p-3.5">
            <Field
              label="Chave da API da OpenAI"
              hint={
                <a className="text-accent hover:underline" href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
                  obter chave
                </a>
              }
            >
              <div className="flex gap-2">
                <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-…" autoComplete="off" />
                <Button onClick={test} loading={testing} disabled={!key} icon={<KeyRound className="size-3.5" />}>
                  Testar
                </Button>
              </div>
            </Field>
            {testMsg && <p className={`text-[12px] leading-snug ${testMsg.ok ? 'text-ok' : 'text-danger'}`}>{testMsg.text}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Modelo de imagem">
                <Input value={imageModel} onChange={(e) => setImageModel(e.target.value)} placeholder={DEFAULT_IMAGE_MODEL} />
              </Field>
              <Field label="Modelo de texto">
                <Input value={textModel} onChange={(e) => setTextModel(e.target.value)} placeholder={DEFAULT_TEXT_MODEL} />
              </Field>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1.5">
                <div className="text-[12px] font-medium text-fg-2">Qualidade da imagem</div>
                <Segmented
                  size="sm"
                  value={quality}
                  onChange={setQuality}
                  options={[
                    { value: 'low', label: 'Rápida' },
                    { value: 'medium', label: 'Média' },
                    { value: 'high', label: 'Alta' },
                  ]}
                />
              </div>
              <div className="max-w-60">
                <Toggle checked={stream} onChange={setStream} label="Prévias progressivas" description="Mostra versões parciais enquanto a imagem é gerada." />
              </div>
            </div>
            <div className="flex gap-2 rounded-lg bg-warn-soft p-2.5 text-[12px] leading-snug text-warn">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                Ao usar a OpenAI, a imagem do quadro, as descrições e trechos dos documentos do projeto são enviados à OpenAI. A chave fica salva apenas neste navegador. Modelos GPT Image podem exigir organização verificada.
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Limite de gerações neste navegador" hint={<Badge>{s.used} usadas</Badge>}>
            <Input type="number" min={1} value={budget} onChange={(e) => setBudget(Number(e.target.value) || 1)} />
          </Field>
          <div className="flex items-end">
            <Button variant="ghost" size="sm" onClick={() => s.set({ used: 0 })}>
              Zerar contador
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-line p-3.5">
          <div>
            <div className="text-[13px] font-medium">Dados locais</div>
            <p className="text-[12px] text-muted">Tudo fica no IndexedDB deste navegador. Restaurar apaga projetos e recria a demonstração.</p>
          </div>
          <Button
            variant="ghost"
            className="text-danger"
            onClick={() => {
              if (confirm('Apagar todos os dados locais e restaurar a demonstração?')) void resetDemo()
            }}
          >
            Restaurar demo
          </Button>
        </div>
      </div>
    </Modal>
  )
}
