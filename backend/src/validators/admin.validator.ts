import { z } from 'zod';

export const adjustStockSchema = z.object({
  delta: z.number().int(),
  motivo: z.string().trim().max(255).optional().nullable(),
});

export const userStatusSchema = z.object({
  estado: z.boolean(),
});

export const assignRoleSchema = z.object({
  id_rol: z.number().int().positive(),
});

export const createRoleSchema = z.object({
  nombre: z.string().trim().min(1).max(50),
});
