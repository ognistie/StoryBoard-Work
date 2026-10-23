import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from './db'
import { roleIn, useSession } from './session'

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

export function useProjectData(projectId: string) {
  const project = useLiveQuery(() => db.projects.get(projectId), [projectId])
  const scenes = useLiveQuery(() => db.scenes.where('projectId').equals(projectId).sortBy('order'), [projectId]) ?? []
  const frames = useLiveQuery(() => db.frames.where('projectId').equals(projectId).sortBy('order'), [projectId]) ?? []
  const assets = useLiveQuery(() => db.assets.where('projectId').equals(projectId).toArray(), [projectId]) ?? []
  const comments = useLiveQuery(() => db.comments.where('projectId').equals(projectId).sortBy('createdAt'), [projectId]) ?? []
  const jobs = useLiveQuery(() => db.jobs.where('projectId').equals(projectId).sortBy('createdAt'), [projectId]) ?? []
  const proposals = useLiveQuery(() => db.proposals.where('projectId').equals(projectId).toArray(), [projectId]) ?? []
  return { project, scenes, frames, assets, comments, jobs, proposals, loading: project === undefined }
}

export function useRole(projectId?: string) {
  const userId = useSession((s) => s.userId)
  const project = useLiveQuery(() => (projectId ? db.projects.get(projectId) : undefined), [projectId])
  return roleIn(project, userId)
}

// ---------------------------------------------------------------- misc

export function useHotkeys(handler: (e: KeyboardEvent) => void, deps: unknown[]) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      handler(e)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

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

export function formatDate(ts: number) {
  return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function useNow(interval = 30_000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(t)
  }, [interval])
  return now
}
