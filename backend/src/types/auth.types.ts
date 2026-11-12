import type { RoleCode } from '../constants/roles';

/** Fila cruda de fn_obtener_usuario_por_username. */
export interface AuthUserDbRow {
  id_usuario: number;
  id_rol: number;
  rol: string; // nombre ES
  usuario: string; // email
  password_hash: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  direccion: string | null;
  estado: boolean;
  id_cliente: number | null;
  id_tipo_cliente: number | null;
  tipo_cliente: string | null;
  descuento_cliente: string | null; // NUMERIC llega como string
}

/** Identidad autenticada inyectada en `req.user`. */
export interface AuthenticatedUser {
  id_usuario: number;
  usuario: string; // email
  name: string;
  rol: RoleCode;
  id_rol: number;
  id_cliente: number | null;
  id_tipo_cliente: number | null;
}

/** Perfil público devuelto por la API (login/me). */
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: RoleCode;
  descuento_cliente: number;
}

/** Payload firmado en el JWT. */
export interface JwtPayload {
  sub: number;
  email: string;
  name: string;
  role: RoleCode;
  id_rol: number;
  id_cliente?: number | null;
  id_tipo_cliente?: number | null;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role: 'retail_client' | 'institutional_client';
}

export interface LoginInput {
  email: string;
  password: string;
}
