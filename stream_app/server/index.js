const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// SSL certificate configuration
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'cert.key')),
  cert: fs.readFileSync(path.join(__dirname, 'cert.crt'))
};

// Create HTTPS server
const server = https.createServer(sslOptions, app);

// Configure CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve static files from the client's dist directory
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Handle client-side routing
app.get('/', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Store connected clients by room
const rooms = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join', (data) => {
    const { roomId } = data;
    console.log(`Client ${socket.id} joining room:`, roomId);
    
    socket.join(roomId);
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(socket.id);
    
    const roomClients = Array.from(rooms.get(roomId));
    console.log(`Room ${roomId} now has clients:`, roomClients);
    
    io.to(roomId).emit('room-update', {
      roomId,
      clients: roomClients
    });
  });

  socket.on('offer', (data) => {
    const { offer, roomId } = data;
    console.log(`Offer received in room ${roomId} from ${socket.id}`);
    socket.to(roomId).emit('offer', {
      offer,
      from: socket.id
    });
  });

  socket.on('answer', (data) => {
    const { answer, roomId } = data;
    console.log(`Answer received in room ${roomId} from ${socket.id}`);
    socket.to(roomId).emit('answer', {
      answer,
      from: socket.id
    });
  });

  socket.on('ice-candidate', (data) => {
    const { candidate, roomId } = data;
    console.log(`ICE candidate received in room ${roomId} from ${socket.id}`);
    socket.to(roomId).emit('ice-candidate', {
      candidate,
      from: socket.id
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    rooms.forEach((clients, roomId) => {
      if (clients.has(socket.id)) {
        clients.delete(socket.id);
        const remainingClients = Array.from(clients);
        io.to(roomId).emit('room-update', {
          roomId,
          clients: remainingClients
        });
      }
    });
  });
});

// Start the server
server.listen(port, '0.0.0.0', () => {
  console.log(`Server running at https://localhost:${port}`);
  const networkInterfaces = require('os').networkInterfaces();
  const addresses = [];
  for (const k in networkInterfaces) {
    for (const k2 in networkInterfaces[k]) {
      const address = networkInterfaces[k][k2];
      if (address.family === 'IPv4' && !address.internal) {
        addresses.push(address.address);
      }
    }
  }
  console.log('Available on network at:');
  addresses.forEach(addr => {
    console.log(`https://${addr}:${port}`);
  });
}); 