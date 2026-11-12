import { AppDataSource } from '../../config/database';

export interface SolicitudItem {
  id_libro: number;
  cantidad_estimada: number;
  acabado_portada?: string | null;
  tipo_papel?: string | null;
}

export interface SolicitudDbRow {
  id_solicitud: number;
  id_cliente: number;
  id_usuario: number;
  cliente: string;
  cliente_email: string;
  titulo: string | null;
  id_libro: number | null;
  cantidad_estimada: number | null;
  acabado_portada: string | null;
  tipo_papel: string | null;
  fecha_requerida: string;
  fecha_solicitud: Date | string;
  estado: string;
  notas: string | null;
  total_count?: string;
}

export class CustomOrderRepository {
  async create(
    idCliente: number,
    fechaRequerida: string,
    items: SolicitudItem[] | null,
    tituloPersonalizado: string | null,
    notas: string | null,
  ): Promise<number> {
    const rows = await AppDataSource.query(
      'SELECT * FROM sp_crear_solicitud($1,$2,$3::jsonb,$4,$5)',
      [idCliente, fechaRequerida, items ? JSON.stringify(items) : null, tituloPersonalizado, notas],
    );
    return Number(rows[0].sp_crear_solicitud);
  }

  async list(estado: string | null): Promise<SolicitudDbRow[]> {
    return AppDataSource.query('SELECT * FROM fn_listar_solicitudes($1,500,0)', [estado]);
  }

  async updateStatus(id: number, estado: string, idUsuario: number): Promise<void> {
    await AppDataSource.query('SELECT sp_actualizar_estado_solicitud($1,$2,$3)', [id, estado, idUsuario]);
  }
}
