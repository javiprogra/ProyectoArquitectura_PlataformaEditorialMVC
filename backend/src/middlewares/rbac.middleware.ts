import type { RequestHandler } from 'express';
import { HttpError } from '../utils/httpError';
import type { RoleCode } from '../constants/roles';

export function requireRole(...roles: RoleCode[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'No autenticado'));
    if (!roles.includes(req.user.rol)) return next(new HttpError(403, 'No tienes permisos para esta acción'));
    return next();
  };
}
