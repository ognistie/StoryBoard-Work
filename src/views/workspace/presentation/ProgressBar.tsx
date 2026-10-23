import { cx } from '../../../components/ui'
import type { Frame } from '../../../lib/types'
import { PROGRESS_VAR } from './usePlayback'

const LOOK = {
  desktop: { gap: 'gap-1.5', played: 'bg-[#FFFFFFE6]', ahead: 'bg-[#FFFFFF33]' },
  phone: { gap: 'gap-1', played: 'bg-[#FFFFFFF2]', ahead: 'bg-[#FFFFFF4D]' },
}

/** One segment per scene, as wide as its duration. The current one fills as it plays. */
export function ProgressBar({ frames, index, look }: { frames: Frame[]; index: number; look: keyof typeof LOOK }) {
  const { gap, played, ahead } = LOOK[look]
  return (
    <div aria-hidden className={cx('flex h-[3px] shrink-0', gap)}>
      {frames.map((f, i) => (
        <div key={f.id} className={cx('h-full basis-0 overflow-clip rounded-[2px]', i < index ? played : ahead)} style={{ flexGrow: f.duration }}>
          {i === index && <div className="h-full bg-white" style={{ width: `calc(var(${PROGRESS_VAR}) * 100%)` }} />}
        </div>
      ))}
    </div>
  )
}
