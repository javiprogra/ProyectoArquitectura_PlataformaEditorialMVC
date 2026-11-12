import { Router } from 'express';
import { convertQuoteToOrder, createQuote, listQuotes, updateQuoteStatus } from '../controllers/quote.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';

const router = Router();

router.get('/', authMiddleware, requireRole('admin', 'sales_advisor'), listQuotes);
router.post('/', authMiddleware, requireRole('admin', 'sales_advisor'), createQuote);
router.patch('/:id/status', authMiddleware, requireRole('admin', 'sales_advisor'), updateQuoteStatus);
router.post('/:id/convert', authMiddleware, requireRole('admin', 'sales_advisor'), convertQuoteToOrder);

export default router;
