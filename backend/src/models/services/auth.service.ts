import { AuthRepository } from '../repositories/auth.repository';
import { hashPassword, verifyPassword } from '../../utils/password';
import { signToken } from '../../utils/jwt';
import { HttpError } from '../../utils/httpError';
import { toRoleCode } from '../../constants/roles';
import type { AuthUser, AuthUserDbRow, JwtPayload, LoginInput, RegisterInput } from '../../types/auth.types';
import type { LoginResponseDto, MeResponseDto, RegisterResponseDto } from '../../dto/auth.dto';

const ROLE_TO_TIPO: Record<'retail_client' | 'institutional_client', number> = {
  retail_client: 1,
  institutional_client: 2,
};
const ROLE_TO_ROL_ID: Record<'retail_client' | 'institutional_client', number> = {
  retail_client: 2,
  institutional_client: 3,
};

export class AuthService {
  constructor(private readonly repo = new AuthRepository()) {}

  async register(input: RegisterInput): Promise<RegisterResponseDto> {
    const passwordHash = await hashPassword(input.password);
    let nombre = input.firstName?.trim() ?? '';
    let apellido = input.lastName?.trim() ?? '';
    if ((!nombre || !apellido) && input.name) {
      const [first, ...rest] = input.name.trim().split(/\s+/);
      nombre = nombre || first || '';
      apellido = apellido || rest.join(' ');
    }
    const telefono = input.phone?.trim() || null;
    const direccion = input.address?.trim() || null;
    const result = await this.repo.createUserClient({
      usuario: input.email,
      password_hash: passwordHash,
      nombre,
      apellido,
      telefono,
      direccion,
      id_rol: ROLE_TO_ROL_ID[input.role],
      id_tipo_cliente: ROLE_TO_TIPO[input.role],
    });
    return { id: result.id_usuario };
  }

  async login(input: LoginInput): Promise<LoginResponseDto> {
    const row = await this.repo.findByUsername(input.email);
    if (!row) throw new HttpError(401, 'Credenciales inválidas');
    if (!row.estado) throw new HttpError(403, 'Cuenta desactivada');
    const role = toRoleCode(row.rol);
    if (role === 'visitor') {
      throw new HttpError(403, 'El rol Visitante no utiliza una cuenta autenticada');
    }
    const valid = await verifyPassword(input.password, row.password_hash);
    if (!valid) throw new HttpError(401, 'Credenciales inválidas');

    const payload: JwtPayload = {
      sub: row.id_usuario,
      email: row.usuario,
      name: this.fullName(row),
      role,
      id_rol: row.id_rol,
      id_cliente: row.id_cliente,
      id_tipo_cliente: row.id_tipo_cliente,
    };
    return { token: signToken(payload), user: this.toAuthUser(row) };
  }

  async getProfile(email: string): Promise<MeResponseDto> {
    const row = await this.repo.findByUsername(email);
    if (!row || !row.estado) throw new HttpError(401, 'Sesión inválida o cuenta desactivada');
    return { user: this.toAuthUser(row) };
  }

  private fullName(row: AuthUserDbRow): string {
    return `${row.nombre} ${row.apellido}`.trim();
  }

  private toAuthUser(row: AuthUserDbRow): AuthUser {
    return {
      id: row.id_usuario,
      name: this.fullName(row),
      email: row.usuario,
      role: toRoleCode(row.rol),
      descuento_cliente: row.descuento_cliente === null ? 0 : Number(row.descuento_cliente),
    };
  }
}
