import { z } from 'zod';

export const cartItemSchema = z.object({
  bookId: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

export const calculateOrderSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'El carrito no puede estar vacío'),
});

export const createOrderSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'El carrito no puede estar vacío'),
});

export const orderQuerySchema = z.object({
  estado: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const orderStatusSchema = z.object({
  status: z.string().trim().min(1),
});
