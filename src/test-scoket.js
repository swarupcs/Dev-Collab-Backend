// test-socket.js
import { io } from 'socket.io-client';

const socket = io('http://localhost:8080', {
  transports: ['websocket'],
  auth: {
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OGM2ZTU2MWU0OGM2ZDk5NTZlN2Y0MTgiLCJpYXQiOjE3NTkyMjEzMTAsImV4cCI6MTc1OTgyNjExMH0.vpi7eDQ14scDuv9MAwQRxA5sm9VPnuF24yl-SebYO08',
  },
});

socket.on('connect', () => {
  console.log('✅ Connected to server:', socket.id);

  // Register user
  socket.emit('register', 'USER_ID');

  // Send a message (this will create chat if not exists)
  socket.emit('send_message', {
    senderId: '68c6e561e48c6d9956e7f418',
    receiverId: '68c84564f8db820a04da4b32',
    text: 'Hello from test client!',
  });
});

socket.on('receive_message', (msg) => {
  console.log('📩 New message received:', msg);
});

socket.on('message_sent', (msg) => {
  console.log('✅ Message stored and confirmed:', msg);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected');
});
