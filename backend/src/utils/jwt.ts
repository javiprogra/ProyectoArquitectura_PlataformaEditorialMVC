import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { JwtPayload } from '../types/auth.types';

export function signToken(payload: JwtPayload): string {
  const expiresIn = env.JWT_EXPIRES_IN as unknown as SignOptions['expiresIn'];
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === 'string') {
    throw new Error('Token inválido');
  }
  return decoded as unknown as JwtPayload;
}
