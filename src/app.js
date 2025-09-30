import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import apiRouter from './routes/apiRoutes.js';
import { globalErrorHandler } from './middlewares/error.middleware.js';

// Models



import { Chat } from './models/chat.model.js';
import { Message } from './models/message.model.js';
import { ConnectionRequest } from './models/connectionRequest.model.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// ✅ Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// ----------------- ONLINE USERS MAP -----------------
/**
 * Structure:
 * Map<userId, socketId>
 */
const onlineUsers = new Map();

// ----------------- SOCKET HANDLERS -----------------
io.on('connection', (socket) => {
  console.log('🔗 Socket connected:', socket.id);

  // ✅ Register user when they log in
  socket.on('register', (userId) => {
    onlineUsers.set(userId.toString(), socket.id);
    console.log(`✅ User ${userId} registered on socket ${socket.id}`);
  });

  // ✅ Handle sending messages
  socket.on('send_message', async ({ senderId, receiverId, text }) => {
    try {
      // 1. Ensure the users are connected (accepted connection)
      const isConnected = await ConnectionRequest.findOne({
        $or: [
          { fromUserId: senderId, toUserId: receiverId, status: 'accepted' },
          { fromUserId: receiverId, toUserId: senderId, status: 'accepted' },
        ],
      });

      if (!isConnected) {
        return socket.emit('error_message', {
          error: 'You can only send messages to connected users.',
        });
      }

      // 2. Find or create chat
      const chat = await Chat.findOrCreateChat(senderId, receiverId);

      // 3. Save message
      const newMessage = await Message.create({
        chatId: chat._id,
        senderId,
        receiverId,
        text,
      });

      // 4. Update chat activity
      await chat.updateActivity(newMessage._id);

      // 5. Emit to receiver if online
      const receiverSocketId = onlineUsers.get(receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive_message', {
          chatId: chat._id,
          ...newMessage.toObject(),
        });
      }

      // 6. Send confirmation to sender
      socket.emit('message_sent', {
        chatId: chat._id,
        ...newMessage.toObject(),
      });
    } catch (error) {
      console.error('❌ Error sending message:', error.message);
      socket.emit('error_message', { error: 'Failed to send message' });
    }
  });

  // ✅ Mark messages as read
  socket.on('mark_as_read', async ({ chatId, receiverId }) => {
    try {
      await Message.markAsRead(chatId, receiverId);
      socket.emit('messages_read', { chatId });
    } catch (error) {
      console.error('❌ Error marking messages as read:', error.message);
    }
  });

  // ✅ Handle disconnection
  socket.on('disconnect', () => {
    for (const [userId, sId] of onlineUsers.entries()) {
      if (sId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`❌ User ${userId} disconnected`);
        break;
      }
    }
  });
});

// ----------------- EXPRESS MIDDLEWARE -----------------
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
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
