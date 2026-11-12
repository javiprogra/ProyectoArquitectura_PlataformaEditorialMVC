import { AdminRepository, type MetricsDbRow, type UserDbRow } from '../repositories/admin.repository';
import type { AdminMetricsDto, UserDto } from '../../dto/admin.dto';
import { toRoleCode } from '../../constants/roles';

export class AdminService {
  constructor(private readonly repo = new AdminRepository()) {}

  async listUsers(): Promise<UserDto[]> {
    const rows = await this.repo.listUsers(500, 0);
    return rows.map((r) => this.userToDto(r));
  }

  async setUserStatus(id: number, estado: boolean): Promise<void> {
    await this.repo.setUserStatus(id, estado);
  }

  async createRole(nombre: string): Promise<number> {
    return this.repo.createRole(nombre);
  }

  async assignRole(idUsuario: number, idRol: number, idAdmin: number | null): Promise<void> {
    await this.repo.assignRole(idUsuario, idRol, idAdmin);
  }

  async deleteRole(idRol: number): Promise<void> {
    await this.repo.deleteRole(idRol);
  }

  async applyAdjustment(id: number, delta: number, idUsuario: number | null, motivo: string | null): Promise<void> {
    await this.repo.adjustStock(id, delta, idUsuario, motivo);
  }

  async metrics(): Promise<AdminMetricsDto> {
    const r = await this.repo.metrics();
    return {
      totalTitles: Number(r.total_titulos),
      totalStock: Number(r.total_stock),
      inventoryValue: Number(r.valor_inventario),
      lowStockAlerts: Number(r.alertas_stock),
      totalOrders: Number(r.total_ordenes),
      totalRequests: Number(r.total_solicitudes),
      totalQuotes: Number(r.total_cotizaciones),
    };
  }

  private userToDto(r: UserDbRow): UserDto {
    return {
      id: r.id_usuario,
      name: `${r.nombre} ${r.apellido}`.trim(),
      email: r.usuario,
      role: toRoleCode(r.rol),
      estado: r.estado,
      idCliente: r.id_cliente,
    };
  }
}
