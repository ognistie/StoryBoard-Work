import { useEffect, useState } from 'react'
import { Toaster } from './components/ui'
import { seedDemo } from './lib/seed'
import { Home } from './views/Home'
import { SketchLab } from './views/SketchLab'
import { Workspace } from './views/Workspace'

export type Route = { name: 'home' } | { name: 'project'; id: string } | { name: 'lab' }

function parse(hash: string): Route {
  const h = hash.replace(/^#\/?/, '')
  const [a, b] = h.split('/')
  if (a === 'p' && b) return { name: 'project', id: b }
  if (a === 'lab' && import.meta.env.DEV) return { name: 'lab' }
  return { name: 'home' }
}

export function navigate(path: string) {
  location.hash = path
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parse(location.hash))
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const on = () => setRoute(parse(location.hash))
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  useEffect(() => {
    seedDemo()
      .catch((e) => console.error('[seed]', e))
      .finally(() => setReady(true))
  }, [])

  if (!ready)
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-muted">
        <span className="animate-pulse">Preparando seu workspace…</span>
      </div>
    )

  return (
    <>
      {route.name === 'home' && <Home />}
      {route.name === 'project' && <Workspace key={route.id} projectId={route.id} />}
      {route.name === 'lab' && <SketchLab />}
      <Toaster />
    </>
  )
}
