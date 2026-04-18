import type { Server, Socket } from 'socket.io';
import { verifyAccessToken } from './utils/jwt';
import { User } from './models/User';
import { Message } from './models/Message';

interface CustomSocket extends Socket {
  user?: any;
}

export const initSocket = (io: Server) => {
  io.use((socket: CustomSocket, next) => {
    void (async () => {
      const token = socket.handshake.auth.token?.split(' ')[1] || socket.handshake.auth.token;
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
      } catch (_error) {
        next(new Error('Authentication error'));
      }
    })();
  });

  io.on('connection', (socket: CustomSocket) => {
    console.log(`User connected: ${socket.user?.email}`);

    socket.on('sendMessage', async ({ receiverId, content }, callback) => {
      console.log(`Message from ${socket.user?.email} to ${receiverId}: ${content}`);
      
      try {
        // Save the message to the database
        const newMessage = await Message.create({
          sender: socket.user._id,
          receiver: receiverId,
          content,
        });

        const populatedMessage = await Message.findById(newMessage._id)
          .populate('sender', 'firstName lastName avatarUrl')
          .populate('receiver', 'firstName lastName avatarUrl');

        const messageData = populatedMessage!.toJSON();

        const receiverSocket = findSocketByUserId(io, receiverId);
        if (receiverSocket) {
          console.log(`Delivering message to receiver socket: ${receiverId}`);
          receiverSocket.emit('receiveMessage', messageData);
        } else {
          console.log(`Receiver ${receiverId} is not connected.`);
        }

        // Acknowledge the message
        if (callback) callback({ message: messageData });
      } catch (error) {
        console.error('Error sending message:', error);
        if (callback) callback({ error: 'Failed to send message' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user?.email}`);
    });
  });
};

const findSocketByUserId = (io: Server, userId: string) => {
  for (const [_, socket] of io.of('/').sockets) {
    const customSocket = socket as CustomSocket;
    const socketUserId = customSocket.user?._id?.toString() || customSocket.user?.id;
    if (socketUserId === userId) {
      return customSocket;
    }
  }
  return null;
};
