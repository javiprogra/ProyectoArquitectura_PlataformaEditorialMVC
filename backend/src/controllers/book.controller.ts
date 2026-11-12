import type { Request, Response } from 'express';
import { BookService } from '../models/services/book.service';
import { bookQuerySchema, createBookSchema, stockSchema, updateBookSchema } from '../validators/book.validator';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../utils/httpError';

const bookService = new BookService();

export const listBooks = asyncHandler(async (req: Request, res: Response) => {
  const q = bookQuerySchema.parse(req.query);
  const books = await bookService.list({ search: q.search, genre: q.genre, format: q.format, precioMin: q.precioMin, precioMax: q.precioMax });
  res.json({ success: true, data: books });
});

export const getBook = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const book = await bookService.getById(id);
  if (!book) throw new HttpError(404, 'Libro no encontrado');
  res.json({ success: true, data: book });
});

export const createBook = asyncHandler(async (req: Request, res: Response) => {
  const input = createBookSchema.parse(req.body);
  const book = await bookService.create(input);
  res.status(201).json({ success: true, data: book });
});

export const updateBook = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const input = updateBookSchema.parse(req.body);
  const book = await bookService.update(id, input);
  if (!book) throw new HttpError(404, 'Libro no encontrado');
  res.json({ success: true, data: book });
});

export const deleteBook = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await bookService.remove(id);
  res.json({ success: true, data: { id } });
});

export const setStock = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { stock } = stockSchema.parse(req.body);
  const book = await bookService.setStock(id, stock, req.user?.id_usuario ?? null, 'Ajuste de stock');
  if (!book) throw new HttpError(404, 'Libro no encontrado');
  res.json({ success: true, data: book });
});
