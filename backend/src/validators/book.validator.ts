import { z } from 'zod';

export const bookFields = {
  title: z.string().trim().min(1).max(200),
  author: z.string().trim().min(1).max(100),
  isbn: z.string().trim().min(1).max(50),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  genre: z.string().trim().min(1).max(100),
  format: z.string().trim().min(1).max(50),
  synopsis: z.string().trim().max(3000).optional().default(''),
  coverImage: z.string().trim().max(500).optional().nullable(),
  year: z.coerce.number().int().min(0).max(2100).optional().nullable(),
  edition: z.string().trim().max(50).optional().nullable(),
  pages: z.coerce.number().int().min(0).optional().nullable(),
  language: z.string().trim().max(50).optional().nullable(),
  publisher: z.string().trim().min(1).max(150),
};

export const createBookSchema = z.object(bookFields);
export const updateBookSchema = z.object(bookFields).partial();

export const bookQuerySchema = z.object({
  search: z.string().trim().optional(),
  genre: z.string().trim().optional(),
  format: z.string().trim().optional(),
  precioMin: z.coerce.number().optional(),
  precioMax: z.coerce.number().optional(),
});

export const stockSchema = z.object({
  stock: z.coerce.number().int().min(0),
});
