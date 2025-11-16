import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import apiRouter from './routes/apiRoutes.js';
import { globalErrorHandler } from './middlewares/error.middleware.js';
import { setupSocket } from './socket/socketHandlers.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Multiple allowed origins
const allowedOrigins = process.env.CLIENT_URLS
  ? process.env.CLIENT_URLS.split(",")
  : ["http://localhost:5173"];

// ✅ Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS (Socket)'));
    },
    credentials: true,
  },
});

// ✅ Setup socket handlers
setupSocket(io);

// ----------------- EXPRESS MIDDLEWARE -----------------
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS (HTTP)'));
    },
    credentials: true,
  })
);


// Preflight (OPTIONS)
app.options("*", cors({
  origin: allowedOrigins,
  credentials: true
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ----------------- ROUTES -----------------
app.get('/', (req, res) => {
  res.json({
    message: '✅ Chat Server with Socket.IO Running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', apiRouter);

// ----------------- ERROR HANDLER -----------------
app.use(globalErrorHandler);

// ----------------- START SERVER -----------------
const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    await connectDB();
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.IO running`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

export default app;
