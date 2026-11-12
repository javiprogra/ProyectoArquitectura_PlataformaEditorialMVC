import { z } from 'zod';

export const createQuoteSchema = z.object({
  requestId: z.number().int().positive(),
  unitPrice: z.coerce.number().positive(),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const quoteQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const quoteStatusSchema = z.object({
  status: z.enum(['emitida', 'aprobada', 'rechazada']),
});
