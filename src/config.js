import 'dotenv/config';

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  port: toNumber(process.env.PORT, 3000),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: toNumber(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'chatbot',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-solo-para-desarrollo',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
};
