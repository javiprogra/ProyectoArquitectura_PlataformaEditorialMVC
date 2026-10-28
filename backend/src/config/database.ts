import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from './env';

// importar y registrar las entidades TypeORM aquí
// import { User } from '../models/entities/User';

export const AppDataSource = new DataSource({
  type: 'postgres', 
  url: env.DATABASE_URL, //URL de conexión de Supabase
  ssl: {
    rejectUnauthorized: false, //conexiones seguras en la nube con Supabase
  },
  synchronize: false,
  logging: env.NODE_ENV === 'development',
  entities: [
    //agregar las rutas de las entidades
  ],
  migrations: ['src/models/migrations/**/*.ts'],
});
