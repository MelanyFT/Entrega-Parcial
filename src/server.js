import { config } from './config.js';
import { createPool } from './db/pool.js';
import { createMysqlOrderRepository } from './db/mysqlOrderRepository.js';
import { createApp } from './app.js';

const pool = createPool(config.db);
const orderRepository = createMysqlOrderRepository(pool);
const app = createApp({
  orderRepository,
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
});

async function shutdown(signal) {
  console.log(`\n${signal} recibido. Cerrando servidor…`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
