import express from 'express';
import http from 'http';
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
