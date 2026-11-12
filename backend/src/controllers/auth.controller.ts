import type { Request, Response } from 'express';
import { AuthService } from '../models/services/auth.service';
import { loginSchema, registerSchema } from '../validators/auth.validator';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../utils/httpError';

const authService = new AuthService();

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);
  const result = await authService.register(input);
  res.status(201).json({ success: true, data: result });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const result = await authService.login(input);
  res.json({ success: true, data: result });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new HttpError(401, 'No autenticado');
  const result = await authService.getProfile(req.user.usuario);
  res.json({ success: true, data: result });
});
