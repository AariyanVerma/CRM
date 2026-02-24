/**
 * Shared Socket.IO server instance for Next.js API routes
 * This module stores the io instance on globalThis so it can be accessed
 * from Next.js API routes that don't have direct access to the Express server
 */

let io = null;

function setIO(serverInstance) {
  io = serverInstance;
  // Also store on globalThis for safety
  if (typeof globalThis !== 'undefined') {
    globalThis.__io = serverInstance;
  }
}

function getIO() {
  if (!io) {
    // Try to get from globalThis as fallback
    if (typeof globalThis !== 'undefined' && globalThis.__io) {
      io = globalThis.__io;
    } else {
      throw new Error('Socket.IO server not initialized. Make sure server.js has set it up.');
    }
  }
  return io;
}

module.exports = { setIO, getIO };





