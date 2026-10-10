import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: Number(process.env.PORT) || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: Number(process.env.DB_PORT) || 1433,
  DB_USER: process.env.DB_USER || 'sa',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'PlataformaEditorial',
  JWT_SECRET: process.env.JWT_SECRET || 'cambia-este-secreto',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
};
