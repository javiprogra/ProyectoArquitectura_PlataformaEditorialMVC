import type { Request, Response } from 'express';
import { QuoteService } from '../models/services/quote.service';
import { createQuoteSchema, quoteQuerySchema, quoteStatusSchema } from '../validators/quote.validator';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../utils/httpError';

const quoteService = new QuoteService();

export const listQuotes = asyncHandler(async (req: Request, res: Response) => {
  quoteQuerySchema.parse(req.query);
  const result = await quoteService.list();
  res.json({ success: true, data: result });
});

export const createQuote = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new HttpError(401, 'No autenticado');
  const input = createQuoteSchema.parse(req.body);
  const result = await quoteService.generate(input, req.user.id_usuario);
  res.status(201).json({ success: true, data: result });
});

export const updateQuoteStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new HttpError(401, 'No autenticado');
  const id = Number(req.params.id);
  const { status } = quoteStatusSchema.parse(req.body);
  await quoteService.updateStatus(id, status, req.user.id_usuario);
  res.json({ success: true, data: { id, status } });
});

export const convertQuoteToOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new HttpError(401, 'No autenticado');
  const id = Number(req.params.id);
  const idOrden = await quoteService.convertToOrder(id, req.user.id_usuario);
  res.status(201).json({ success: true, data: { id_orden: idOrden } });
});
