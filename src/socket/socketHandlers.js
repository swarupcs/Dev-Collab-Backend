import { authenticateSocket } from "../middlewares/authenticateSocket.midleware.js";

const connectedUsers = new Map(); // Store user socket mappings

export const setupSocketHandlers = (io) => {
  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`👤 User connected: ${socket.user.username} (${socket.id})`);

    // Store user connection
    connectedUsers.set(socket.userId.toString(), {
      socketId: socket.id,
      userId: socket.userId,
      username: socket.user.username,
      lastSeen: new Date(),
    });

    // Join user to their personal room for notifications
    socket.join(`user_${socket.userId}`);

    // Emit user online status
    socket.broadcast.emit('userOnline', {
      userId: socket.userId,
      username: socket.user.username,
      timestamp: new Date(),
    });

    // Basic chat event handlers (you can expand these later)
    socket.on('sendMessage', (data) => {
      console.log('Message received:', data);
      // Handle message sending logic here
    });

    socket.on('joinChat', (chatId) => {
      socket.join(`chat_${chatId}`);
      console.log(`User ${socket.user.username} joined chat ${chatId}`);
    });

    socket.on('leaveChat', (chatId) => {
      socket.leave(`chat_${chatId}`);
      console.log(`User ${socket.user.username} left chat ${chatId}`);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`👤 User disconnected: ${socket.user.username} (${reason})`);

      // Remove user from connected users
      connectedUsers.delete(socket.userId.toString());

      // Emit user offline status
      socket.broadcast.emit('userOffline', {
        userId: socket.userId,
        username: socket.user.username,
        lastSeen: new Date(),
      });
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Handle middleware errors
  io.engine.on('connection_error', (err) => {
    console.error('Socket.IO connection error:', err.message);
  });
};

// Utility functions
export const getConnectedUsers = () => connectedUsers;

export const isUserOnline = (userId) => {
  return connectedUsers.has(userId.toString());
};

export const getUserSocket = (userId) => {
  return connectedUsers.get(userId.toString())?.socketId;
};
