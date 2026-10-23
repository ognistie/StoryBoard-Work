export function uid(prefix = ''): string {
  const rnd = crypto.getRandomValues(new Uint8Array(10))
  const s = Array.from(rnd, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 14)
  return prefix ? `${prefix}_${s}` : s
}

/** Short, friendly, git-like identifier (7 hex chars). */
export function shortHash(): string {
  const rnd = crypto.getRandomValues(new Uint8Array(4))
  return Array.from(rnd, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 7)
}

export function token(): string {
  const rnd = crypto.getRandomValues(new Uint8Array(18))
  return btoa(String.fromCharCode(...rnd)).replace(/[+/=]/g, (c) => (c === '+' ? '-' : c === '/' ? '_' : ''))
}
