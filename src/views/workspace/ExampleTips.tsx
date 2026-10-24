import { Lightbulb, X } from 'lucide-react'
import { useState } from 'react'
import { useWD } from './context'

const TIPS = [
  'Clique numa cena e abra Versões: cada mudança fica guardada, com quem fez e por quê.',
  'Peça uma mudança na caixa de baixo, como “close na mão” ou “Mais curta”.',
  'Abra o chat e comece com @ia: a IA lê o briefing e sugere mudanças que você aplica com um clique.',
  'Edite o briefing no topo do canvas: a IA refaz só as cenas afetadas.',
]

const KEY = 'decupa.tips.closed'

/** A short guided tour on the example projects, so a first visit learns the product by using it. */
export function ExampleTips() {
  const { project } = useWD()
  const [closed, setClosed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })
  const [step, setStep] = useState(0)
  if (!project.example || closed) return null

  const close = () => {
    setClosed(true)
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      // Private mode: closes for this visit only.
    }
  }

  return (
    <div role="note" className="glass pop-in flex items-start gap-3 rounded-[18px] !shadow-[inset_0_1px_0_#FFFFFFE6,0_0_0_1px_#0000000F,0_8px_32px_#0000001A] px-4 py-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#0071E31A] text-accent">
        <Lightbulb className="size-3.5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="text-[12px] leading-4 font-semibold text-muted">
          Exemplo interativo · {step + 1} de {TIPS.length}
        </span>
        <p className="text-[14px] leading-5 text-fg">{TIPS[step]}</p>
        <div className="flex items-center gap-1.5">
          {TIPS.map((_, i) => (
            <button key={i} aria-label={`Dica ${i + 1}`} onClick={() => setStep(i)} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-4 bg-accent' : 'w-1.5 bg-[#D4D4D8] hover:bg-[#A1A1AA]'}`} />
          ))}
          <span className="flex-1" />
          {step < TIPS.length - 1 ? (
            <button onClick={() => setStep(step + 1)} className="text-[13px] leading-4 font-semibold text-accent hover:underline">
              Próxima dica
            </button>
          ) : (
            <button onClick={close} className="text-[13px] leading-4 font-semibold text-accent hover:underline">
              Entendi
            </button>
          )}
        </div>
      </div>
      <button aria-label="Fechar dicas" onClick={close} className="-mt-0.5 -mr-1 flex size-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/70 hover:text-fg">
        <X className="size-3.5" />
      </button>
    </div>
  )
}
