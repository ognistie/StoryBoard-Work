import { KeyRound, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { testGeminiKey } from '../lib/ai/gemini'
import { resetDemo } from '../lib/seed'
import { useSettings, type ProviderId } from '../lib/settings'
import { Badge, Button, Field, Input, Modal, Segmented, toast } from './ui'

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettings()
  const [key, setKey] = useState(s.geminiKey)
  const [provider, setProvider] = useState<ProviderId>(s.provider)
  const [imageModel, setImageModel] = useState(s.imageModel)
  const [textModel, setTextModel] = useState(s.textModel)
  const [budget, setBudget] = useState(s.budget)
  const [testing, setTesting] = useState(false)
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const save = () => {
    s.set({ geminiKey: key.trim(), provider, imageModel: imageModel.trim(), textModel: textModel.trim(), budget })
    toast(provider === 'gemini' && key ? 'Gemini configurado' : 'Modo demonstração ativo', { tone: 'ok' })
    onClose()
  }

  const test = async () => {
    setTesting(true)
    setTestMsg(null)
    try {
      setTestMsg({ ok: true, text: await testGeminiKey(key.trim()) })
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
      width={560}
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
          <div className="text-[12px] font-medium text-fg-2">Provedor de geração de imagens</div>
          <Segmented
            value={provider}
            onChange={setProvider}
            options={[
              { value: 'demo', label: 'Demonstração local' },
              { value: 'gemini', label: 'Google Gemini' },
            ]}
          />
          <p className="text-[12px] leading-snug text-muted">
            {provider === 'demo'
              ? 'Sem IA real: um renderizador local desenha esboços paramétricos e entende pedidos simples. Ideal para testar o fluxo offline.'
              : 'Edição multimodal real: o quadro atual é enviado como imagem de entrada, preservando a composição.'}
          </p>
        </div>

        {provider === 'gemini' && (
          <div className="space-y-3 rounded-xl border border-line p-3.5">
            <Field label="Chave da API (Google AI Studio)" hint={<a className="text-accent hover:underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">obter chave</a>}>
              <div className="flex gap-2">
                <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="AIza…" autoComplete="off" />
                <Button onClick={test} loading={testing} disabled={!key} icon={<KeyRound className="size-3.5" />}>
                  Testar
                </Button>
              </div>
            </Field>
            {testMsg && <p className={`text-[12px] ${testMsg.ok ? 'text-ok' : 'text-danger'}`}>{testMsg.text}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Modelo de imagem">
                <Input value={imageModel} onChange={(e) => setImageModel(e.target.value)} />
              </Field>
              <Field label="Modelo de texto">
                <Input value={textModel} onChange={(e) => setTextModel(e.target.value)} />
              </Field>
            </div>
            <div className="flex gap-2 rounded-lg bg-warn-soft p-2.5 text-[12px] leading-snug text-warn">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                Ao usar o Gemini, a imagem do quadro, as descrições e trechos dos documentos do projeto são enviados ao Google. A chave fica salva apenas neste navegador.
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

        <div className="flex items-center justify-between rounded-xl border border-line p-3.5">
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
