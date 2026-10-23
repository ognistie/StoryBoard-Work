import { useEffect, useState } from 'react'
import { db } from './db'

// ---------------------------------------------------------------- image object URLs (ref-counted cache)

const urlCache = new Map<string, { url: string; refs: number; timer?: ReturnType<typeof setTimeout> }>()

export function useImageUrl(imageId?: string): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() => (imageId ? urlCache.get(imageId)?.url : undefined))
  useEffect(() => {
    if (!imageId) {
      setUrl(undefined)
      return
    }
    let cancelled = false
    const hit = urlCache.get(imageId)
    if (hit) {
      hit.refs++
      if (hit.timer) clearTimeout(hit.timer)
      setUrl(hit.url)
    } else {
      void db.images.get(imageId).then((img) => {
        if (cancelled || !img) return
        const existing = urlCache.get(imageId)
        if (existing) {
          existing.refs++
          setUrl(existing.url)
          return
        }
        const u = URL.createObjectURL(img.blob)
        urlCache.set(imageId, { url: u, refs: 1 })
        setUrl(u)
      })
    }
    return () => {
      cancelled = true
      const e = urlCache.get(imageId)
      if (!e) return
      e.refs--
      if (e.refs <= 0) {
        e.timer = setTimeout(() => {
          if (e.refs <= 0) {
            URL.revokeObjectURL(e.url)
            urlCache.delete(imageId)
          }
        }, 30_000)
      }
    }
  }, [imageId])
  return url
}

// ---------------------------------------------------------------- project data

// ---------------------------------------------------------------- misc

export function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 45) return 'agora'
  const m = Math.round(s / 60)
  if (m < 60) return `há ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  if (d === 1) return 'ontem'
  if (d < 30) return `há ${d} ${d === 1 ? 'dia' : 'dias'}`
  return new Date(ts).toLocaleDateString('pt-BR')
}

