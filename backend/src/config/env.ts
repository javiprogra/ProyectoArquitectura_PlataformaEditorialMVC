import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: Number(process.env.PORT) || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  // URL de conexión de Postgres/Supabase
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'cambia-este-secreto',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
};
