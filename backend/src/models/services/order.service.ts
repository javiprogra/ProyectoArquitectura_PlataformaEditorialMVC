import { OrderRepository, type CalcDbRow, type CartLine, type OrderDbRow } from '../repositories/order.repository';
import type { OrderCalculationDto, OrderDto } from '../../dto/order.dto';
import { ORDER_STATUS_ES_TO_EN, ORDER_STATUS_EN_TO_ES } from '../../constants/status';
import { HttpError } from '../../utils/httpError';

const round2 = (n: number): number => Math.round(n * 100) / 100;

export class OrderService {
  constructor(private readonly repo = new OrderRepository()) {}

  async calculate(idCliente: number | null, items: CartLine[]): Promise<OrderCalculationDto> {
    const r = await this.repo.calculateTotals(idCliente, items);
    return this.calcToDto(r);
  }

  async create(idUsuario: number, items: CartLine[]): Promise<OrderDto | null> {
    const id = await this.repo.createDirect(idUsuario, items);
    return this.getById(id);
  }

  async getById(id: number): Promise<OrderDto | null> {
    const row = await this.repo.findById(id);
    return row ? this.toDto(row) : null;
  }

  async list(estadoEn: string | null, idUsuario: number | null, limit: number, offset: number): Promise<OrderDto[]> {
    const estadoEs = estadoEn ? (ORDER_STATUS_EN_TO_ES[estadoEn] ?? null) : null;
    const rows = await this.repo.list(estadoEs, idUsuario, limit, offset);
    return rows.map((r) => this.toDto(r));
  }

  async updateStatus(id: number, statusEn: string, idUsuario: number): Promise<void> {
    const estadoEs = ORDER_STATUS_EN_TO_ES[statusEn];
    if (!estadoEs) throw new HttpError(400, 'Estado inválido');
    await this.repo.updateStatus(id, estadoEs, idUsuario);
  }

  private calcToDto(r: CalcDbRow): OrderCalculationDto {
    const pv = Number(r.pct_volumen);
    const pc = Number(r.pct_cliente);
    return {
      subtotalBase: Number(r.subtotal_base),
      totalUnits: r.cantidad_total,
      volumeDiscountPercentage: pv,
      volumeDiscountAmount: Number(r.descuento_volumen),
      clientDiscountPercentage: pc,
      clientDiscountAmount: Number(r.descuento_cliente),
      taxes: Number(r.impuesto),
      totalFinal: Number(r.total_final),
      appliedRulesDetail: `Volumen: ${r.cantidad_total} unidades (${pv}% desc). Cliente: ${pc > 0 ? 'Institucional (8% adicional)' : 'Minorista (0%)'}`,
    };
  }

  private toDto(r: OrderDbRow): OrderDto {
    const subtotalBase = Number(r.subtotal_base);
    return {
      id: r.id_orden,
      userId: r.id_usuario,
      userName: r.usuario,
      items: (r.items ?? []).map((i) => ({
        bookId: i.bookId,
        title: i.title,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
      subtotalBase,
      volumeDiscountPercentage: subtotalBase === 0 ? 0 : round2((Number(r.descuento_volumen) / subtotalBase) * 100),
      volumeDiscountAmount: Number(r.descuento_volumen),
      clientDiscountPercentage: subtotalBase === 0 ? 0 : round2((Number(r.descuento_cliente) / subtotalBase) * 100),
      clientDiscountAmount: Number(r.descuento_cliente),
      taxes: Number(r.impuesto),
      totalFinal: Number(r.total_final),
      status: ORDER_STATUS_ES_TO_EN[r.estado] ?? r.estado,
      createdAt: new Date(r.fecha).toISOString(),
    };
  }
}
