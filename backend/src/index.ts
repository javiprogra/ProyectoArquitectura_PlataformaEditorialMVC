import 'reflect-metadata';
import app from './app';
import { env } from './config/env';
import { AppDataSource } from './config/database';

const PORT = env.PORT;

AppDataSource.initialize()
  .then(() => {
    console.log('✅ Conexión a PostgreSQL (Supabase) establecida.');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Backend corriendo en http://127.0.0.1:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Error al conectar con la base de datos:', error);
    process.exit(1);
  });
