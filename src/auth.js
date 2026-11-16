import jwt from 'jsonwebtoken';

const ISSUER = 'chatbot-pedidos';

export function createAuth({ secret, expiresIn = '1h' }) {
  if (!secret) {
    throw new Error('JWT secret is required');
  }

  return {
    issueToken(payload) {
      return jwt.sign(payload, secret, {
        issuer: ISSUER,
        expiresIn,
      });
    },

    requireAuth(req, res, next) {
      const header = req.get('authorization') || '';
      const [scheme, token] = header.split(' ');

      if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Necesitas iniciar sesión para consultar el chat.',
          },
        });
      }

      try {
        req.auth = jwt.verify(token, secret, { issuer: ISSUER });
        return next();
      } catch {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Tu sesión expiró. Inicia sesión de nuevo.',
          },
        });
      }
    },
  };
}
