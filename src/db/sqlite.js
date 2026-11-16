import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const schemaPath = new URL('../../db/schema.sql', import.meta.url);

/**
 * Abre (o crea) la base de datos SQLite y aplica la configuración básica.
 * La ruta puede ser un archivo o ":memory:" para pruebas.
 */
export function openDatabase(databasePath) {
  let resolvedPath = databasePath;

  if (databasePath !== ':memory:') {
    resolvedPath = path.resolve(databasePath);
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  }

  const db = new DatabaseSync(resolvedPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');

  if (databasePath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }

  return db;
}

/** Crea la tabla orders si todavía no existe. */
export function applySchema(db) {
  db.exec(fs.readFileSync(schemaPath, 'utf8'));
}
