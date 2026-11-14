import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import {
  InMemoryOrderRepository,
  sampleOrders,
} from './support/inMemoryOrderRepository.js';

const app = createApp({
  orderRepository: new InMemoryOrderRepository(sampleOrders),
  jwtSecret: 'secreto-de-pruebas',
  jwtExpiresIn: '1h',
  logger: { error() {} },
});

async function getGuestToken() {
  const response = await request(app).post('/api/auth/guest').expect(200);
  assert.equal(response.body.tokenType, 'Bearer');
  assert.ok(response.body.token, 'La respuesta debe incluir un JWT');
  return response.body.token;
}

test('PA-01: la página principal muestra la opción "Consultar CHATBOT"', async () => {
  const response = await request(app).get('/').expect(200);

  assert.match(response.headers['content-type'], /text\/html/);
  assert.match(response.text, /Consultar CHATBOT/);
  assert.match(response.text, /id="chat-launcher"/);
  assert.match(response.text, /id="chat-panel"/);
});

test('PA-01: los recursos del widget se sirven correctamente', async () => {
  const script = await request(app).get('/chatbot.js').expect(200);
  const styles = await request(app).get('/styles.css').expect(200);

  assert.match(script.headers['content-type'], /javascript/);
  assert.match(styles.headers['content-type'], /text\/css/);
});

test('PA-02: el menú de preguntas se obtiene con una sesión JWT', async () => {
  const token = await getGuestToken();

  const response = await request(app)
    .get('/api/chat/menu')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.ok(Array.isArray(response.body.questions));
  assert.ok(response.body.questions.length >= 1);

  const firstQuestion = response.body.questions[0];
  assert.equal(firstQuestion.type, 'order-id');
  assert.match(firstQuestion.label, /Ingresa el ID del pedido/);
  assert.match(firstQuestion.prompt, /en dónde se encuentra mi pedido/);
});

test('PA-02: el menú exige un JWT válido', async () => {
  await request(app).get('/api/chat/menu').expect(401);

  const invalid = await request(app)
    .get('/api/chat/menu')
    .set('Authorization', 'Bearer token-invalido')
    .expect(401);

  assert.equal(invalid.body.error.code, 'UNAUTHORIZED');
});

test('PA-03: consultar un pedido existente devuelve su estatus y ubicación', async () => {
  const token = await getGuestToken();

  const response = await request(app)
    .post('/api/orders/track')
    .set('Authorization', `Bearer ${token}`)
    .send({ orderId: 'PED-1001' })
    .expect(200);

  assert.equal(response.body.order.id, 'PED-1001');
  assert.equal(response.body.order.status, 'En camino');
  assert.match(response.body.order.location, /Guadalajara/);
  assert.equal(response.body.order.estimatedDelivery, '2026-11-08T18:00:00');
});

test('PA-03: el ID del pedido no distingue mayúsculas de minúsculas', async () => {
  const token = await getGuestToken();

  const response = await request(app)
    .post('/api/orders/track')
    .set('Authorization', `Bearer ${token}`)
    .send({ orderId: '  ped-1004  ' })
    .expect(200);

  assert.equal(response.body.order.id, 'PED-1004');
  assert.equal(response.body.order.status, 'Entregado');
});

test('PA-03: un pedido inexistente devuelve un error claro', async () => {
  const token = await getGuestToken();

  const response = await request(app)
    .post('/api/orders/track')
    .set('Authorization', `Bearer ${token}`)
    .send({ orderId: 'PED-9999' })
    .expect(404);

  assert.equal(response.body.error.code, 'ORDER_NOT_FOUND');
  assert.match(response.body.error.message, /No encontramos un pedido/);
});

test('PA-03: se valida el ID del pedido antes de consultar', async () => {
  const token = await getGuestToken();

  const empty = await request(app)
    .post('/api/orders/track')
    .set('Authorization', `Bearer ${token}`)
    .send({ orderId: '   ' })
    .expect(400);
  assert.equal(empty.body.error.code, 'INVALID_ORDER_ID');

  const malformed = await request(app)
    .post('/api/orders/track')
    .set('Authorization', `Bearer ${token}`)
    .send({ orderId: 'a' })
    .expect(400);
  assert.equal(malformed.body.error.code, 'INVALID_ORDER_ID');
});

test('PA-03: el rastreo exige un JWT válido', async () => {
  await request(app).post('/api/orders/track').send({ orderId: 'PED-1001' }).expect(401);
});
