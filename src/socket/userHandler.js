export const handleUserEvents = (socket, io, connectedUsers) => {
  // Get online users
  socket.on('getOnlineUsers', () => {
    const onlineUsers = Array.from(connectedUsers.values()).map((user) => ({
      userId: user.userId,
      lastSeen: user.lastSeen,
    }));

    socket.emit('onlineUsers', onlineUsers);
  });

  // Update user status
  socket.on('updateStatus', (status) => {
    const userConnection = connectedUsers.get(socket.userId.toString());
    if (userConnection) {
      userConnection.status = status;
      socket.broadcast.emit('userStatusUpdate', {
        userId: socket.userId,
        status,
        timestamp: new Date(),
      });
    }
  });
};
