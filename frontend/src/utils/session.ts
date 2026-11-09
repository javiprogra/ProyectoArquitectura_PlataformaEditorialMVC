import type { Role, User } from '../services/mockService';

const ROLES: Role[] = ['visitor', 'retail_client', 'institutional_client', 'sales_advisor', 'admin'];

const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && ROLES.includes(value as Role);

export const getCurrentUser = (): User | null => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<User>;
    if (
      typeof parsed.id !== 'number' ||
      typeof parsed.name !== 'string' ||
      typeof parsed.email !== 'string' ||
      !isRole(parsed.role)
    ) {
      return null;
    }
    return parsed as User;
  } catch {
    return null;
  }
};

export const getCurrentRole = (): Role => getCurrentUser()?.role ?? 'visitor';

export const isInstitutionalClient = (): boolean => getCurrentRole() === 'institutional_client';

export const clearSession = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};
