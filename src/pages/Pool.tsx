import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { nanoid } from 'nanoid'

type RemoteCursor = {
  id: string
  name: string
  x: number
  y: number
}

const WS_URL = (import.meta.env.VITE_WS_URL as string) || 'ws://localhost:3001'

const Pool: React.FC = () => {
  const id = useMemo(() => nanoid(8), [])
  const name = (typeof window !== 'undefined' && localStorage.getItem('person')) || 'Guest'
  const navigate = useNavigate()

  const wsRef = useRef<WebSocket | null>(null)
  const shouldReconnectRef = useRef(true)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [remotes, setRemotes] = useState<Record<string, RemoteCursor>>({})
  // Chat states (kept for potential future use)
  const [messages, setMessages] = useState<{ id: string; name: string; text: string; ts: number }[]>([])
  const seenMessagesRef = useRef<Set<string>>(new Set())
  const [connected, setConnected] = useState(false)
  // Planning poker states
  const [ticket, setTicket] = useState('')
  const [votes, setVotes] = useState<Record<string, { name: string; value: number | null }>>({})
  const [revealed, setRevealed] = useState(false)
  const [participants, setParticipants] = useState<Record<string, string>>({})
  const [hostId, setHostId] = useState<string | null>(null)

  useEffect(() => {
    let stopped = false

    function connect() {
      if (stopped) return
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.addEventListener('open', () => {
        setConnected(true)
        ws.send(JSON.stringify({ type: 'join', id, name }))
      })

      ws.addEventListener('close', () => {
        setConnected(false)
        if (!stopped && shouldReconnectRef.current) setTimeout(connect, 1000)
      })

      ws.addEventListener('message', async (evt) => {
        try {
          const text =
            typeof evt.data === 'string'
              ? evt.data
              : evt.data instanceof Blob
                ? await evt.data.text()
                : String(evt.data)
          const msg = JSON.parse(text)
          if (msg.type === 'cursor') {
            setRemotes((prev) => ({
              ...prev,
              [msg.id]: { id: msg.id, name: msg.name, x: msg.x, y: msg.y },
            }))
          } else if (msg.type === 'leave') {
            setRemotes((prev) => {
              const next = { ...prev }
              delete next[msg.id]
              return next
            })
            setParticipants((p) => {
              const n = { ...p }
              delete n[msg.id]
              return n
            })
          } else if (msg.type === 'presence') {
            setRemotes((prev) => ({
              ...prev,
              [msg.id]: { id: msg.id, name: msg.name, x: 0, y: 0 },
            }))
            setParticipants((p) => ({ ...p, [msg.id]: msg.name }))
          } else if (msg.type === 'roster') {
            const roster: Record<string, string> = {}
            for (const p of msg.participants as Array<{ id: string; name: string }>) {
              roster[p.id] = p.name
            }
            setParticipants(roster)
            setHostId((msg.hostId as string) ?? null)
            if (typeof msg.ticket === 'string') setTicket(msg.ticket)
            if (typeof msg.revealed === 'boolean') setRevealed(msg.revealed)
            if (msg.votes && typeof msg.votes === 'object') {
              const incoming: Record<string, { name: string; value: number | null }> = {}
              for (const [pid, val] of Object.entries(msg.votes as Record<string, number>)) {
                const pname = roster[pid] || participants[pid] || 'User'
                incoming[pid] = { name: pname, value: val as number }
              }
              setVotes(incoming)
            }
          } else if (msg.type === 'host') {
            setHostId((msg.hostId as string) ?? null)
          } else if (msg.type === 'chat') {
            const key = `${msg.id}:${msg.ts}:${msg.text}`
            if (seenMessagesRef.current.has(key)) return
            seenMessagesRef.current.add(key)
            setMessages((m) => [...m, { id: msg.id, name: msg.name, text: msg.text, ts: msg.ts }])
          } else if (msg.type === 'vote') {
            setVotes((v) => ({ ...v, [msg.id]: { name: msg.name, value: msg.value } }))
          } else if (msg.type === 'ticket') {
            setTicket(msg.title as string)
            setVotes({})
            setRevealed(false)
          } else if (msg.type === 'reveal') {
            setRevealed(true)
          } else if (msg.type === 'reset') {
            setVotes({})
            setRevealed(false)
          }
        } catch {}
      })
    }

    connect()

    return () => {
      stopped = true
      shouldReconnectRef.current = false
      wsRef.current?.close()
    }
  }, [id, name])

  useEffect(() => {
    const el = containerRef.current as HTMLDivElement | null
    if (!el) return

    function handleMove(e: MouseEvent) {
      const target = containerRef.current
      if (!target) return
      const rect = target.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      wsRef.current?.send(JSON.stringify({ type: 'cursor', id, name, x, y }))
    }

    el.addEventListener('mousemove', handleMove)
    return () => el.removeEventListener('mousemove', handleMove)
  }, [id, name])

  const handleLogout = () => {
    try {
      localStorage.removeItem('person')
      localStorage.removeItem('pointify:name')
    } catch {}
    // Inform server we're leaving so others can update presence immediately
    try {
      wsRef.current?.send(
        JSON.stringify({ type: 'leave', id, name })
      )
    } catch {}
    // prevent auto-reconnect
    shouldReconnectRef.current = false
    wsRef.current?.close()
    // Clear client-side session state so a rejoin starts fresh
    setTicket('')
    setVotes({})
    setRevealed(false)
    setParticipants({})
    setRemotes({})
    navigate('/')
  }

  const isHost = hostId === id

  return (
    <section ref={containerRef} className="relative min-h-screen py-12 bg-white sm:py-16 lg:py-20">
      <div className="absolute inset-0">
        <img
          className="object-cover w-full h-full"
          src="https://landingfoliocom.imgix.net/store/collection/clarity-blog/images/hero/5/grid-pattern.png"
          alt=""
        />
      </div>

      <div className="relative px-4 mx-auto sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex justify-end">
          <button
            onClick={handleLogout}
            className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white transition-all duration-200 bg-gray-900 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
          >
            Logout
          </button>
        </div>
        <div className="max-w-3xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl lg:text-5xl">Point together in real‑time</h1>
            <p className="max-w-xl mx-auto mt-4 text-base leading-7 text-gray-500">
              You are sharing your cursor as <span className="font-semibold text-gray-900">{name}</span>.
              Open this page in multiple windows to collaborate live.
            </p>
            <div className="mt-2">
              <span className={connected ? 'inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700' : 'inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700'}>
                {connected ? 'Connected' : 'Disconnected (retrying...)'}
              </span>
            </div>
          </div>

          {/* Ticket + Voting */}
          <div className="p-4 mt-10 bg-white/80 border border-gray-200 rounded-2xl shadow-sm backdrop-blur sm:p-6">
            <div className="sm:flex sm:items-center sm:justify-between">
              <input
                value={ticket}
                onChange={(e) => setTicket(e.target.value)}
                placeholder="Ticket title or JIRA key..."
                disabled={!isHost}
                readOnly={!isHost}
                className={
                  (isHost ? '' : 'bg-gray-100 cursor-not-allowed ') +
                  'block w-full sm:max-w-md px-4 py-3 text-base text-gray-900 placeholder-gray-500 border border-gray-300 rounded-xl sm:text-sm focus:ring-gray-900 focus:border-gray-900'
                }
              />
              <div className="flex items-center gap-3 mt-3 sm:mt-0">
                <button
                  onClick={() => wsRef.current?.send(JSON.stringify({ type: 'ticket', id, title: ticket }))}
                  className={(isHost ? 'bg-gray-900 hover:bg-gray-700 ' : 'bg-gray-300 cursor-not-allowed ') + 'px-4 py-2 text-sm font-semibold text-white rounded-lg'}
                  disabled={!isHost}
                >
                  Set Ticket
                </button>
                <button
                  onClick={() => wsRef.current?.send(JSON.stringify({ type: 'reveal', id }))}
                  className={(isHost ? 'bg-indigo-600 hover:bg-indigo-700 ' : 'bg-indigo-300 cursor-not-allowed ') + 'px-4 py-2 text-sm font-semibold text-white rounded-lg'}
                  disabled={!isHost}
                >
                  Reveal
                </button>
                <button
                  onClick={() => wsRef.current?.send(JSON.stringify({ type: 'reset', id }))}
                  className={(isHost ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 ' : 'bg-gray-200 text-gray-400 cursor-not-allowed ') + 'px-4 py-2 text-sm font-semibold rounded-lg'}
                  disabled={!isHost}
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-8 sm:gap-6">
              {[3, 5, 8, 13].map((v) => {
                const mine = votes[id]?.value === v
                return (
                  <button
                    key={v}
                    onClick={() => wsRef.current?.send(JSON.stringify({ type: 'vote', id, name, value: v }))}
                    className={
                      (mine ? 'bg-indigo-600 text-white ' : 'bg-white text-gray-900 ') +
                      'w-full h-28 rounded-2xl border border-gray-200 shadow hover:shadow-md text-3xl font-bold'
                    }
                  >
                    {v}
                  </button>
                )
              })}
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-500">Participants</h3>
                {hostId === id && (
                  <div className="text-xs text-gray-500">You are the host</div>
                )}
              </div>
              <ul className="grid grid-cols-2 gap-3 mt-3 sm:grid-cols-3">
                {Object.entries(participants).map(([pid, pname]) => {
                  const vote = votes[pid]?.value
                  return (
                    <li key={pid} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-sm font-medium text-gray-900">{pname}{hostId === pid ? ' (Host)' : ''}</span>
                      <span className="text-sm font-semibold text-gray-700">
                        {revealed ? (vote ?? '—') : (vote != null ? 'Voted' : '—')}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {Object.values(remotes).map((c) => (
        <div
          key={c.id}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: c.x, top: c.y }}
        >
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 2l7 18 2-7 7-2L3 2z" />
            </svg>
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-indigo-600 text-white">{c.name}</span>
          </div>
        </div>
      ))}
    </section>
  )
}

export default Pool

