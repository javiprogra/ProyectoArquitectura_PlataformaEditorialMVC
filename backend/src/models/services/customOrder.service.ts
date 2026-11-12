import { CustomOrderRepository, type SolicitudDbRow, type SolicitudItem } from '../repositories/customOrder.repository';
import type { CustomOrderDto } from '../../dto/customOrder.dto';
import { SOLICITUD_STATUS_ES_TO_EN, SOLICITUD_STATUS_EN_TO_ES } from '../../constants/status';
import type { AuthenticatedUser } from '../../types/auth.types';
import { HttpError } from '../../utils/httpError';

export interface CreateCustomOrderInput {
  bookId?: number | null;
  bookTitle: string;
  quantity: number;
  coverFinish?: string | null;
  paperType?: string | null;
  requiredDate: string;
  notes?: string | null;
}

export class CustomOrderService {
  constructor(private readonly repo = new CustomOrderRepository()) {}

  async create(input: CreateCustomOrderInput, user: AuthenticatedUser): Promise<CustomOrderDto> {
    const idCliente = user.id_cliente;
    if (!idCliente) throw new HttpError(403, 'Solo los clientes pueden enviar solicitudes');

    const items: SolicitudItem[] | null = input.bookId
      ? [{ id_libro: input.bookId, cantidad_estimada: input.quantity, acabado_portada: input.coverFinish ?? null, tipo_papel: input.paperType ?? null }]
      : null;
    const tituloPersonalizado = input.bookId ? null : input.bookTitle;
    const notas = [input.coverFinish, input.paperType, input.notes].filter(Boolean).join(' | ') || null;

    const id = await this.repo.create(idCliente, input.requiredDate, items, tituloPersonalizado, notas);

    return {
      id,
      userId: user.id_usuario,
      clientName: user.name,
      clientEmail: user.usuario,
      bookId: input.bookId ?? null,
      bookTitle: input.bookTitle,
      quantity: input.quantity,
      coverFinish: input.coverFinish ?? '',
      paperType: input.paperType ?? '',
      requiredDate: input.requiredDate,
      notes: input.notes ?? '',
      status: 'pendiente',
      createdAt: new Date().toISOString(),
    };
  }

  async list(estadoEn: string | null): Promise<CustomOrderDto[]> {
    const estadoEs = estadoEn ? (SOLICITUD_STATUS_EN_TO_ES[estadoEn] ?? null) : null;
    const rows = await this.repo.list(estadoEs);
    return rows.map((r) => this.toDto(r));
  }

  async updateStatus(id: number, statusEn: string, idUsuario: number): Promise<void> {
    const estadoEs = SOLICITUD_STATUS_EN_TO_ES[statusEn];
    if (!estadoEs) throw new HttpError(400, 'Estado inválido');
    await this.repo.updateStatus(id, estadoEs, idUsuario);
  }

  private toDto(r: SolicitudDbRow): CustomOrderDto {
    return {
      id: r.id_solicitud,
      userId: r.id_usuario,
      clientName: r.cliente,
      clientEmail: r.cliente_email,
      bookId: r.id_libro,
      bookTitle: r.titulo ?? '',
      quantity: r.cantidad_estimada ?? 0,
      coverFinish: r.acabado_portada ?? '',
      paperType: r.tipo_papel ?? '',
      requiredDate: r.fecha_requerida,
      notes: r.notas ?? '',
      status: SOLICITUD_STATUS_ES_TO_EN[r.estado] ?? r.estado,
      createdAt: new Date(r.fecha_solicitud).toISOString(),
    };
  }
}
