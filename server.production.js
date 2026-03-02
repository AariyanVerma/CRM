const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server: SocketIOServer } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

process.on('uncaughtException', (err) => {
  console.error('✗ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('✗ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('🚀 Starting production server...');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`   PORT (from env): ${process.env.PORT || 'not set'}`);
console.log(`   PORT (parsed): ${port}`);
console.log(`   HOSTNAME: ${hostname}`);
console.log(`   Process PID: ${process.pid}`);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  console.log('✓ Next.js app prepared successfully');
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      
      if (parsedUrl.pathname === '/health' || parsedUrl.pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
        return;
      }
      
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL 
        ? [process.env.NEXT_PUBLIC_APP_URL]
        : true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
  });

  const { setIO } = require('./lib/ioServer.js');
  setIO(io);

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('join_tx', (data) => {
      if (data && data.transactionId) {
        const room = `tx:${data.transactionId}`;
        socket.join(room);
        console.log(`[Socket.IO] Client ${socket.id} joined room: ${room}`);
      }
    });

    socket.on('join_prices', () => {
      socket.join('prices');
      console.log(`[Socket.IO] Client ${socket.id} joined room: prices`);
    });

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

  httpServer.listen(port, hostname, () => {
    console.log(`✓ Production server ready on http://${hostname}:${port}`);
    console.log(`✓ Socket.IO server initialized`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`✓ PORT: ${port}`);
    console.log(`✓ HOSTNAME: ${hostname}`);
    console.log(`✓ Server is listening and ready to accept connections`);
    
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  });
  
  httpServer.on('error', (err) => {
    console.error('✗ HTTP Server error:', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use`);
    }
    process.exit(1);
  });
}).catch((err) => {
  console.error('✗ Failed to prepare Next.js app:', err);
  process.exit(1);
});

