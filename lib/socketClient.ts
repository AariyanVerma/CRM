/**
 * Socket.IO client singleton
 * Ensures only one connection per browser tab
 */

import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    // Determine the server URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'https:'
    const hostname = window.location.hostname
    // In production, don't include port (uses default 443 for HTTPS, 80 for HTTP)
    // Only include port in development (localhost with custom port)
    const isDevelopment = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')
    const port = isDevelopment ? (window.location.port || '3000') : ''
    const serverUrl = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`

    socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      autoConnect: true,
    })

    socket.on('connect', () => {
      console.log('[Socket.IO Client] Connected to server')
    })

    socket.on('disconnect', () => {
      console.log('[Socket.IO Client] Disconnected from server')
    })

    socket.on('connect_error', (error) => {
      console.error('[Socket.IO Client] Connection error:', error)
    })
  }

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}



