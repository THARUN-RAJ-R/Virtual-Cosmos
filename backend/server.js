require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cosmos';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    console.warn('Continuing without MongoDB persistence.');
  });

const UserSchema = new mongoose.Schema({
  userId: String,
  name: String,
  lastPosition: {
    x: Number,
    y: Number
  },
  lastActive: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// State Management
const players = new Map(); // socket.id -> { userId, name, x, y }

const RADIUS = 150; // Interaction radius (Matches frontend threshold)
const RADIUS_SQ = RADIUS * RADIUS;
const CLUSTER_INTERVAL = 200; // ms (Slightly relaxed for stability)

// Spatial Clustering for Proximity
setInterval(() => {
  players.forEach((p1, sId1) => {
    const neighbors = [];
    players.forEach((p2, sId2) => {
      if (sId1 === sId2) return;
      const distSq = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
      if (distSq < RADIUS_SQ) {
        neighbors.push({
          id: sId2,
          userId: p2.userId,
          name: p2.name,
          x: p2.x,
          y: p2.y
        });
      }
    });
    // Emit personal neighbor list to this specific client
    io.to(sId1).emit('proximity:update', { partners: neighbors });
  });
}, CLUSTER_INTERVAL);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', async ({ name, x, y }) => {
    const playerConfig = {
      userId: socket.id,
      name: name || `User-${socket.id.substring(0, 4)}`,
      x: x || 400 + Math.random() * 200,
      y: y || 400 + Math.random() * 200,
      currentRoom: null
    };
    players.set(socket.id, playerConfig);
    
    // Persist to MongoDB
    try {
      await User.findOneAndUpdate(
        { userId: socket.id },
        { 
          name: playerConfig.name, 
          lastPosition: { x: playerConfig.x, y: playerConfig.y },
          lastActive: Date.now()
        },
        { upsert: true, new: true }
      );
    } catch (e) { console.error('[DB ERROR] Failed to sync user:', e); }

    socket.emit('world:snapshot', { selfId: socket.id, players: Array.from(players.values()) });
    socket.broadcast.emit('player:joined', playerConfig);
  });

  socket.on('move', ({ x, y }) => {
    const player = players.get(socket.id);
    if (player) {
      player.x = x;
      player.y = y;
      socket.broadcast.emit('player:moved', { userId: socket.id, x, y });

      // Periodically sync to DB (using a simple throttle)
      if (!player.lastSync || Date.now() - player.lastSync > 5000) {
        player.lastSync = Date.now();
        User.updateOne(
          { userId: socket.id },
          { lastPosition: { x, y }, lastActive: Date.now() }
        ).catch(e => console.error('Error syncing position:', e));
      }
    }
  });

  socket.on('proximity:message', (data) => {
    const { message } = data;
    const sender = players.get(socket.id);
    if (!sender) return;

    // Deliver to all players who are personally within the sender's radius (including sender)
    players.forEach((target, targetId) => {
      const distSq = Math.pow(sender.x - target.x, 2) + Math.pow(sender.y - target.y, 2);
      if (distSq < RADIUS_SQ) {
        io.to(targetId).emit('proximity:message', {
          fromUserId: socket.id,
          fromUserName: sender.name,
          text: message // Standardized key
        });
      }
    });
  });

  socket.on('disconnect', () => {
    players.delete(socket.id);
    io.emit('player:left', { userId: socket.id });
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
