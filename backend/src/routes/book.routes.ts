import { Router } from 'express';
import { createBook, deleteBook, getBook, listBooks, setStock, updateBook } from '../controllers/book.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';

const router = Router();

router.get('/', listBooks);
router.get('/:id', getBook);
router.post('/', authMiddleware, requireRole('admin'), createBook);
router.put('/:id', authMiddleware, requireRole('admin'), updateBook);
router.delete('/:id', authMiddleware, requireRole('admin'), deleteBook);
router.patch('/:id/stock', authMiddleware, requireRole('admin'), setStock);

export default router;
