import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError';

// Mapeo de SQLSTATE (lanzados por las funciones almacenadas) a HTTP.
const SQLSTATE_TO_HTTP: Record<string, number> = {
  '23505': 409, // unique_violation
  LUM01: 400, // parámetro inválido
  LUM02: 409, // stock insuficiente
  LUM03: 403, // estado inválido / sin permisos
  LUM04: 409, // ya existe orden/cotización
  LUM05: 409, // último administrador
  LUM06: 409, // entidad en uso
  LUM07: 404, // no encontrado
  LUM08: 409, // duplicado
};

function isPgError(err: unknown): err is Error & { code?: string } {
  return err instanceof Error && typeof (err as { code?: unknown }).code === 'string';
}

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ success: false, message: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  if (isPgError(err)) {
    const status = SQLSTATE_TO_HTTP[err.code ?? ''] ?? 500;
    res.status(status).json({ success: false, message: err.message });
    return;
  }

  console.error('Error no controlado:', err);
  res.status(500).json({ success: false, message: 'Error interno del servidor' });
}
