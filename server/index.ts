/* eslint-disable no-console */
import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'node:http'

type ClientMeta = { id: string; name: string }

const PORT = Number(process.env.PORT || 3001)
const server = createServer((req, res) => {
  if (!req || !res) return
  if (req.url === '/healthz') {
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end('ok')
    return
  }
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end('OK')
})
const wss = new WebSocketServer({ server })

const clients = new Map<WebSocket, ClientMeta>()
let hostId: string | null = null
let currentTicket: string = ''
let revealed: boolean = false
const votes: Record<string, number | null> = {}

function broadcast(sender: WebSocket, dataObj: unknown): void {
  const data = JSON.stringify(dataObj)
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN && client !== sender) {
      client.send(data)
    }
  }
}

function broadcastAll(dataObj: unknown): void {
  const data = JSON.stringify(dataObj)
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  }
}

wss.on('connection', (ws: WebSocket) => {
  console.log('[ws] client connected')
  ws.on('message', (raw: WebSocket.RawData) => {
    let msg: any
    try {
      const text = typeof raw === 'string' ? raw : raw.toString()
      msg = JSON.parse(text)
    } catch {
      return
    }

    if (msg.type === 'join') {
      const id = msg.id as string
      const name = msg.name as string
      clients.set(ws, { id, name })

      // Assign host if none OR stale (host not among connected clients)
      if (!hostId || !Array.from(clients.values()).some((p) => p.id === hostId)) {
        hostId = id
      }

      // Send snapshot/roster to the new client
      const participants = Array.from(clients.values())
      ws.send(
        JSON.stringify({
          type: 'roster',
          participants,
          hostId,
          ticket: currentTicket,
          revealed,
          votes,
        })
      )

      // Acknowledge join
      ws.send(JSON.stringify({ type: 'joined', id }))

      // Notify others about the new presence
      broadcast(ws, { type: 'presence', id, name })
      return
    }

    if (msg.type === 'cursor') {
      broadcast(ws, { type: 'cursor', id: msg.id, name: msg.name, x: msg.x, y: msg.y })
      return
    }

    if (msg.type === 'chat') {
      broadcastAll({ type: 'chat', id: msg.id, name: msg.name, text: msg.text, ts: msg.ts })
      return
    }

    if (msg.type === 'leave') {
      const existing = clients.get(ws)
      const id = (existing?.id ?? msg.id) as string
      // Remove vote if any
      if (id) delete votes[id]
      // Remove from clients and notify others
      clients.delete(ws)
      broadcast(ws, { type: 'leave', id })
      // Reassign host if needed
      if (hostId === id) {
        const next = clients.values().next().value as ClientMeta | undefined
        hostId = next ? next.id : null
        broadcastAll({ type: 'host', hostId })
      }
      // If room is now empty, reset board state
      if (clients.size === 0) {
        hostId = null
        currentTicket = ''
        revealed = false
        for (const key of Object.keys(votes)) delete votes[key]
      }
      try {
        ws.close()
      } catch {}
      return
    }

    // Planning poker events
    if (msg.type === 'vote') {
      votes[msg.id as string] = msg.value as number
      broadcastAll({ type: 'vote', id: msg.id, name: msg.name, value: msg.value })
      return
    }
    if (msg.type === 'ticket') {
      if (msg.id && msg.id !== hostId) return
      currentTicket = String(msg.title ?? '')
      revealed = false
      for (const key of Object.keys(votes)) delete votes[key]
      broadcastAll({ type: 'ticket', title: currentTicket })
      return
    }
    if (msg.type === 'reveal') {
      if (msg.id && msg.id !== hostId) return
      revealed = true
      broadcastAll({ type: 'reveal' })
      return
    }
    if (msg.type === 'reset') {
      if (msg.id && msg.id !== hostId) return
      revealed = false
      for (const key of Object.keys(votes)) delete votes[key]
      broadcastAll({ type: 'reset' })
      return
    }

    if (msg.type === 'host') {
      // Only current host can transfer host role
      if ((msg.id as string) !== hostId) return
      const nextId = String(msg.targetId ?? msg.hostId ?? '')
      if (!nextId) return
      hostId = nextId
      broadcastAll({ type: 'host', hostId })
      return
    }
  })

  ws.on('close', () => {
    const meta = clients.get(ws)
    if (meta) {
      // Remove vote if any
      delete votes[meta.id]
      broadcast(ws, { type: 'leave', id: meta.id })
      clients.delete(ws)

      // Reassign host if needed
      if (hostId === meta.id) {
        const next = clients.values().next().value as ClientMeta | undefined
        hostId = next ? next.id : null
        broadcastAll({ type: 'host', hostId })
      }
    }
    // If room is now empty, reset board state (handle both meta and non-meta paths)
    if (clients.size === 0) {
      hostId = null
      currentTicket = ''
      revealed = false
      for (const key of Object.keys(votes)) delete votes[key]
    }
  })
})

server.listen(PORT, () => {
  console.log(`[ws] Cursor server listening on ws://localhost:${PORT}`)
})


