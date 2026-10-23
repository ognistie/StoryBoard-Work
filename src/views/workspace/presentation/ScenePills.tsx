import { cx } from '../../../components/ui'
import type { Frame } from '../../../lib/types'
import { MOVE_TAG, SHOT_TAG } from '../scene'

const LOOK = {
  desktop: {
    row: 'gap-2',
    pill: 'h-7 gap-1.5 rounded-[14px] border-[#FFFFFF1F] bg-[#FFFFFF14] px-3 text-[12px] leading-4 text-[#FFFFFFD9]',
  },
  phone: {
    row: 'gap-1.5',
    pill: 'h-[26px] gap-[5px] rounded-[13px] border-[#FFFFFF2E] bg-[#FFFFFF24] px-2.5 text-[11px] leading-[14px] text-white',
  },
}

/** Shot, camera (red dot) and duration. */
export function ScenePills({ frame, look }: { frame: Frame; look: keyof typeof LOOK }) {
  const { row, pill } = LOOK[look]
  const className = cx('flex shrink-0 items-center border font-semibold tracking-[0.04em]', pill)
  return (
    <div className={cx('flex flex-wrap items-center', row)}>
      <span className={className}>{SHOT_TAG[frame.shot]}</span>
      <span className={className}>
        <span className="size-1.5 shrink-0 rounded-[3px] bg-[#FF453A]" />
        {MOVE_TAG[frame.movement]}
      </span>
      <span className={className}>{frame.duration}s</span>
    </div>
  )
}
