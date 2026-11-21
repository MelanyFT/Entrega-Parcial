#!/usr/bin/env node
/**
 * Crea (o reinicia) la base de datos SQLite del chatbot.
 *
 * Uso:
 *   node scripts/create-database.js                 # crea la BD si no existe
 *   node scripts/create-database.js --reset         # borra y vuelve a crear la BD
 *   node scripts/create-database.js --path <ruta>   # usa una ruta distinta
 *
 * La ruta por defecto se toma de SQLITE_PATH (.env) o ./data/chatbot.db.
 * El archivo .env no se modifica.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../src/config.js';
import { openDatabase, applySchema } from '../src/db/sqlite.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = path.join(rootDir, 'db', 'schema.sql');
const seedPath = path.join(rootDir, 'db', 'seed.sql');

function parseArguments(argv) {
  const options = { reset: false, path: config.sqlitePath, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--reset' || argument === '-r') {
      options.reset = true;
    } else if (argument === '--help' || argument === '-h') {
      options.help = true;
    } else if (argument === '--path' || argument === '-p') {
      const next = argv[index + 1];
      if (!next) throw new Error('Falta la ruta después de --path.');
      options.path = next;
      index += 1;
    } else if (argument.startsWith('--path=')) {
      options.path = argument.slice('--path='.length);
    } else {
      throw new Error(`Opción desconocida: ${argument}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Uso: node scripts/create-database.js [opciones]

Opciones:
  --reset, -r          Borra la BD existente y la vuelve a crear con datos de prueba.
  --path, -p <ruta>    Ruta del archivo SQLite (por defecto: ${config.sqlitePath}).
  --help, -h           Muestra esta ayuda.

Ejemplos:
  node scripts/create-database.js
  node scripts/create-database.js --reset
  node scripts/create-database.js --path ./data/pruebas.db --reset
`);
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function removeDatabaseFiles(databasePath) {
  if (databasePath === ':memory:') return;

  for (const suffix of ['', '-wal', '-shm']) {
    await fs.rm(databasePath + suffix, { force: true });
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const databasePath = path.resolve(options.path);
  const alreadyExists = await exists(databasePath);

  if (alreadyExists && !options.reset) {
    console.log(`La base de datos ya existe: ${databasePath}`);
    console.log('Usa --reset si deseas borrarla y cargar los datos de prueba de nuevo.');
    return;
  }

  if (alreadyExists && options.reset) {
    await removeDatabaseFiles(databasePath);
    console.log('Base de datos anterior eliminada.');
  }

  const db = openDatabase(databasePath);

  try {
    applySchema(db);

    const seed = await fs.readFile(seedPath, 'utf8');
    db.exec(seed);

    const { users } = db.prepare('SELECT COUNT(*) AS users FROM users').get();
    const { orders } = db.prepare('SELECT COUNT(*) AS orders FROM orders').get();

    console.log(`Base de datos creada: ${databasePath}`);
    console.log(`Esquema aplicado:     ${schemaPath}`);
    console.log(`Datos cargados:       ${seedPath}`);
    console.log(`Usuarios: ${users} | Pedidos: ${orders}`);
    console.log('Contraseña de los usuarios de prueba: pedidos123');
  } finally {
    db.close();
  }
}

main().catch((error) => {
  if (error && (error.code === 'EBUSY' || error.code === 'EPERM')) {
    console.error(
      'No se pudo crear la base porque el archivo está bloqueado. Detén el servidor y vuelve a intentarlo.'
    );
  } else {
    console.error('No se pudo crear la base de datos:', error.message);
  }
  process.exitCode = 1;
});
