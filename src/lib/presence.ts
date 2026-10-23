import { create } from 'zustand'
import { uid } from './ids'

/**
 * Lightweight presence between tabs of the same browser (BroadcastChannel).
 * Shows who else is in the project and which frame they are looking at.
 * Swap for a WebSocket/Realtime channel when a server exists.
 */

export interface Peer {
  tabId: string
  userId: string
  projectId?: string
  frameId?: string
  editing?: boolean
  at: number
}

export interface Notice {
  id: string
  projectId: string
  userId: string
  text: string
  frameId?: string
}

const TAB = uid('tab')
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('frameline-presence') : null

interface PresenceState {
  peers: Record<string, Peer>
  me: Omit<Peer, 'tabId' | 'at'>
  update: (patch: Partial<Omit<Peer, 'tabId' | 'at'>>) => void
}

export const usePresence = create<PresenceState>((set, get) => ({
  peers: {},
  me: { userId: '' },
  update: (patch) => {
    set({ me: { ...get().me, ...patch } })
    beat()
  },
}))

type Msg = { type: 'beat'; peer: Peer } | { type: 'bye'; tabId: string } | { type: 'notice'; notice: Notice }

const noticeListeners = new Set<(n: Notice) => void>()
export const onNotice = (fn: (n: Notice) => void) => {
  noticeListeners.add(fn)
  return () => {
    noticeListeners.delete(fn)
  }
}

/** Notify other tabs (e.g. "Júlia comentou no Quadro 3"). */
export function broadcastNotice(n: Omit<Notice, 'id'>) {
  channel?.postMessage({ type: 'notice', notice: { ...n, id: uid('n') } } satisfies Msg)
}

function beat() {
  const { me } = usePresence.getState()
  channel?.postMessage({ type: 'beat', peer: { ...me, tabId: TAB, at: Date.now() } } satisfies Msg)
}

if (channel) {
  channel.onmessage = (ev: MessageEvent<Msg>) => {
    const m = ev.data
    if (m.type === 'beat') usePresence.setState((s) => ({ peers: { ...s.peers, [m.peer.tabId]: m.peer } }))
    else if (m.type === 'bye')
      usePresence.setState((s) => {
        const peers = { ...s.peers }
        delete peers[m.tabId]
        return { peers }
      })
    else if (m.type === 'notice') noticeListeners.forEach((fn) => fn(m.notice))
  }
  setInterval(() => {
    beat()
    const cutoff = Date.now() - 8000
    const peers = usePresence.getState().peers
    if (Object.values(peers).some((p) => p.at < cutoff))
      usePresence.setState({ peers: Object.fromEntries(Object.entries(peers).filter(([, p]) => p.at >= cutoff)) })
  }, 3000)
  window.addEventListener('beforeunload', () => channel.postMessage({ type: 'bye', tabId: TAB } satisfies Msg))
}
