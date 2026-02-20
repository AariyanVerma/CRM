// Production server with Socket.IO support
// This integrates Socket.IO with Next.js production server
// Works on any platform (Railway, Render, Hostinger, etc.)
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server: SocketIOServer } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  console.log('✓ Next.js app prepared successfully');
  // Create HTTP server (HTTPS handled by reverse proxy/load balancer)
  const httpServer = createServer(async (req, res) => {
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
  const io = new SocketIOServer(httpServer, {
    cors: {
      // In production, allow requests from your domain
      origin: process.env.NEXT_PUBLIC_APP_URL 
        ? [process.env.NEXT_PUBLIC_APP_URL]
        : true, // Allow all origins if not set (less secure, but works)
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    // Trust proxy for production (if behind reverse proxy)
    allowEIO3: true,
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
  httpServer.listen(port, hostname, (err) => {
    if (err) {
      console.error('✗ Failed to start server:', err);
      process.exit(1);
    }
    console.log(`✓ Production server ready on http://${hostname}:${port}`);
    console.log(`✓ Socket.IO server initialized`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`✓ PORT: ${port}`);
    console.log(`✓ HOSTNAME: ${hostname}`);
  });
}).catch((err) => {
  console.error('✗ Failed to prepare Next.js app:', err);
  process.exit(1);
});

