import express from 'express';
import http from 'http';
import https from 'https';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import orderRoutes from './routes/orderRoutes.js';
import Order from './models/Order.js';

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
  }
});

// Make io available to requests
app.set('io', io);

// Mount API Routes
app.use('/api/orders', orderRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// Self-ping to prevent Render sleeping (every 5 minutes)
const pingInterval = 5 * 60 * 1000;
const selfUrl = `https://shri-hari-sweets.onrender.com`;

if (selfUrl) {
  setInterval(() => {
    const client = selfUrl.startsWith('https') ? https : http;
    client.get(`${selfUrl}/health`, (res) => {
      console.log(`Self-ping response: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error(`Self-ping failed: ${err.message}`);
    });
  }, pingInterval);
  console.log(`Self-ping scheduled for ${selfUrl} every 5 minutes.`);
}

// Socket Connections
io.on('connection', async (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current orders to newly connected client
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    socket.emit('data-updated', orders);
  } catch (err) {
    console.error("Error fetching orders on connection:", err.message);
  }

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
