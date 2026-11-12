import { QuoteRepository, type QuoteDbRow } from '../repositories/quote.repository';
import type { QuoteDto } from '../../dto/quote.dto';
import { COTIZACION_STATUS_ES_TO_EN, COTIZACION_STATUS_EN_TO_ES } from '../../constants/status';
import { HttpError } from '../../utils/httpError';

export interface CreateQuoteInput {
  requestId: number;
  unitPrice: number;
  validUntil?: string | null;
  notes?: string | null;
}

export class QuoteService {
  constructor(private readonly repo = new QuoteRepository()) {}

  async generate(input: CreateQuoteInput, idUsuario: number): Promise<QuoteDto> {
    const id = await this.repo.generate(
      input.requestId,
      idUsuario,
      input.unitPrice,
      input.validUntil ?? null,
      input.notes ?? null,
    );
    const all = await this.repo.list(500, 0);
    const row = all.find((r) => r.id_cotizacion === id);
    if (!row) throw new HttpError(500, 'Error al recuperar la cotización');
    return this.toDto(row);
  }

  async list(): Promise<QuoteDto[]> {
    const rows = await this.repo.list(500, 0);
    return rows.map((r) => this.toDto(r));
  }

  async updateStatus(id: number, statusEn: string, idUsuario: number): Promise<void> {
    const estadoEs = COTIZACION_STATUS_EN_TO_ES[statusEn];
    if (!estadoEs) throw new HttpError(400, 'Estado inválido');
    await this.repo.updateStatus(id, estadoEs, idUsuario);
  }

  async convertToOrder(idCotizacion: number, idUsuario: number): Promise<number> {
    return this.repo.convertToOrder(idCotizacion, idUsuario);
  }

  private toDto(r: QuoteDbRow): QuoteDto {
    const subtotal = Number(r.subtotal);
    const dv = Number(r.descuento_volumen);
    const dc = Number(r.descuento_cliente);
    return {
      id: r.id_cotizacion,
      requestId: r.id_solicitud,
      advisorId: r.id_usuario,
      advisorName: r.asesor,
      clientName: r.cliente,
      bookTitle: r.titulo ?? '',
      quantity: r.cantidad ?? 0,
      unitPrice: Number(r.precio_unitario ?? 0),
      subtotal,
      volumeDiscountPercentage: subtotal === 0 ? 0 : Math.round((dv / subtotal) * 10000) / 100,
      volumeDiscountAmount: dv,
      clientDiscountPercentage: subtotal === 0 ? 0 : Math.round((dc / subtotal) * 10000) / 100,
      clientDiscountAmount: dc,
      tax: Number(r.impuesto),
      total: Number(r.total),
      validUntil: r.vigencia,
      notes: r.notas ?? '',
      status: COTIZACION_STATUS_ES_TO_EN[r.estado] ?? r.estado,
      createdAt: new Date(r.fecha).toISOString(),
    };
  }
}
