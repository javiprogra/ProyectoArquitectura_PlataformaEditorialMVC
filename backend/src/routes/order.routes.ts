import { Router } from 'express';
import { calculate, createOrder, getOrder, listOrders, updateOrderStatus } from '../controllers/order.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';

const router = Router();

router.post('/calculate', authMiddleware, requireRole('retail_client', 'institutional_client'), calculate);
router.post('/', authMiddleware, requireRole('retail_client', 'institutional_client'), createOrder);
router.get('/', authMiddleware, requireRole('admin', 'sales_advisor'), listOrders);
router.get('/:id', authMiddleware, getOrder);
router.patch('/:id/status', authMiddleware, requireRole('admin', 'sales_advisor'), updateOrderStatus);

export default router;
