import type { Request, Response } from 'express';
import { CustomOrderService } from '../models/services/customOrder.service';
import { createCustomOrderSchema, customOrderQuerySchema, customOrderStatusSchema } from '../validators/customOrder.validator';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../utils/httpError';

const customOrderService = new CustomOrderService();

export const createCustomOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new HttpError(401, 'Debes iniciar sesión para enviar solicitudes');
  const input = createCustomOrderSchema.parse(req.body);
  const result = await customOrderService.create(input, req.user);
  res.status(201).json({ success: true, data: result });
});

export const listCustomOrders = asyncHandler(async (req: Request, res: Response) => {
  const q = customOrderQuerySchema.parse(req.query);
  const result = await customOrderService.list(q.estado ?? null);
  res.json({ success: true, data: result });
});

export const updateCustomOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new HttpError(401, 'No autenticado');
  const id = Number(req.params.id);
  const { status } = customOrderStatusSchema.parse(req.body);
  await customOrderService.updateStatus(id, status, req.user.id_usuario);
  res.json({ success: true, data: { id, status } });
});
