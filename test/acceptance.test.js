import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import {
  InMemoryOrderRepository,
  sampleOrders,
} from './support/inMemoryOrderRepository.js';
import { InMemoryUserRepository, sampleUsers } from './support/inMemoryUserRepository.js';

const app = createApp({
  orderRepository: new InMemoryOrderRepository(sampleOrders),
  userRepository: new InMemoryUserRepository(sampleUsers),
  jwtSecret: 'secreto-de-pruebas',
  jwtExpiresIn: '1h',
  logger: { error() {} },
});

async function login(username = 'ana', password = 'pedidos123') {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ username, password })
    .expect(200);

  assert.equal(response.body.tokenType, 'Bearer');
  assert.ok(response.body.token, 'La respuesta debe incluir un JWT');
  assert.ok(response.body.user, 'La respuesta debe incluir los datos del usuario');
  return response.body;
}

test('PA-1: la página muestra el inicio de sesión con nombre y contraseña', async () => {
  const response = await request(app).get('/').expect(200);

  assert.match(response.headers['content-type'], /text\/html/);
  assert.match(response.text, /Inicia sesión/);
  assert.match(response.text, /id="login-form"/);
  assert.match(response.text, /id="login-username"/);
  assert.match(response.text, /id="login-password"/);
  assert.match(response.text, /Nombre/);
  assert.match(response.text, /Contraseña/);
  assert.match(response.text, /id="app-shell" hidden/);
});

test('PA-1: el inicio de sesión válido devuelve un JWT y el usuario', async () => {
  const session = await login();

  assert.equal(session.user.username, 'ana');
  assert.equal(session.user.displayName, 'Ana López');

  const me = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${session.token}`)
    .expect(200);

  assert.equal(me.body.user.username, 'ana');
});

test('PA-1: credenciales incorrectas o incompletas son rechazadas', async () => {
  const wrongPassword = await request(app)
    .post('/api/auth/login')
    .send({ username: 'ana', password: 'incorrecta' })
    .expect(401);
  assert.equal(wrongPassword.body.error.code, 'INVALID_CREDENTIALS');

  const unknownUser = await request(app)
    .post('/api/auth/login')
    .send({ username: 'nadie', password: 'pedidos123' })
    .expect(401);
  assert.equal(unknownUser.body.error.code, 'INVALID_CREDENTIALS');

  const incomplete = await request(app)
    .post('/api/auth/login')
    .send({ username: 'ana' })
    .expect(400);
  assert.equal(incomplete.body.error.code, 'INVALID_CREDENTIALS');
});

test('PA-1: las rutas protegidas exigen un JWT válido', async () => {
  await request(app).get('/api/auth/me').expect(401);
  await request(app).get('/api/chat/menu').expect(401);
  await request(app).post('/api/orders/track').send({ orderId: 'PED-1001' }).expect(401);
  await request(app).post('/api/chat/ask').send({ question: '¿Cuándo llega?' }).expect(401);
});

test('PA-2: la página principal incluye la opción "Consultar CHATBOT"', async () => {
  const response = await request(app).get('/').expect(200);

  assert.match(response.text, /Consultar CHATBOT/);
  assert.match(response.text, /id="chat-launcher"/);
  assert.match(response.text, /id="chat-panel"/);
});

test('PA-2: los recursos del widget se sirven correctamente', async () => {
  const script = await request(app).get('/chatbot.js').expect(200);
  const styles = await request(app).get('/styles.css').expect(200);

  assert.match(script.headers['content-type'], /javascript/);
  assert.match(styles.headers['content-type'], /text\/css/);
});

test('PA-3: el menú de preguntas se obtiene con una sesión JWT', async () => {
  const { token } = await login();

  const response = await request(app)
    .get('/api/chat/menu')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.ok(Array.isArray(response.body.questions));
  assert.ok(response.body.questions.length >= 1);

  assert.equal(response.body.questions.length, 2);

  const firstQuestion = response.body.questions[0];
  assert.equal(firstQuestion.type, 'order-id');
  assert.match(firstQuestion.label, /Ingresa el ID del pedido/);
  assert.match(firstQuestion.prompt, /en dónde se encuentra mi pedido/);

  const secondQuestion = response.body.questions[1];
  assert.equal(secondQuestion.type, 'free-text');
  assert.match(secondQuestion.label, /Duda con respecto a mi pedido/);
});

test('PA-4: consultar un pedido propio devuelve su estatus y ubicación', async () => {
  const { token } = await login();

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

test('PA-4: el ID del pedido no distingue mayúsculas de minúsculas', async () => {
  const { token } = await login('luis');

  const response = await request(app)
    .post('/api/orders/track')
    .set('Authorization', `Bearer ${token}`)
    .send({ orderId: '  ped-1004  ' })
    .expect(200);

  assert.equal(response.body.order.id, 'PED-1004');
  assert.equal(response.body.order.status, 'Entregado');
});

test('PA-4: un usuario no puede consultar el pedido de otra cuenta', async () => {
  const { token } = await login('ana');

  const response = await request(app)
    .post('/api/orders/track')
    .set('Authorization', `Bearer ${token}`)
    .send({ orderId: 'PED-1002' })
    .expect(404);

  assert.equal(response.body.error.code, 'ORDER_NOT_FOUND');
});

test('PA-4: un pedido inexistente devuelve un error claro', async () => {
  const { token } = await login();

  const response = await request(app)
    .post('/api/orders/track')
    .set('Authorization', `Bearer ${token}`)
    .send({ orderId: 'PED-9999' })
    .expect(404);

  assert.equal(response.body.error.code, 'ORDER_NOT_FOUND');
  assert.match(response.body.error.message, /No encontramos un pedido/);
});

test('PA-4: se valida el ID del pedido antes de consultar', async () => {
  const { token } = await login();

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

test('PA-5: responde dudas sobre el tiempo de entrega', async () => {
  const { token } = await login();

  const response = await request(app)
    .post('/api/chat/ask')
    .set('Authorization', `Bearer ${token}`)
    .send({ question: '¿Cuál es el tiempo de entrega de mi pedido?' })
    .expect(200);

  assert.equal(response.body.intent, 'delivery-time');
  assert.match(response.body.answer, /tiempo de entrega/i);
});

test('PA-5: responde dudas sobre cancelación y reembolso', async () => {
  const { token } = await login();

  const cancellation = await request(app)
    .post('/api/chat/ask')
    .set('Authorization', `Bearer ${token}`)
    .send({ question: 'Quiero cancelar mi pedido' })
    .expect(200);
  assert.equal(cancellation.body.intent, 'cancellation');
  assert.match(cancellation.body.answer, /cancelación/i);

  const refund = await request(app)
    .post('/api/chat/ask')
    .set('Authorization', `Bearer ${token}`)
    .send({ question: 'Necesito un reembolso' })
    .expect(200);
  assert.equal(refund.body.intent, 'refund');
  assert.match(refund.body.answer, /reembolso/i);
});

test('PA-5: usa el pedido propio cuando la duda menciona el ID', async () => {
  const { token } = await login();

  const response = await request(app)
    .post('/api/chat/ask')
    .set('Authorization', `Bearer ${token}`)
    .send({ question: '¿Cuándo llega mi pedido PED-1001?' })
    .expect(200);

  assert.match(response.body.answer, /PED-1001/);
  assert.match(response.body.answer, /En camino/);
  assert.match(response.body.answer, /Guadalajara/);
});

test('PA-5: no revela pedidos de otra cuenta en la respuesta', async () => {
  const { token } = await login('ana');

  const response = await request(app)
    .post('/api/chat/ask')
    .set('Authorization', `Bearer ${token}`)
    .send({ question: '¿Cuándo llega el pedido PED-1002?' })
    .expect(200);

  assert.doesNotMatch(response.body.answer, /PED-1002/);
  assert.doesNotMatch(response.body.answer, /Carlos/);
});

test('PA-5: valida preguntas vacías o demasiado largas', async () => {
  const { token } = await login();

  const empty = await request(app)
    .post('/api/chat/ask')
    .set('Authorization', `Bearer ${token}`)
    .send({ question: '   ' })
    .expect(400);
  assert.equal(empty.body.error.code, 'INVALID_QUESTION');

  const long = await request(app)
    .post('/api/chat/ask')
    .set('Authorization', `Bearer ${token}`)
    .send({ question: 'a'.repeat(501) })
    .expect(400);
  assert.equal(long.body.error.code, 'INVALID_QUESTION');
});
