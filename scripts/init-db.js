import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../src/config.js';
import { openDatabase, applySchema } from '../src/db/sqlite.js';

async function resetDatabaseFile(databasePath) {
  if (databasePath === ':memory:') return;

  const absolutePath = path.resolve(databasePath);
  for (const suffix of ['', '-wal', '-shm']) {
    await fs.rm(absolutePath + suffix, { force: true });
  }
}

async function main() {
  // La base contiene datos de prueba: se reinicia para aplicar el esquema actual.
  await resetDatabaseFile(config.sqlitePath);

  const db = openDatabase(config.sqlitePath);

  try {
    applySchema(db);

    const seed = await fs.readFile(new URL('../db/seed.sql', import.meta.url), 'utf8');
    db.exec(seed);

    const { orders } = db.prepare('SELECT COUNT(*) AS orders FROM orders').get();
    const { users } = db.prepare('SELECT COUNT(*) AS users FROM users').get();

    console.log(
      `Base de datos SQLite "${config.sqlitePath}" reiniciada con ${users} usuarios y ${orders} pedidos de prueba.`
    );
  } finally {
    db.close();
  }
}

main().catch((error) => {
  if (error && (error.code === 'EBUSY' || error.code === 'EPERM')) {
    console.error(
      'No se pudo reiniciar la base de datos porque el servidor está en ejecución. Detén el servidor y vuelve a intentarlo.'
    );
  } else {
    console.error('No se pudo inicializar la base de datos:', error.message);
  }
  process.exitCode = 1;
});
