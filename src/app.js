import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io'; // ✅ Fixed import
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import connectDB from './config/db.js';
import apiRouter from './routes/apiRoutes.js';
import { globalErrorHandler } from './middlewares/error.middleware.js';
import { getConnectedUsers, setupSocketHandlers } from './socket/socketHandlers.js';
import { initializeSocketIO } from './socket/socket.setup.js';


dotenv.config(); // Load env variables

const app = express();
const httpServer = createServer(app); // Create HTTP server

// ✅ Socket.IO setup with CORS
// const io = new Server(httpServer, {
//   cors: {
//     origin: process.env.CLIENT_URL || 'http://localhost:5173',
//     credentials: true,
//     methods: ['GET', 'POST'],
//   },
//   transports: ['websocket', 'polling'],
//   allowEIO3: true,
// });

const io = initializeSocketIO(httpServer);

// ✅ CORS middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ✅ Removed duplicate express.json()
app.use(cookieParser());

// // Make io and connected users available to routes via middleware
// app.use((req, res, next) => {
//   req.io = io;
//   req.connectedUsers = getConnectedUsers(); // ✅ This function needs to be imported/defined
//   next();
// });

// Make io accessible in routes (optional, for fallback scenarios)
app.use((req, res, next) => {
  req.io = io;
  next();
});


// Root route
app.get('/', (req, res) => {
  res.json({
    message: '✅ Chat Server with Socket.IO Running',
    timestamp: new Date().toISOString(),
  });
});

// Online users count endpoint
app.get('/onlineCount', (req, res) => {
  try {
    const onlineCount = getConnectedUsers().size;
    res.json({
      message: '✅ Chat Server Running',
      onlineUsers: onlineCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // ✅ Handle case when socket handlers aren't set up yet
    res.json({
      message: '✅ Chat Server Running',
      onlineUsers: 0,
      timestamp: new Date().toISOString(),
    });
  }
});

// API routes
app.use('/api', apiRouter);

// Health check
app.get('/socketHealth', (req, res) => {
  res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      socketConnected: io.engine.clientsCount
  });
});


// Error handling middleware (should be last)
app.use(globalErrorHandler);

// ✅ Setup Socket.IO handlers
setupSocketHandlers(io);

// Start server
const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    await connectDB();
    httpServer.listen(PORT, () => {
      // ✅ Use httpServer, not app
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.IO ready for connections`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();


// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
  });
});


export default app;