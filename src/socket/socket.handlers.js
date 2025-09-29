import {
    sendMessageSocket,
    markMessagesAsReadSocket,
    editMessageSocket,
    deleteMessageSocket,
    handleTypingSocket,
} from '../controllers/chat.controller.js';

/**
 * Setup Socket.IO event handlers for chat functionality
 * @param {Socket} socket - Socket.IO socket instance
 * @param {Server} io - Socket.IO server instance
 * @param {Map} connectedUsers - Map of userId -> { socketId, user }
 */
export const setupChatHandlers = (socket, io, connectedUsers) => {
    const userId = socket.user._id.toString();

    // ==================== CONNECTION MANAGEMENT ====================

    // Store user connection
    connectedUsers.set(userId, {
        socketId: socket.id,
        user: socket.user,
    });

    // Notify user's contacts that they're online
    socket.broadcast.emit('userOnline', {
        userId,
        lastSeen: new Date(),
    });

    console.log(`User ${userId} connected with socket ${socket.id}`);

    // ==================== MESSAGE EVENTS ====================

    /**
     * Send a message in real-time
     */
    socket.on('sendMessage', async (data, callback) => {
        try {
            const { receiverId, text, messageType } = data;

            const { message, chat } = await sendMessageSocket({
                senderId: userId,
                receiverId,
                text,
                messageType,
            });

            // Send to receiver if online
            const receiverSocket = connectedUsers.get(receiverId);
            if (receiverSocket) {
                io.to(receiverSocket.socketId).emit('newMessage', {
                    message,
                    chatId: chat._id,
                });
            }

            // Send confirmation back to sender
            callback({
                success: true,
                message,
                chatId: chat._id,
            });
        } catch (error) {
            console.error('Send message error:', error);
            callback({
                success: false,
                error: error.message,
            });
        }
    });

    /**
     * Mark messages as read
     */
    socket.on('markAsRead', async (data, callback) => {
        try {
            const { senderId } = data;

            const result = await markMessagesAsReadSocket({
                senderId,
                receiverId: userId,
            });

            // Notify sender that messages were read
            const senderSocket = connectedUsers.get(senderId);
            if (senderSocket) {
                io.to(senderSocket.socketId).emit('messagesRead', {
                    readBy: userId,
                    readAt: result.readAt,
                    count: result.modifiedCount,
                });
            }

            callback({
                success: true,
                modifiedCount: result.modifiedCount,
            });
        } catch (error) {
            console.error('Mark as read error:', error);
            callback({
                success: false,
                error: error.message,
            });
        }
    });

    /**
     * Edit a message
     */
    socket.on('editMessage', async (data, callback) => {
        try {
            const { messageId, text } = data;

            const { message } = await editMessageSocket({
                messageId,
                userId,
                text,
            });

            // Notify receiver
            const receiverSocket = connectedUsers.get(message.receiverId.toString());
            if (receiverSocket) {
                io.to(receiverSocket.socketId).emit('messageEdited', {
                    messageId,
                    newText: message.text,
                    editedAt: message.editedAt,
                });
            }

            callback({
                success: true,
                message,
            });
        } catch (error) {
            console.error('Edit message error:', error);
            callback({
                success: false,
                error: error.message,
            });
        }
    });

    /**
     * Delete a message
     */
    socket.on('deleteMessage', async (data, callback) => {
        try {
            const { messageId } = data;

            const result = await deleteMessageSocket({
                messageId,
                userId,
            });

            // Get message details to notify receiver
            const Message = (await import('../models/message.model.js')).default;
            const message = await Message.findById(messageId);

            if (message) {
                const receiverSocket = connectedUsers.get(message.receiverId.toString());
                if (receiverSocket) {
                    io.to(receiverSocket.socketId).emit('messageDeleted', {
                        messageId,
                        deletedBy: userId,
                        deletedAt: result.deletedAt,
                    });
                }
            }

            callback({
                success: true,
                messageId,
            });
        } catch (error) {
            console.error('Delete message error:', error);
            callback({
                success: false,
                error: error.message,
            });
        }
    });

    /**
     * Typing indicator
     */
    socket.on('typing', async (data, callback) => {
        try {
            const { recipientId, isTyping } = data;

            await handleTypingSocket({
                userId,
                recipientId,
                isTyping,
            });

            // Notify recipient
            const recipientSocket = connectedUsers.get(recipientId);
            if (recipientSocket) {
                io.to(recipientSocket.socketId).emit('userTyping', {
                    userId,
                    isTyping,
                });
            }

            if (callback) {
                callback({ success: true });
            }
        } catch (error) {
            console.error('Typing indicator error:', error);
            if (callback) {
                callback({
                    success: false,
                    error: error.message,
                });
            }
        }
    });

    /**
     * Join a chat room (for group chats in future)
     */
    socket.on('joinChat', (chatId) => {
        socket.join(`chat_${chatId}`);
        console.log(`User ${userId} joined chat ${chatId}`);
    });

    /**
     * Leave a chat room
     */
    socket.on('leaveChat', (chatId) => {
        socket.leave(`chat_${chatId}`);
        console.log(`User ${userId} left chat ${chatId}`);
    });

    // ==================== DISCONNECTION ====================

    socket.on('disconnect', () => {
        // Remove from connected users
        connectedUsers.delete(userId);

        // Update last seen
        const updateLastSeen = async () => {
            try {
                const { User } = await import('../models/user.model.js');
                await User.findByIdAndUpdate(userId, {
                    lastSeen: new Date(),
                });
            } catch (error) {
                console.error('Error updating last seen:', error);
            }
        };
        updateLastSeen();

        // Notify user's contacts that they're offline
        socket.broadcast.emit('userOffline', {
            userId,
            lastSeen: new Date(),
        });

        console.log(`User ${userId} disconnected`);
    });
};

/**
 * Get online users (helper function)
 */
export const getOnlineUsers = (connectedUsers) => {
    return Array.from(connectedUsers.keys());
};