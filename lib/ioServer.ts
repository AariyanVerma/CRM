/**
 * Shared Socket.IO server instance for Next.js API routes
 * This module stores the io instance on globalThis so it can be accessed
 * from Next.js API routes that don't have direct access to the Express server
 */

import { Server as SocketIOServer } from 'socket.io'
import type { Server as HTTPServer } from 'https'

let io: SocketIOServer | null = null

export function setIO(serverInstance: SocketIOServer) {
  io = serverInstance
  // Also store on globalThis for safety
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).__io = serverInstance
  }
}

export function getIO(): SocketIOServer {
  if (!io) {
    // Try to get from globalThis as fallback
    if (typeof globalThis !== 'undefined' && (globalThis as any).__io) {
      io = (globalThis as any).__io
    } else {
      throw new Error('Socket.IO server not initialized. Make sure server.js has set it up.')
    }
  }
  // TypeScript doesn't understand that io is not null after the check above
  // Since we throw an error if io is null, we can safely assert it's not null here
  return io as SocketIOServer
}



