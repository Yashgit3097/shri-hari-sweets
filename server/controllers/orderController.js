import Order from '../models/Order.js';
import { generateOrdersPDF } from './pdfGenerator.js';

// Helper to broadcast updated data to all clients
const broadcastUpdate = async (req) => {
  const io = req.app.get('io');
  if (io) {
    try {
      const orders = await Order.find({}).sort({ createdAt: -1 });
      io.emit('data-updated', orders);
    } catch (err) {
      console.error("Error during socket broadcast:", err);
    }
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Public
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new order
// @route   POST /api/orders
// @access  Public
export const createOrder = async (req, res) => {
  try {
    const { customerName, phoneNumber, items, totalPrice, status } = req.body;

    if (!customerName) {
      return res.status(400).json({ message: "Customer name is required" });
    }

    const order = new Order({
      customerName,
      phoneNumber,
      items,
      totalPrice,
      status
    });

    const savedOrder = await order.save();
    await broadcastUpdate(req);
    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update an order
// @route   PUT /api/orders/:id
// @access  Public
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, phoneNumber, items, totalPrice, status } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (customerName !== undefined) order.customerName = customerName;
    if (phoneNumber !== undefined) order.phoneNumber = phoneNumber;
    if (items !== undefined) order.items = items;
    if (totalPrice !== undefined) order.totalPrice = totalPrice;
    if (status !== undefined) order.status = status;

    const updatedOrder = await order.save();
    await broadcastUpdate(req);
    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete an order
// @route   DELETE /api/orders/:id
// @access  Public
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    await Order.findByIdAndDelete(id);
    await broadcastUpdate(req);
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle payment status
// @route   PATCH /api/orders/:id/toggle-payment
// @access  Public
export const togglePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = order.status === 'paid' ? 'unpaid' : 'paid';
    const updatedOrder = await order.save();
    await broadcastUpdate(req);
    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Download all orders as PDF
// @route   GET /api/orders/download-pdf
// @access  Public
export const downloadOrdersPDF = async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="shri_hari_sweets_report.pdf"');
    
    generateOrdersPDF(orders, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

