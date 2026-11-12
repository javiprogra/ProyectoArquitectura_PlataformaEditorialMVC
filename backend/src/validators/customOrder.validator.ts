import { z } from 'zod';

export const customOrderItemSchema = z.object({
  bookId: z.number().int().positive().optional(),
  quantity: z.number().int().positive(),
  coverFinish: z.string().trim().max(50).optional().nullable(),
  paperType: z.string().trim().max(50).optional().nullable(),
});

export const createCustomOrderSchema = z.object({
  bookId: z.number().int().positive().nullable().optional(),
  bookTitle: z.string().trim().min(1).max(200),
  quantity: z.number().int().positive(),
  coverFinish: z.string().trim().max(50).optional().nullable(),
  paperType: z.string().trim().max(50).optional().nullable(),
  requiredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const customOrderQuerySchema = z.object({
  estado: z.string().trim().optional(),
});

export const customOrderStatusSchema = z.object({
  status: z.enum(['pendiente', 'en_revision', 'cotizada', 'aprobada', 'rechazada']),
});
