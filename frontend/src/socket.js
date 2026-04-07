import { io } from 'socket.io-client';

// In a real app this would be an environment variable.
const SOCKET_URL = 'http://localhost:3001';

export const socket = io(SOCKET_URL);
