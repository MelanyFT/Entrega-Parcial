import mysql from 'mysql2/promise';

export function createPool(dbConfig) {
  return mysql.createPool({
    ...dbConfig,
    charset: 'utf8mb4',
  });
}
