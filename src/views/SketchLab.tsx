import { useEffect, useRef } from 'react'
import { renderSketch, SKETCH_H, SKETCH_W } from '../lib/sketch'
import type { SketchPerson, SketchSpec } from '../lib/types'

/** Dev-only gallery (#/lab) to review the demo renderer across shots and settings. */
const P = (x: number, name: string, extra: Partial<SketchPerson> = {}): SketchPerson => ({ x, name, kind: 'adult', pose: 'stand', facing: x > 0.5 ? 'left' : 'right', ...extra })

const SPECS: SketchSpec[] = [
  { setting: 'house', time: 'day', shot: 'aberto', people: [P(0.3, 'Pedro', { hair: 'short', outfit: 'striped', beard: true }), P(0.45, 'Ana', { hair: 'curly', outfit: 'jacket' }), P(0.6, 'Léo', { kind: 'child', hair: 'cap', pose: 'walk' }), P(0.75, 'Bia', { hair: 'bun', outfit: 'jacket' })], props: ['caixas'], seed: 33 },
  { setting: 'house', time: 'day', shot: 'geral', people: [], props: ['carro', 'placa'], seed: 11 },
  { setting: 'living', time: 'day', shot: 'medio', people: [P(0.5, 'Pedro', { hair: 'short', outfit: 'striped', beard: true })], props: [], seed: 66 },
  { setting: 'office', time: 'day', shot: 'close', people: [P(0.5, 'Marta', { hair: 'long', outfit: 'collar' })], props: [], seed: 6 },
  { setting: 'garden', time: 'sunset', shot: 'geral', people: [P(0.42, 'Ana', { pose: 'sit', hair: 'curly' }), P(0.52, 'Pedro', { pose: 'sit' }), P(0.34, 'Léo', { kind: 'child', pose: 'sit', hair: 'cap' })], props: ['cachorro'], seed: 88 },
  { setting: 'empty', time: 'sunset', shot: 'detalhe', people: [], props: ['chaves'], seed: 99 },
  { setting: 'living', time: 'night', shot: 'aberto', people: [P(0.3, 'Léo', { kind: 'child', pose: 'sit', hair: 'cap' }), P(0.66, 'Ana', { hair: 'curly', outfit: 'jacket', pose: 'wave' })], props: [], seed: 77 },
  { setting: 'street', time: 'day', shot: 'americano', people: [P(0.5, 'Marta', { hair: 'ponytail', outfit: 'collar', expression: 'surprised' })], props: [], seed: 7 },
  { setting: 'house', time: 'night', shot: 'ots', people: [P(0.62, 'Ana', { hair: 'curly', outfit: 'jacket', expression: 'laugh' })], props: [], seed: 5 },
  { setting: 'kitchen', time: 'day', shot: 'extreme-close', people: [P(0.5, 'Léo', { kind: 'child', hair: 'spiky', expression: 'surprised' })], props: [], seed: 9 },
]

function Panel({ spec }: { spec: SketchSpec }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    renderSketch(ref.current!.getContext('2d')!, spec)
  }, [spec])
  return <canvas ref={ref} width={SKETCH_W} height={SKETCH_H} className="w-full" />
}

export function SketchLab() {
  return (
    <div className="grid grid-cols-2 gap-3 bg-neutral-300 p-3">
      {SPECS.map((s, i) => (
        <Panel key={i} spec={s} />
      ))}
    </div>
  )
}
