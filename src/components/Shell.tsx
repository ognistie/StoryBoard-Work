export function Logo({ compact }: { compact?: boolean }) {
  return (
    <a href="#/" className="flex items-center gap-2 rounded-lg" aria-label="Frameline — início">
      <svg viewBox="0 0 32 32" className="size-7 shrink-0">
        <rect width="32" height="32" rx="8" className="fill-fg" />
        <rect x="6" y="9" width="9" height="6" rx="1.5" className="fill-bg" />
        <rect x="17" y="9" width="9" height="6" rx="1.5" className="fill-accent" />
        <rect x="6" y="17" width="9" height="6" rx="1.5" className="fill-bg" opacity=".55" />
        <rect x="17" y="17" width="9" height="6" rx="1.5" className="fill-bg" opacity=".55" />
      </svg>
      {!compact && <span className="text-[15px] font-semibold tracking-tight">Frameline</span>}
    </a>
  )
}

