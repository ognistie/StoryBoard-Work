import { useEffect, useState } from 'react'
import { Toaster } from './components/ui'
import { recoverOrphanJobs } from './lib/jobs'
import { seedDemo, upgradeDemoImages } from './lib/seed'
import { Dashboard } from './views/Dashboard'
import { JoinView } from './views/JoinView'
import { SketchLab } from './views/SketchLab'
import { Workspace } from './views/Workspace'

export type Route = { name: 'dashboard' } | { name: 'project'; id: string } | { name: 'join'; token: string } | { name: 'lab' }

function parse(hash: string): Route {
  const h = hash.replace(/^#\/?/, '')
  const [a, b] = h.split('/')
  if (a === 'p' && b) return { name: 'project', id: b }
  if (a === 'join' && b) return { name: 'join', token: b }
  if (a === 'lab' && import.meta.env.DEV) return { name: 'lab' }
  return { name: 'dashboard' }
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
      .then(() => upgradeDemoImages())
      .then((n) => n && console.info(`[seed] ${n} imagens de demonstração redesenhadas no novo estilo`))
      .catch((e) => console.error('[seed]', e))
      .finally(() => {
        setReady(true)
        void recoverOrphanJobs()
      })
  }, [])

  if (!ready)
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-muted">
        <span className="animate-pulse">Preparando seu workspace…</span>
      </div>
    )

  return (
    <>
      {route.name === 'dashboard' && <Dashboard />}
      {route.name === 'project' && <Workspace key={route.id} projectId={route.id} />}
      {route.name === 'join' && <JoinView token={route.token} />}
      {route.name === 'lab' && <SketchLab />}
      <Toaster />
    </>
  )
}
