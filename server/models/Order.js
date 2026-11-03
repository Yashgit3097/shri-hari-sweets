import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  itemName: { 
    type: String, 
    required: true, 
    enum: [
      "Kesar Kaju Katri",
      "Kaju Katri",
      "Kaju Kasata",
      "Kaju Mahesur",
      "Kesar Dryfruit Ghari"
    ] 
  },
  weight: { 
    type: Number, 
    required: true, 
    enum: [250, 500, 1000] 
  },
  qty: { 
    type: Number, 
    required: true, 
    min: 1, 
    default: 1 
  },
  price: { 
    type: Number, 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  }
});

const orderSchema = new mongoose.Schema({
  customerName: { 
    type: String, 
    required: true 
  },
  phoneNumber: { 
    type: String, 
    default: "" 
  },
  items: [itemSchema],
  totalPrice: { 
    type: Number, 
    required: true,
    default: 0
  },
  status: { 
    type: String, 
    enum: ["paid", "unpaid"], 
    default: "unpaid" 
  },
  isDelivered: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
