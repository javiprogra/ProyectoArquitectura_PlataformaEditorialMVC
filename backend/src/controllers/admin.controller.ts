import type { Request, Response } from 'express';
import { AdminService } from '../models/services/admin.service';
import { adjustStockSchema, assignRoleSchema, createRoleSchema, userStatusSchema } from '../validators/admin.validator';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../utils/httpError';

const adminService = new AdminService();

export const metrics = asyncHandler(async (_req: Request, res: Response) => {
  const result = await adminService.metrics();
  res.json({ success: true, data: result });
});

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const result = await adminService.listUsers();
  res.json({ success: true, data: result });
});

export const setUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { estado } = userStatusSchema.parse(req.body);
  await adminService.setUserStatus(id, estado);
  res.json({ success: true, data: { id, estado } });
});

export const assignRole = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { id_rol } = assignRoleSchema.parse(req.body);
  await adminService.assignRole(id, id_rol, req.user?.id_usuario ?? null);
  res.json({ success: true, data: { id, id_rol } });
});

export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const { nombre } = createRoleSchema.parse(req.body);
  const id = await adminService.createRole(nombre);
  res.status(201).json({ success: true, data: { id_rol: id } });
});

export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await adminService.deleteRole(id);
  res.json({ success: true, data: { id } });
});

export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { delta, motivo } = adjustStockSchema.parse(req.body);
  await adminService.applyAdjustment(id, delta, req.user?.id_usuario ?? null, motivo ?? null);
  res.json({ success: true, data: { id } });
});
