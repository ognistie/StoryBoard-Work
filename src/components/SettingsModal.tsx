import { useAuth } from '../lib/collab/auth'
import { useHealth } from '../lib/health'
import { resetDemo } from '../lib/seed'
import { Button, cx, Modal } from './ui'

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-[13px] leading-4 font-medium text-muted">{label}</h3>
      {children}
    </section>
  )
}

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-[14px] leading-5 text-fg-2">
      <span className={cx('size-2 shrink-0 rounded-full', ok ? 'bg-[#30D158]' : 'bg-[#FF9F0A]')} />
      {children}
    </span>
  )
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const health = useHealth()
  const user = useAuth((s) => s.user)
  return (
    <Modal open={open} onClose={onClose} title="Configurações">
      <div className="flex flex-col gap-4">
        <Section label="IA">
          <Status ok={health.ai}>{health.ai ? `OpenAI ativa · modelo ${health.textModel}` : 'IA indisponível: o servidor está sem chave da OpenAI.'}</Status>
          <p className="text-[14px] leading-5 text-fg-2">
            A IA planeja as cenas, refaz cada cena a pedido e responde no chat com @ia. O briefing, os anexos de texto e o texto das cenas vão para a OpenAI. Os desenhos são feitos neste
            navegador: o app não gera imagens.
          </p>
        </Section>
        <Section label="Colaboração">
          <Status ok={health.collab}>{health.collab ? (user ? `Conectado como ${user.email}` : 'Disponível: entre para compartilhar projetos') : 'Indisponível neste servidor'}</Status>
          <p className="text-[14px] leading-5 text-fg-2">
            Projetos compartilhados ficam no servidor e em cada navegador do time. Chat, notas, versões e a pasta de arquivos sincronizam a cada poucos segundos e funcionam sem internet até a
            conexão voltar.
          </p>
        </Section>
        <Section label="Dados deste navegador">
          <p className="text-[14px] leading-5 text-fg-2">Restaurar apaga a cópia local e recria os exemplos. Projetos compartilhados voltam do servidor quando você entrar de novo.</p>
          <Button
            variant="danger"
            className="mt-2 self-start"
            onClick={() => {
              if (confirm('Apagar todos os dados deste navegador e restaurar os projetos de exemplo? Projetos só locais serão perdidos.')) void resetDemo()
            }}
          >
            Restaurar exemplos
          </Button>
        </Section>
      </div>
    </Modal>
  )
}
