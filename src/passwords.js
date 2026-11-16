import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

/**
 * Genera un hash con sal para almacenar contraseñas.
 * Formato: "<sal>:<hash>".
 */
export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const derived = scryptSync(password, salt, KEY_LENGTH);
  return `${salt}:${derived.toString('hex')}`;
}

/** Compara una contraseña con el hash almacenado en tiempo constante. */
export function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || typeof storedHash !== 'string') return false;

  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;

  const expected = Buffer.from(hash, 'hex');
  const derived = scryptSync(password, salt, KEY_LENGTH);

  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}
