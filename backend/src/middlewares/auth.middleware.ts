import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';
import { HttpError } from '../utils/httpError';
import type { JwtPayload } from '../types/auth.types';

function attachUser(req: Request, payload: JwtPayload): void {
  req.user = {
    id_usuario: payload.sub,
    usuario: payload.email,
    name: payload.name,
    rol: payload.role,
    id_rol: payload.id_rol,
    id_cliente: payload.id_cliente ?? null,
    id_tipo_cliente: payload.id_tipo_cliente ?? null,
  };
}

function extractToken(header: string | undefined): string | null {
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req.headers.authorization);
  if (!token) return next(new HttpError(401, 'Token de autenticación requerido'));

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return next(new HttpError(401, 'Token inválido o expirado'));
  }
  attachUser(req, payload);
  return next();
}

/** Igual que authMiddleware, pero no rechaza si no hay token (para endpoints públicos). */
export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req.headers.authorization);
  if (!token) return next();
  try {
    attachUser(req, verifyToken(token));
  } catch {
    // token presente pero inválido: se trata como visitante
  }
  return next();
}
