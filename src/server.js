import { config } from './config.js';
import { openDatabase, applySchema } from './db/sqlite.js';
import { createSqliteOrderRepository } from './db/sqliteOrderRepository.js';
import { createSqliteUserRepository } from './db/sqliteUserRepository.js';
import { createApp } from './app.js';

const db = openDatabase(config.sqlitePath);
applySchema(db);

// Detecta bases creadas con el esquema anterior (sin usuarios ni pedidos por usuario).
const orderColumns = db.prepare("SELECT name FROM pragma_table_info('orders')").all();
if (!orderColumns.some((column) => column.name === 'user_id')) {
  console.error(
    'La base de datos tiene un esquema anterior. Ejecuta "npm run db:init" para actualizarla.'
  );
  db.close();
  process.exit(1);
}

const orderRepository = createSqliteOrderRepository(db);
const userRepository = createSqliteUserRepository(db);
const app = createApp({
  orderRepository,
  userRepository,
  jwtSecret: config.jwtSecret,
  jwtExpiresIn: config.jwtExpiresIn,
});

if (!process.env.JWT_SECRET) {
  console.warn(
    '[aviso] JWT_SECRET no está definido. Se usa una clave de desarrollo; configúrala en .env antes de publicar.'
  );
}

const server = app.listen(config.port, () => {
  console.log(`ChatBot de pedidos disponible en http://localhost:${config.port}`);
  console.log(`Base de datos SQLite: ${config.sqlitePath}`);
});

async function shutdown(signal) {
  console.log(`\n${signal} recibido. Cerrando servidor…`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
