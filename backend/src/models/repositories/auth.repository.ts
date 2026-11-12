import { AppDataSource } from '../../config/database';
import type { AuthUserDbRow } from '../../types/auth.types';

export interface CreateUserClientInput {
  usuario: string;
  password_hash: string;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  direccion?: string | null;
  nit?: string | null;
  id_rol: number;
  id_tipo_cliente?: number | null;
}

export class AuthRepository {
  async findByUsername(usuario: string): Promise<AuthUserDbRow | null> {
    const rows: AuthUserDbRow[] = await AppDataSource.query(
      'SELECT * FROM fn_obtener_usuario_por_username($1)',
      [usuario],
    );
    return rows[0] ?? null;
  }

  async createUserClient(input: CreateUserClientInput): Promise<{ id_usuario: number; id_cliente: number | null }> {
    const rows = await AppDataSource.query(
      'SELECT * FROM sp_crear_usuario_cliente($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [
        input.usuario,
        input.password_hash,
        input.nombre,
        input.apellido,
        input.telefono ?? null,
        input.direccion ?? null,
        input.nit ?? null,
        input.id_rol,
        input.id_tipo_cliente ?? null,
      ],
    );
    const row = rows[0];
    return { id_usuario: Number(row.id_usuario), id_cliente: row.id_cliente === null ? null : Number(row.id_cliente) };
  }
}
