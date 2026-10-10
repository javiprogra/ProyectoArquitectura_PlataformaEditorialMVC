import 'reflect-metadata';
import app from './app';
import { env } from './config/env';
import { AppDataSource } from './config/database';

const PORT = env.PORT;

AppDataSource.initialize()
  .then(() => {
    console.log('✅ Conexión a SQL Server establecida.');
    app.listen(PORT, () => {
      console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Error al conectar con la base de datos:', error);
    process.exit(1);
  });
