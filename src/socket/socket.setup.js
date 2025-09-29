import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { setupChatHandlers, getOnlineUsers } from './socket.handlers.js';

// Store connected users: Map<userId, { socketId, user }>
const connectedUsers = new Map();

/**
 * Socket.IO authentication middleware
 */
const socketAuthMiddleware = async (socket, next) => {
    try {
        // Get token from handshake auth or query
        const token =
            socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
            return next(new Error('Authentication token required'));
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const user = await User.findById(decoded.userId).select(
            '-password -refreshToken'
        );

        if (!user) {
            return next(new Error('User not found'));
        }

        // Attach user to socket
        socket.user = user;
        next();
    } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
    }
};

/**
 * Initialize Socket.IO server
 * @param {Server} httpServer - HTTP server instance
 * @returns {Server} Socket.IO server instance
 */
export const initializeSocketIO = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            credentials: true,
            methods: ['GET', 'POST'],
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Apply authentication middleware
    io.use(socketAuthMiddleware);

    // Handle connections
    io.on('connection', (socket) => {
        // Setup all chat-related event handlers
        setupChatHandlers(socket, io, connectedUsers);

        // Send current online users to the newly connected user
        socket.emit('onlineUsers', {
            users: getOnlineUsers(connectedUsers),
        });
    });

    console.log('Socket.IO server initialized');

    return io;
};

/**
 * Get connected users (for use in REST endpoints if needed)
 */
export const getConnectedUsers = () => connectedUsers;

/**
 * Emit event to specific user
 */
export const emitToUser = (io, userId, event, data) => {
    const userSocket = connectedUsers.get(userId);
    if (userSocket) {
        io.to(userSocket.socketId).emit(event, data);
        return true;
    }
    return false;
};

/**
 * Emit event to multiple users
 */
export const emitToUsers = (io, userIds, event, data) => {
    const emitted = [];
    userIds.forEach((userId) => {
        if (emitToUser(io, userId, event, data)) {
            emitted.push(userId);
        }
    });
    return emitted;
};