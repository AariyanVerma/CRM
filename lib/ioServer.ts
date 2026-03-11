import { Server as SocketIOServer } from 'socket.io'
import type { Server as HTTPServer } from 'https'

let io: SocketIOServer | null = null

export function setIO(serverInstance: SocketIOServer) {
  io = serverInstance

  if (typeof globalThis !== 'undefined') {
    (globalThis as any).__io = serverInstance
  }
}

export function getIO(): SocketIOServer {
  if (!io) {

    if (typeof globalThis !== 'undefined' && (globalThis as any).__io) {
      io = (globalThis as any).__io
    } else {
      throw new Error('Socket.IO server not initialized. Make sure server.js has set it up.')
    }
  }

  return io as SocketIOServer
}

