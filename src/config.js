import 'dotenv/config';

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  port: toNumber(process.env.PORT, 3000),
  sqlitePath: process.env.SQLITE_PATH || './data/chatbot.db',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-solo-para-desarrollo',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
};
