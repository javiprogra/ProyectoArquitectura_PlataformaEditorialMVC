import { AppDataSource } from '../../config/database';

export interface QuoteDbRow {
  id_cotizacion: number;
  id_solicitud: number;
  id_usuario: number | null;
  asesor: string;
  cliente: string;
  titulo: string | null;
  cantidad: number | null;
  precio_unitario: string | null;
  subtotal: string;
  descuento_volumen: string;
  descuento_cliente: string;
  impuesto: string;
  total: string;
  vigencia: string | null;
  notas: string | null;
  estado: string;
  fecha: Date | string;
  total_count?: string;
}

export class QuoteRepository {
  async generate(
    idSolicitud: number,
    idUsuario: number,
    precioUnitario: number,
    vigencia: string | null,
    notas: string | null,
  ): Promise<number> {
    const rows = await AppDataSource.query('SELECT * FROM sp_generar_cotizacion($1,$2,$3,$4,$5)', [
      idSolicitud, idUsuario, precioUnitario, vigencia, notas,
    ]);
    return Number(rows[0].sp_generar_cotizacion);
  }

  async list(limit: number, offset: number): Promise<QuoteDbRow[]> {
    return AppDataSource.query('SELECT * FROM fn_listar_cotizaciones($1,$2)', [limit, offset]);
  }

  async updateStatus(id: number, estado: string, idUsuario: number): Promise<void> {
    await AppDataSource.query('SELECT sp_actualizar_estado_cotizacion($1,$2,$3)', [id, estado, idUsuario]);
  }

  async convertToOrder(idCotizacion: number, idUsuario: number): Promise<number> {
    const rows = await AppDataSource.query('SELECT * FROM sp_convertir_cotizacion_en_orden($1,$2)', [idCotizacion, idUsuario]);
    return Number(rows[0].sp_convertir_cotizacion_en_orden);
  }
}
