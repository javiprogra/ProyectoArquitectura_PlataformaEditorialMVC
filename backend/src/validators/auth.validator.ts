import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().email('Email inválido').max(100),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(100),
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  role: z.enum(['retail_client', 'institutional_client'], {
    errorMap: () => ({ message: 'Rol inválido' }),
  }),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Email inválido').max(100),
  password: z.string().min(1, 'La contraseña es obligatoria').max(100),
});
