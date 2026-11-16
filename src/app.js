import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAuth } from './auth.js';
import { answerQuestion, extractOrderId } from './chatAnswers.js';
import { chatQuestions } from './chatMenu.js';
import { verifyPassword } from './passwords.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(currentDir, '..', 'public');

const ORDER_ID_PATTERN = /^[A-Z0-9-]{4,32}$/;

/**
 * Crea la aplicación Express.
 * Los repositorios se inyectan para poder probar la API sin una base de datos real.
 */
export function createApp({
  orderRepository,
  userRepository,
  jwtSecret,
  jwtExpiresIn = '1h',
  logger = console,
} = {}) {
  if (!orderRepository) {
    throw new Error('orderRepository is required');
  }
  if (!userRepository) {
    throw new Error('userRepository is required');
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

  // RF_01: inicio de sesión con nombre y contraseña.
  app.post('/api/auth/login', async (req, res, next) => {
    const { username, password } = req.body || {};

    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      username.trim() === '' ||
      password === ''
    ) {
      return res.status(400).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Escribe tu nombre y contraseña.',
        },
      });
    }

    try {
      const user = await userRepository.findByUsername(username.trim());

      if (!user || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'El nombre o la contraseña no son correctos.',
          },
        });
      }

      const token = auth.issueToken({
        sub: String(user.id),
        username: user.username,
        displayName: user.displayName,
        role: 'customer',
      });

      res.set('Cache-Control', 'no-store');
      return res.json({
        token,
        tokenType: 'Bearer',
        expiresIn: jwtExpiresIn,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/auth/me', auth.requireAuth, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({
      user: {
        id: req.auth.sub,
        username: req.auth.username,
        displayName: req.auth.displayName,
      },
    });
  });

  // RF_03: menú de preguntas del chatbot.
  app.get('/api/chat/menu', auth.requireAuth, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ questions: chatQuestions });
  });

  // RF_04: consulta del estatus y la ubicación de un pedido por su ID.
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
      const order = await orderRepository.findById(orderId, req.auth.sub);

      if (!order) {
        return res.status(404).json({
          error: {
            code: 'ORDER_NOT_FOUND',
            message:
              'No encontramos un pedido con ese ID asociado a tu cuenta. Verifica el número e inténtalo de nuevo.',
          },
        });
      }

      res.set('Cache-Control', 'no-store');
      return res.json({ order });
    } catch (error) {
      return next(error);
    }
  });

  // RF_05: respuesta a dudas generales sobre el pedido.
  app.post('/api/chat/ask', auth.requireAuth, async (req, res, next) => {
    const rawQuestion = req.body?.question;

    if (typeof rawQuestion !== 'string' || rawQuestion.trim() === '') {
      return res.status(400).json({
        error: {
          code: 'INVALID_QUESTION',
          message: 'Escribe tu duda para que podamos responderla.',
        },
      });
    }

    const question = rawQuestion.trim();
    if (question.length > 500) {
      return res.status(400).json({
        error: {
          code: 'INVALID_QUESTION',
          message: 'Tu duda es demasiado larga. Resúmela en 500 caracteres o menos.',
        },
      });
    }

    try {
      const orderId = extractOrderId(question);
      const order = orderId
        ? await orderRepository.findById(orderId, req.auth.sub)
        : null;

      const result = answerQuestion(question, {
        order,
        displayName: req.auth.displayName,
      });

      res.set('Cache-Control', 'no-store');
      return res.json(result);
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
