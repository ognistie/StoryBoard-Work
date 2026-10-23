import { openaiProvider } from '../lib/ai/openai'
import { resetDemo } from '../lib/seed'
import { Button, Modal } from './ui'

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-[13px] leading-4 font-medium text-muted">{label}</h3>
      {children}
    </section>
  )
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Configurações">
      <div className="flex flex-col gap-4">
        <Section label="IA">
          <p className="text-[14px] leading-5 text-fg-2">
            As cenas são planejadas pela {openaiProvider.label} ({openaiProvider.model}). O briefing, o anexo e o texto das cenas vão para a OpenAI. Os desenhos são feitos neste navegador: o
            app não gera imagens.
          </p>
        </Section>
        <Section label="Dados locais">
          <p className="text-[14px] leading-5 text-fg-2">Projetos, versões e notas ficam só neste navegador. Restaurar apaga tudo e recria os projetos de exemplo.</p>
          <Button
            variant="danger"
            className="mt-2 self-start"
            onClick={() => {
              if (confirm('Apagar todos os dados deste navegador e restaurar os projetos de exemplo?')) void resetDemo()
            }}
          >
            Restaurar exemplos
          </Button>
        </Section>
      </div>
    </Modal>
  )
}
