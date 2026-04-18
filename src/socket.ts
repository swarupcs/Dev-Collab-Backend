import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from './utils/jwt';
import { User } from './models/User';

interface CustomSocket extends Socket {
  user?: any;
}

export const initSocket = (io: Server) => {
  io.use(async (socket: CustomSocket, next) => {
    const token = socket.handshake.auth.token?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication error'));
    }
    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        return next(new Error('Authentication error'));
      }
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: CustomSocket) => {
    console.log(`User connected: ${socket.user?.email}`);

    socket.on('sendMessage', async ({ receiverId, content }, callback) => {
      console.log(`Message from ${socket.user?.email} to ${receiverId}: ${content}`);
      // Here you would typically save the message to the database
      const message = {
        id: new Date().getTime().toString(),
        content,
        sender: socket.user,
        receiver: { id: receiverId }, // Mock receiver
        createdAt: new Date().toISOString(),
      };

      // Find the receiver's socket and emit the message
      const receiverSocket = findSocketByUserId(io, receiverId);
      if (receiverSocket) {
        receiverSocket.emit('receiveMessage', message);
      }

      // Acknowledge the message
      callback({ message });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user?.email}`);
    });
  });
};

const findSocketByUserId = (io: Server, userId: string) => {
  for (const [_, socket] of io.of('/').sockets) {
    const customSocket = socket as CustomSocket;
    if (customSocket.user?.id.toString() === userId) {
      return customSocket;
    }
  }
  return null;
};
