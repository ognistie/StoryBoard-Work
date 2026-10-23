import { ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { resetDemo } from '../lib/seed'
import { useSettings, type ProviderId } from '../lib/settings'
import { Badge, Button, Field, Input, Modal, Segmented, toast } from './ui'

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettings()
  const [provider, setProvider] = useState<ProviderId>(s.provider)
  const [budget, setBudget] = useState(s.budget)

  const save = () => {
    s.set({ provider, budget })
    toast(provider === 'openai' ? 'OpenAI ativa' : 'Modo demonstração ativo', { tone: 'ok' })
    onClose()
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
          <div className="text-[12px] font-medium text-fg-2">Provedor de IA</div>
          <Segmented
            value={provider}
            onChange={setProvider}
            options={[
              { value: 'demo', label: 'Demonstração local' },
              { value: 'openai', label: 'OpenAI' },
            ]}
          />
          <p className="text-[12px] leading-snug text-muted">
            {provider === 'demo'
              ? 'Sem IA real: um renderizador local desenha esboços paramétricos e entende pedidos simples. Ideal para testar o fluxo offline.'
              : 'A OpenAI planeja os quadros e reescreve descrições. O desenho continua sendo feito localmente.'}
          </p>
        </div>

        {provider === 'openai' && (
          <div className="flex gap-2 rounded-lg bg-warn-soft p-2.5 text-[12px] leading-snug text-warn">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <span>Ao usar a OpenAI, as descrições, as imagens que você pedir para descrever e trechos dos documentos do projeto são enviados à OpenAI.</span>
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
