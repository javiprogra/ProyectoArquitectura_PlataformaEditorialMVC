import path from 'node:path';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from './env';

// Detecta si se ejecuta vía ts-node (src) o desde el build (dist) para apuntar
// las rutas de entidades y migraciones a la extensión correcta.
const ext = __filename.endsWith('.ts') ? 'ts' : 'js';

// Normaliza separadores para que el glob de TypeORM funcione en Windows.
const glob = (dir: string, pattern: string) =>
  path.join(__dirname, '..', dir, pattern).replace(/\\/g, '/');

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: env.DB_LOGGING ? ['query', 'error', 'warn'] : ['error', 'warn'],
  entities: [glob('models', `entities/*.${ext}`)],
  migrations: [glob('models', `migrations/*.${ext}`)],
  extra: {
    max: env.DB_POOL_MAX,
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 30_000,
    application_name: 'lumina-backend',
  },
});
