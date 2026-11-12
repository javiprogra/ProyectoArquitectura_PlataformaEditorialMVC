import type { Request, Response } from 'express';
import { OrderService } from '../models/services/order.service';
import type { CartLine } from '../models/repositories/order.repository';
import { calculateOrderSchema, createOrderSchema, orderQuerySchema, orderStatusSchema } from '../validators/order.validator';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../utils/httpError';

const orderService = new OrderService();

const toCartLines = (items: Array<{ bookId: number; quantity: number }>): CartLine[] =>
  items.map((i) => ({ id_libro: i.bookId, cantidad: i.quantity }));

export const calculate = asyncHandler(async (req: Request, res: Response) => {
  const { items } = calculateOrderSchema.parse(req.body);
  const result = await orderService.calculate(req.user?.id_cliente ?? null, toCartLines(items));
  res.json({ success: true, data: result });
});

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new HttpError(401, 'Debes iniciar sesión para comprar');
  const { items } = createOrderSchema.parse(req.body);
  const order = await orderService.create(req.user.id_usuario, toCartLines(items));
  res.status(201).json({ success: true, data: order });
});

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const q = orderQuerySchema.parse(req.query);
  const orders = await orderService.list(q.estado ?? null, null, q.limit, q.offset);
  res.json({ success: true, data: orders });
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const order = await orderService.getById(id);
  if (!order) throw new HttpError(404, 'Orden no encontrada');
  res.json({ success: true, data: order });
});

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new HttpError(401, 'No autenticado');
  const id = Number(req.params.id);
  const { status } = orderStatusSchema.parse(req.body);
  await orderService.updateStatus(id, status, req.user.id_usuario);
  res.json({ success: true, data: { id, status } });
});
