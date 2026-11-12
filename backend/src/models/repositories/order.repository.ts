import { AppDataSource } from '../../config/database';

export interface CartLine { id_libro: number; cantidad: number; }

export interface CalcDbRow {
  cantidad_total: number;
  subtotal_base: string;
  pct_volumen: string;
  descuento_volumen: string;
  pct_cliente: string;
  descuento_cliente: string;
  base_imponible: string;
  pct_iva: string;
  impuesto: string;
  total_final: string;
}

export interface OrderDbRow {
  id_orden: number;
  id_usuario: number;
  usuario: string;
  subtotal_base: string;
  descuento_volumen: string;
  descuento_cliente: string;
  impuesto: string;
  total_final: string;
  estado: string;
  fecha: Date | string;
  items: Array<{ bookId: number; title: string; quantity: number; unitPrice: number; subtotal: number }>;
  total_count?: string;
}

export class OrderRepository {
  async calculateTotals(idCliente: number | null, items: CartLine[]): Promise<CalcDbRow> {
    const rows = await AppDataSource.query('SELECT * FROM fn_calcular_totales_items($1, $2::jsonb)', [
      idCliente,
      JSON.stringify(items),
    ]);
    return rows[0];
  }

  async createDirect(idUsuario: number, items: CartLine[]): Promise<number> {
    const rows = await AppDataSource.query('SELECT * FROM sp_crear_orden_directa($1, $2::jsonb)', [
      idUsuario,
      JSON.stringify(items),
    ]);
    return Number(rows[0].sp_crear_orden_directa);
  }

  async findById(idOrden: number): Promise<OrderDbRow | null> {
    const rows: OrderDbRow[] = await AppDataSource.query('SELECT * FROM fn_obtener_orden($1)', [idOrden]);
    return rows[0] ?? null;
  }

  async list(estado: string | null, idUsuario: number | null, limit: number, offset: number): Promise<OrderDbRow[]> {
    return AppDataSource.query('SELECT * FROM fn_listar_ordenes($1,$2,$3,$4)', [estado, idUsuario, limit, offset]);
  }

  async updateStatus(idOrden: number, estado: string, idUsuario: number): Promise<void> {
    await AppDataSource.query('SELECT sp_actualizar_estado_orden($1,$2,$3)', [idOrden, estado, idUsuario]);
  }
}
