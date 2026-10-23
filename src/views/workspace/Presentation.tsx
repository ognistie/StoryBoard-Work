import { ChevronLeft, ChevronRight, Pause, Play, Subtitles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FrameImage } from '../../components/FrameImage'
import { cx } from '../../components/ui'
import { SHOT_LABEL } from '../../lib/context'
import { useWD } from './context'
import { useWS } from './store'
import { AnnotationLayer } from './Viewer'

/** Client-facing playback: clean presentation and animatic (timed by frame duration). */
export function Presentation() {
  const { ordered, project, scenes } = useWD()
  const ws = useWS()
  const startIdx = Math.max(0, ordered.findIndex((f) => f.id === ws.focusId))
  const [i, setI] = useState(startIdx)
  const [playing, setPlaying] = useState(false)
  const [captions, setCaptions] = useState(true)
  const [t0, setT0] = useState(Date.now())
  const [now, setNow] = useState(Date.now())
  const frame = ordered[i]
  const close = () => ws.set({ presenting: false })
  const total = ordered.reduce((s, f) => s + f.duration, 0)
  const elapsedBefore = ordered.slice(0, i).reduce((s, f) => s + f.duration, 0)

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => undefined)
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined)
    }
  }, [])

  useEffect(() => {
    if (!playing || !frame) return
    setT0(Date.now())
    const tick = setInterval(() => setNow(Date.now()), 50)
    const t = setTimeout(() => {
      if (i < ordered.length - 1) setI(i + 1)
      else setPlaying(false)
    }, frame.duration * 1000)
    return () => {
      clearTimeout(t)
      clearInterval(tick)
    }
  }, [playing, i]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') setI((x) => Math.min(ordered.length - 1, x + 1))
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1))
      if (e.key === ' ') {
        e.preventDefault()
        setPlaying((p) => !p)
      }
    }
    window.addEventListener('keydown', k, true)
    return () => window.removeEventListener('keydown', k, true)
  })

  if (!frame) return null
  const progress = playing ? Math.min(1, (now - t0) / (frame.duration * 1000)) : 0
  const scene = scenes.find((s) => s.id === frame.sceneId)

  return createPortal(
    <div className="fade-in fixed inset-0 z-[70] flex flex-col bg-black text-white">
      <div className="flex h-12 items-center gap-3 px-5 text-[12.5px] text-white/60">
        <span className="font-medium text-white">{project.name}</span>
        <span>· {scene?.heading}</span>
        <div className="flex-1" />
        <span className="font-mono">
          {String(i + 1).padStart(2, '0')}/{String(ordered.length).padStart(2, '0')} · {(elapsedBefore + progress * frame.duration).toFixed(1)}s / {total}s
        </span>
        <button onClick={close} className="flex size-8 items-center justify-center rounded-lg hover:bg-white/10" aria-label="Sair da apresentação">
          <X className="size-4" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-6">
        <div key={frame.id} className="fade-in w-full max-w-[min(1400px,calc((100vh-170px)*16/9))]">
          <FrameImage imageId={frame.imageId} alt={frame.description} className="rounded-md">
            <AnnotationLayer annotations={frame.annotations} />
          </FrameImage>
          {captions && (
            <div className="mt-4 flex items-start gap-4 text-[14px]">
              <span className="shrink-0 rounded bg-white/10 px-2 py-0.5 font-mono text-[11px] text-white/70">{SHOT_LABEL[frame.shot]}</span>
              <p className="flex-1 text-white/85">{frame.description}</p>
              {frame.dialogue && <p className="max-w-sm text-white/60 italic">{frame.dialogue}</p>}
            </div>
          )}
        </div>
      </div>
      <div className="flex h-16 items-center justify-center gap-3">
        <button onClick={() => setI(Math.max(0, i - 1))} className="flex size-10 items-center justify-center rounded-full hover:bg-white/10" aria-label="Anterior">
          <ChevronLeft className="size-5" />
        </button>
        <button onClick={() => setPlaying((p) => !p)} className="flex h-10 items-center gap-2 rounded-full bg-white px-5 text-[13px] font-semibold text-black" aria-label={playing ? 'Pausar' : 'Reproduzir animatic'}>
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          {playing ? 'Pausar' : 'Animatic'}
        </button>
        <button onClick={() => setI(Math.min(ordered.length - 1, i + 1))} className="flex size-10 items-center justify-center rounded-full hover:bg-white/10" aria-label="Próximo">
          <ChevronRight className="size-5" />
        </button>
        <button onClick={() => setCaptions((c) => !c)} className={cx('flex size-10 items-center justify-center rounded-full hover:bg-white/10', !captions && 'opacity-40')} aria-label="Legendas">
          <Subtitles className="size-5" />
        </button>
      </div>
      <div className="flex h-1 gap-0.5 px-0.5 pb-0.5">
        {ordered.map((f, k) => (
          <button key={f.id} onClick={() => setI(k)} className="h-full overflow-hidden rounded-full bg-white/20" style={{ flex: f.duration }} aria-label={`Ir para quadro ${k + 1}`}>
            <span className="block h-full bg-white" style={{ width: k < i ? '100%' : k === i ? `${progress * 100}%` : '0%' }} />
          </button>
        ))}
      </div>
    </div>,
    document.body,
  )
}
