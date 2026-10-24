import { useEffect, useState } from 'react'
import { AuthModal } from './components/AuthModal'
import { Toaster } from './components/ui'
import { refreshAuth } from './lib/collab/auth'
import { refreshRemote } from './lib/collab/remote'
import { checkHealth } from './lib/health'
import { seedDemo } from './lib/seed'
import { Home } from './views/Home'
import { InviteView } from './views/InviteView'
import { SketchLab } from './views/SketchLab'
import { Workspace } from './views/Workspace'

export type Route = { name: 'home' } | { name: 'project'; id: string } | { name: 'invite'; token: string } | { name: 'lab' }

function parse(hash: string): Route {
  const h = hash.replace(/^#\/?/, '')
  const [a, b] = h.split('/')
  if (a === 'p' && b) return { name: 'project', id: b }
  if (a === 'convite' && b) return { name: 'invite', token: b }
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
    void checkHealth()
    // The account must be known before the first render: it decides which projects show.
    // Seed first: its migration hands old local projects to the guest, and signing in then claims them.
    seedDemo()
      .catch((e) => console.error('[seed]', e))
      .then(refreshAuth)
      .then(() => void refreshRemote().catch(() => undefined))
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
      {route.name === 'invite' && <InviteView token={route.token} />}
      {route.name === 'lab' && <SketchLab />}
      <AuthModal />
      <Toaster />
    </>
  )
}
