import express from 'express';
import { 
  getOrders, 
  createOrder, 
  updateOrder, 
  deleteOrder, 
  togglePaymentStatus,
  downloadOrdersPDF
} from '../controllers/orderController.js';

const router = express.Router();

router.route('/')
  .get(getOrders)
  .post(createOrder);

router.route('/download-pdf')
  .get(downloadOrdersPDF);

router.route('/:id')
  .put(updateOrder)
  .delete(deleteOrder);

router.route('/:id/toggle-payment')
  .patch(togglePaymentStatus);

export default router;
