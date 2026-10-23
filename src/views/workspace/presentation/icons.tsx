// Icons from the Paper design, screens "02 — Canvas" and "03 — Apresentação".

export function PlayIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="shrink-0">
      <path d="M3.5 2.2v9.6c0 .5.55.8.97.53l7.4-4.8a.63.63 0 0 0 0-1.06l-7.4-4.8a.63.63 0 0 0-.97.53z" fill={color} />
    </svg>
  )
}

export function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="shrink-0">
      <rect x="2.5" y="2" width="3" height="10" rx="1" fill="#09090B" />
      <rect x="8.5" y="2" width="3" height="10" rx="1" fill="#09090B" />
    </svg>
  )
}

export function SkipIcon({ dir }: { dir: 'back' | 'forward' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="shrink-0">
      {dir === 'back' ? (
        <>
          <path d="M3 3v10" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M13 3.6v8.8c0 .5-.55.8-.97.53L5.2 8.53a.63.63 0 0 1 0-1.06l6.83-4.4c.42-.27.97.03.97.53z" fill="#FFFFFF" />
        </>
      ) : (
        <>
          <path d="M13 3v10" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M3 3.6v8.8c0 .5.55.8.97.53l6.83-4.4a.63.63 0 0 0 0-1.06L3.97 3.07C3.55 2.8 3 3.1 3 3.6z" fill="#FFFFFF" />
        </>
      )}
    </svg>
  )
}

export function LoopIcon({ on }: { on: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="shrink-0">
      <path
        d="M2.5 7V6a2 2 0 0 1 2-2h8.5M11 2l2 2-2 2M13.5 9v1a2 2 0 0 1-2 2H3M5 14l-2-2 2-2"
        fill="none"
        stroke={on ? '#FFFFFF' : '#FFFFFF99'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CloseIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden className="shrink-0">
      <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
