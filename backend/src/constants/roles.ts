// Mapeo de roles: código EN (API/frontend) ↔ nombre ES (base de datos).

export type RoleCode = 'visitor' | 'retail_client' | 'institutional_client' | 'sales_advisor' | 'admin';

export const ROLE_CODE_BY_NAME: Record<string, RoleCode> = {
  Visitante: 'visitor',
  'Cliente Minorista': 'retail_client',
  'Cliente Institucional/Mayorista': 'institutional_client',
  'Asesor de Ventas': 'sales_advisor',
  Administrador: 'admin',
};

export const ROLE_NAME_BY_CODE: Record<RoleCode, string> = {
  visitor: 'Visitante',
  retail_client: 'Cliente Minorista',
  institutional_client: 'Cliente Institucional/Mayorista',
  sales_advisor: 'Asesor de Ventas',
  admin: 'Administrador',
};

export const toRoleCode = (name: string): RoleCode => ROLE_CODE_BY_NAME[name] ?? 'visitor';

export const toRoleName = (code: RoleCode): string => ROLE_NAME_BY_CODE[code];
