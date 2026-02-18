// Custom HTTPS server for Next.js development with Socket.IO
const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const { Server: SocketIOServer } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Load SSL certificates
const keyPath = path.join(__dirname, 'localhost-key.pem');
const certPath = path.join(__dirname, 'localhost.pem');

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error('✗ HTTPS certificates not found!');
  console.error('  Run: npm run setup:https');
  process.exit(1);
}

const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

app.prepare().then(() => {
  // Create HTTPS server
  const httpsServer = createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO server
  const io = new SocketIOServer(httpsServer, {
    cors: {
      origin: dev ? [
        `https://localhost:${port}`,
        `https://127.0.0.1:${port}`,
        `https://192.168.1.108:${port}`,
        `https://192.168.56.1:${port}`,
        /^https:\/\/192\.168\.\d+\.\d+:\d+$/
      ] : false,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Make io available to Next.js API routes
  const { setIO } = require('./lib/ioServer.js');
  setIO(io);

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Handle joining transaction room
    socket.on('join_tx', (data) => {
      if (data && data.transactionId) {
        const room = `tx:${data.transactionId}`;
        socket.join(room);
        console.log(`[Socket.IO] Client ${socket.id} joined room: ${room}`);
      }
    });

    // Handle joining prices room
    socket.on('join_prices', () => {
      socket.join('prices');
      console.log(`[Socket.IO] Client ${socket.id} joined room: prices`);
    });

    // Handle leaving transaction room
    socket.on('leave_tx', (data) => {
      if (data && data.transactionId) {
        const room = `tx:${data.transactionId}`;
        socket.leave(room);
        console.log(`[Socket.IO] Client ${socket.id} left room: ${room}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  // Start server
  httpsServer.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`✓ HTTPS enabled for development`);
    console.log(`✓ Server ready on https://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}`);
    console.log(`✓ Network access: https://192.168.1.108:${port} or https://192.168.56.1:${port}`);
    console.log(`✓ Socket.IO server initialized`);
  });
});






