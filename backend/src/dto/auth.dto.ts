import type { AuthUser } from '../types/auth.types';

export interface RegisterResponseDto {
  id: number;
}

export interface LoginResponseDto {
  token: string;
  user: AuthUser;
}

export interface MeResponseDto {
  user: AuthUser;
}
