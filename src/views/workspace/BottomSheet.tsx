import { cx } from '../../components/ui'

/** A white sheet anchored to the bottom edge, with a grabber. Tapping the grabber calls `onGrab`. */
export function BottomSheet({ height, onGrab, grabLabel, className, children }: { height: number | string; onGrab: () => void; grabLabel: string; className?: string; children: React.ReactNode }) {
  return (
    <section
      style={{ height }}
      className={cx(
        'absolute bottom-0 flex flex-col overflow-clip rounded-t-[20px] border-x border-t border-[#E4E4E7] bg-white shadow-[0_-1px_2px_#0000000A,0_-8px_32px_#00000014] transition-[height] duration-300 ease-out',
        className,
      )}
    >
      <button aria-label={grabLabel} onClick={onGrab} className="flex w-full shrink-0 justify-center pt-2 pb-0.5">
        <span className="h-[5px] w-9 rounded-[3px] bg-[#D4D4D8]" />
      </button>
      {children}
    </section>
  )
}
