import { io } from 'socket.io-client';

const SOCKET_URL = 'https://shri-hari-sweets.onrender.com';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});
