export type DiffPart = { type: 'same' | 'add' | 'del'; text: string }

/** Word-level diff (LCS). Good enough for prompts and descriptions (< ~2k words). */
export function diffWords(a: string, b: string): DiffPart[] {
  const A = a.split(/(\s+)/).filter(Boolean)
  const B = b.split(/(\s+)/).filter(Boolean)
  const n = A.length
  const m = B.length
  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const out: DiffPart[] = []
  const push = (type: DiffPart['type'], text: string) => {
    const last = out.at(-1)
    if (last && last.type === type) last.text += text
    else out.push({ type, text })
  }
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      push('same', A[i])
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) push('del', A[i++])
    else push('add', B[j++])
  }
  while (i < n) push('del', A[i++])
  while (j < m) push('add', B[j++])
  return out
}
