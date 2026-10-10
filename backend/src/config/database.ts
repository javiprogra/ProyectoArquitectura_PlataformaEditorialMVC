import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from './env';

// TODO(modelo): importar y registrar las entidades TypeORM aquí
// import { User } from '../models/entities/User';

export const AppDataSource = new DataSource({
  type: 'mssql',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  // NUNCA usar synchronize: true en equipo — el esquema se maneja con migraciones
  synchronize: false,
  logging: env.NODE_ENV === 'development',
  entities: [
    // TODO(modelo): agregar las rutas de las entidades
  ],
  migrations: ['src/models/migrations/**/*.ts'],
});
