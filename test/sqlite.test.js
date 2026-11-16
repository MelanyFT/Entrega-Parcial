import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { openDatabase, applySchema } from '../src/db/sqlite.js';
import { createSqliteOrderRepository } from '../src/db/sqliteOrderRepository.js';
import { createSqliteUserRepository } from '../src/db/sqliteUserRepository.js';

const seedSql = readFileSync(new URL('../db/seed.sql', import.meta.url), 'utf8');

function createSeededDatabase() {
  const db = openDatabase(':memory:');
  applySchema(db);
  db.exec(seedSql);
  return db;
}

test('SQLite: el esquema y el seed cargan usuarios y pedidos de prueba', async () => {
  const db = createSeededDatabase();

  try {
    const orderRepository = createSqliteOrderRepository(db);
    const order = await orderRepository.findById('PED-1001', 1);

    assert.ok(order);
    assert.equal(order.id, 'PED-1001');
    assert.equal(order.status, 'En camino');
    assert.match(order.location, /Guadalajara/);
    assert.equal(order.estimatedDelivery, '2026-11-08T18:00:00');

    // Ana no puede ver el pedido de Carlos.
    assert.equal(await orderRepository.findById('PED-1002', 1), null);
    assert.equal(await orderRepository.findById('PED-9999', 1), null);

    const { orders } = db.prepare('SELECT COUNT(*) AS orders FROM orders').get();
    const { users } = db.prepare('SELECT COUNT(*) AS users FROM users').get();
    assert.equal(orders, 4);
    assert.equal(users, 4);

    const userRepository = createSqliteUserRepository(db);
    const ana = await userRepository.findByUsername('ana');
    assert.equal(ana.displayName, 'Ana López');
    assert.ok(ana.passwordHash);
  } finally {
    db.close();
  }
});

test('SQLite: inicio de sesión y rastreo funcionan de extremo a extremo', async () => {
  const db = createSeededDatabase();

  try {
    const app = createApp({
      orderRepository: createSqliteOrderRepository(db),
      userRepository: createSqliteUserRepository(db),
      jwtSecret: 'secreto-de-pruebas',
      logger: { error() {} },
    });

    const auth = await request(app)
      .post('/api/auth/login')
      .send({ username: 'ana', password: 'pedidos123' })
      .expect(200);

    const response = await request(app)
      .post('/api/orders/track')
      .set('Authorization', `Bearer ${auth.body.token}`)
      .send({ orderId: 'ped-1001' })
      .expect(200);

    assert.equal(response.body.order.id, 'PED-1001');
    assert.equal(response.body.order.status, 'En camino');
    assert.match(response.body.order.location, /Guadalajara/);

    // El pedido de Carlos no pertenece a Ana.
    await request(app)
      .post('/api/orders/track')
      .set('Authorization', `Bearer ${auth.body.token}`)
      .send({ orderId: 'PED-1002' })
      .expect(404);

    const answer = await request(app)
      .post('/api/chat/ask')
      .set('Authorization', `Bearer ${auth.body.token}`)
      .send({ question: '¿Cuándo llega mi pedido PED-1001?' })
      .expect(200);

    assert.match(answer.body.answer, /PED-1001/);
    assert.match(answer.body.answer, /Guadalajara/);
  } finally {
    db.close();
  }
});
