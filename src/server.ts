import { createServer } from 'http';
import { Server } from 'socket.io';
import { createApp } from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { initSocket } from './socket';

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Create Express app
    const app = createApp();

    // Create HTTP and Socket.IO servers
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: env.CORS_ORIGIN,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    // Initialize Socket.IO
    initSocket(io);

    // Start server
    httpServer.listen(env.PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   Dev-Collab Backend (MongoDB)         ║
║   Server running on port ${env.PORT}         ║
║   Environment: ${env.NODE_ENV}          ║
║   MongoDB: Connected                   ║
║   Socket.IO: Initialized               ║
╚════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully...');
      httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
