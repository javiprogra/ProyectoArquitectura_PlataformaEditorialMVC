import { AppDataSource } from '../../config/database';

export interface UserDbRow {
  id_usuario: number;
  id_rol: number;
  rol: string;
  usuario: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  direccion: string | null;
  estado: boolean;
  id_cliente: number | null;
  total_count?: string;
}

export interface MetricsDbRow {
  total_titulos: string;
  total_stock: string;
  valor_inventario: string;
  alertas_stock: string;
  total_ordenes: string;
  total_solicitudes: string;
  total_cotizaciones: string;
}

export class AdminRepository {
  async listUsers(limit: number, offset: number): Promise<UserDbRow[]> {
    return AppDataSource.query('SELECT * FROM fn_listar_usuarios($1,$2)', [limit, offset]);
  }

  async setUserStatus(id: number, estado: boolean): Promise<void> {
    await AppDataSource.query('SELECT sp_actualizar_estado_usuario($1,$2)', [id, estado]);
  }

  async createRole(nombre: string): Promise<number> {
    const rows = await AppDataSource.query('SELECT * FROM sp_crear_rol($1)', [nombre]);
    return Number(rows[0].sp_crear_rol);
  }

  async assignRole(idUsuario: number, idRol: number, idAdmin: number | null): Promise<void> {
    await AppDataSource.query('SELECT sp_asignar_rol($1,$2,$3)', [idUsuario, idRol, idAdmin]);
  }

  async deleteRole(idRol: number): Promise<void> {
    await AppDataSource.query('SELECT sp_eliminar_rol($1)', [idRol]);
  }

  async adjustStock(id: number, delta: number, idUsuario: number | null, motivo: string | null): Promise<number> {
    const rows = await AppDataSource.query('SELECT * FROM sp_ajustar_inventario($1,$2,$3,$4)', [id, delta, idUsuario, motivo]);
    return Number(rows[0].sp_ajustar_inventario);
  }

  async metrics(): Promise<MetricsDbRow> {
    const rows = await AppDataSource.query('SELECT * FROM fn_metricas_admin()');
    return rows[0];
  }
}
