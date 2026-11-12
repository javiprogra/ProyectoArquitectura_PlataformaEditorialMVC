import { Router } from 'express';
import { createCustomOrder, listCustomOrders, updateCustomOrderStatus } from '../controllers/customOrder.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';

const router = Router();

router.post('/', authMiddleware, requireRole('retail_client', 'institutional_client'), createCustomOrder);
router.get('/', authMiddleware, requireRole('admin', 'sales_advisor'), listCustomOrders);
router.patch('/:id/status', authMiddleware, requireRole('admin', 'sales_advisor'), updateCustomOrderStatus);

export default router;
