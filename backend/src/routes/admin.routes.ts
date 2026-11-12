import { Router } from 'express';
import { adjustStock, assignRole, createRole, deleteRole, listUsers, metrics, setUserStatus } from '../controllers/admin.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';

const router = Router();

router.use(authMiddleware, requireRole('admin'));

router.get('/metrics', metrics);
router.get('/users', listUsers);
router.patch('/users/:id/status', setUserStatus);
router.post('/users/:id/role', assignRole);
router.post('/roles', createRole);
router.delete('/roles/:id', deleteRole);
router.patch('/books/:id/stock', adjustStock);

export default router;
