


let io = null;

function setIO(serverInstance) {
  io = serverInstance;
  if (typeof globalThis !== 'undefined') {
    globalThis.__io = serverInstance;
  }
}

function getIO() {
  if (!io) {
    if (typeof globalThis !== 'undefined' && globalThis.__io) {
      io = globalThis.__io;
    } else {
      throw new Error('Socket.IO server not initialized. Make sure server.js has set it up.');
    }
  }
  return io;
}

module.exports = { setIO, getIO };





