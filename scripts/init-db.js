import fs from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { config } from '../src/config.js';

const { host, port, user, password, database } = config.db;

async function main() {
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });

  try {
    const schema = (
      await fs.readFile(new URL('../db/schema.sql', import.meta.url), 'utf8')
    )
      .replace(
        'CREATE DATABASE IF NOT EXISTS chatbot',
        `CREATE DATABASE IF NOT EXISTS \`${database}\``
      )
      .replace('USE chatbot;', `USE \`${database}\`;`);
    const seed = (await fs.readFile(new URL('../db/seed.sql', import.meta.url), 'utf8')).replace(
      'USE chatbot;',
      `USE \`${database}\`;`
    );

    await connection.query(schema);
    await connection.query(seed);
    console.log(`Base de datos "${database}" inicializada con pedidos de prueba.`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('No se pudo inicializar la base de datos:', error.message);
  process.exitCode = 1;
});
