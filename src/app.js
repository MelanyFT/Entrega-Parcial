import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAuth } from './auth.js';
import { chatQuestions } from './chatMenu.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(currentDir, '..', 'public');

const ORDER_ID_PATTERN = /^[A-Z0-9-]{4,32}$/;

/**
 * Crea la aplicación Express.
 * El repositorio se inyecta para poder probar la API sin una base de datos real.
 */
export function createApp({
  orderRepository,
  jwtSecret,
  jwtExpiresIn = '1h',
  logger = console,
} = {}) {
  if (!orderRepository) {
    throw new Error('orderRepository is required');
  }

  const app = express();
  const auth = createAuth({ secret: jwtSecret, expiresIn: jwtExpiresIn });

  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'no-referrer');
    next();
  });
  app.use(express.static(publicDir, { extensions: ['html'] }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Emite un JWT de invitado para que el widget pueda consultar el chat.
  app.post('/api/auth/guest', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({
      token: auth.issueGuestToken(),
      tokenType: 'Bearer',
      expiresIn: jwtExpiresIn,
    });
  });

  // RF_02: menú de preguntas del chatbot.
  app.get('/api/chat/menu', auth.requireAuth, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ questions: chatQuestions });
  });

  // RF_03: consulta del estatus y la ubicación de un pedido por su ID.
  app.post('/api/orders/track', auth.requireAuth, async (req, res, next) => {
    const rawOrderId = req.body?.orderId;

    if (typeof rawOrderId !== 'string' || rawOrderId.trim() === '') {
      return res.status(400).json({
        error: {
          code: 'INVALID_ORDER_ID',
          message: 'Escribe el ID del pedido para consultarlo.',
        },
      });
    }

    const orderId = rawOrderId.trim().toUpperCase();
    if (!ORDER_ID_PATTERN.test(orderId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ORDER_ID',
          message: 'El ID del pedido no tiene un formato válido. Ejemplo: PED-1001.',
        },
      });
    }

    try {
      const order = await orderRepository.findById(orderId);

      if (!order) {
        return res.status(404).json({
          error: {
            code: 'ORDER_NOT_FOUND',
            message:
              'No encontramos un pedido con ese ID. Verifica el número e inténtalo de nuevo.',
          },
        });
      }

      res.set('Cache-Control', 'no-store');
      return res.json({ order });
    } catch (error) {
      return next(error);
    }
  });

  app.use('/api', (req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Recurso no encontrado.' },
    });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    if (error?.type === 'entity.parse.failed') {
      return res.status(400).json({
        error: { code: 'INVALID_JSON', message: 'El cuerpo de la solicitud no es válido.' },
      });
    }

    logger.error?.(error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ocurrió un error inesperado. Intenta de nuevo.',
      },
    });
  });

  return app;
}
