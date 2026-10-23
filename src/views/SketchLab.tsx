import { useEffect, useRef, useState } from 'react'
import { renderSketch, sketchSize, type StoryboardSpec } from '../lib/sketch'
import { specFromDescription } from '../lib/sketchOps'
import type { CameraMove, Project, ShotType } from '../lib/types'

/** Dev-only gallery (#/lab): scene texts × shots at card size, to review the storyboard renderer. */

const SCENES: { text: string; move: CameraMove }[] = [
  { text: 'Close nas mãos moendo café no moedor sobre o balcão.', move: 'push-in' },
  { text: 'Mão escreve a fórmula P = E/t num papel; o traço vira uma pílula azul.', move: 'push-in' },
  { text: 'A gestora entre planilhas na mesa, do dia até a noite pela janela.', move: 'time-lapse' },
  { text: 'Pílulas viram blocos azuis que se encaixam num ecossistema.', move: 'zoom-out' },
  { text: 'De manhã, ela leva o time para a estratégia diante do quadro de planejamento.', move: 'tracking' },
  { text: 'Os blocos formam o símbolo; entra a assinatura da marca.', move: 'estatico' },
  { text: 'O cliente recebe a notificação no celular.', move: 'tilt' },
  { text: 'A xícara de café coado, com vapor.', move: 'pan' },
  { text: 'Fachada da loja na rua, de manhã.', move: 'handheld' },
  { text: 'Embalagem do produto girando na bancada.', move: 'crane' },
  { text: 'Ela respira fundo.', move: 'estatico' },
]

const SHOTS: ShotType[] = ['detalhe', 'close', 'medio', 'aberto', 'conjunto', 'motion']

function Panel({ spec, width }: { spec: StoryboardSpec; width: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [ms, setMs] = useState(0)
  const size = sketchSize(spec.aspect)
  useEffect(() => {
    const t0 = performance.now()
    renderSketch(ref.current!.getContext('2d')!, spec, size.width, size.height)
    setMs(Math.round(performance.now() - t0))
  }, [spec, size.width, size.height])
  return (
    <figure className="flex flex-col gap-1">
      <canvas ref={ref} width={size.width} height={size.height} style={{ width }} className="rounded-md bg-white" />
      <figcaption className="text-[10px] text-neutral-600">
        {spec.shot} · {spec.movement ?? '—'} · {ms}ms
      </figcaption>
    </figure>
  )
}

function Row({ text, move, aspect = '9:16' }: { text: string; move: CameraMove; aspect?: Project['aspect'] }) {
  return (
    <section className="flex flex-col gap-1.5">
      <p className="text-[12px] text-neutral-800">{text}</p>
      <div className="flex flex-wrap gap-3">
        {SHOTS.map((shot) => (
          <Panel key={shot} spec={specFromDescription(text, { shot, movement: move, aspect })} width={aspect === '9:16' ? 160 : aspect === '1:1' ? 208 : 284} />
        ))}
      </div>
    </section>
  )
}

export function SketchLab() {
  return (
    <div className="flex flex-col gap-6 bg-neutral-200 p-4">
      {SCENES.map((s) => (
        <Row key={s.text} {...s} />
      ))}
      <Row text="De manhã, ela leva o time para a estratégia diante do quadro de planejamento." move="tracking" aspect="1:1" />
      <Row text="Close nas mãos moendo café no moedor sobre o balcão." move="push-in" aspect="16:9" />
    </div>
  )
}
