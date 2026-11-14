import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const chatbotScript = readFileSync(new URL('../public/chatbot.js', import.meta.url), 'utf8');

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function createFakeApi() {
  const calls = [];

  async function fakeFetch(url, options = {}) {
    calls.push({ url, options });

    if (url === '/api/auth/guest') {
      return jsonResponse({ token: 'jwt-de-prueba', tokenType: 'Bearer', expiresIn: '1h' });
    }

    if (url === '/api/chat/menu') {
      return jsonResponse({
        questions: [
          {
            id: 'order-status',
            type: 'order-id',
            label: '¿Ingresa el ID del pedido para saber en dónde se encuentra mi pedido?',
            prompt: 'Ingresa el ID del pedido para saber en dónde se encuentra mi pedido.',
          },
          {
            id: 'status-help',
            type: 'info',
            label: '¿Qué significa cada estatus de mi pedido?',
            answer: 'En preparación, en camino, en reparto o entregado.',
          },
        ],
      });
    }

    if (url === '/api/orders/track') {
      const { orderId } = JSON.parse(options.body);

      if (String(orderId).toUpperCase() === 'PED-1001') {
        return jsonResponse({
          order: {
            id: 'PED-1001',
            customerName: 'Ana López',
            status: 'En camino',
            location: 'Centro de distribución Guadalajara, Jalisco',
            estimatedDelivery: '2026-11-08T18:00:00',
            updatedAt: '2026-11-07T10:30:00',
          },
        });
      }

      return jsonResponse(
        {
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'No encontramos un pedido con ese ID. Verifica el número e inténtalo de nuevo.',
          },
        },
        404
      );
    }

    throw new Error(`Solicitud inesperada: ${url}`);
  }

  return { fakeFetch, calls };
}

async function setupWidget() {
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const api = createFakeApi();

  dom.window.fetch = api.fakeFetch;
  dom.window.eval(chatbotScript);

  // El widget se inicializa al dispararse DOMContentLoaded.
  if (dom.window.document.readyState === 'loading') {
    await new Promise((resolve) => {
      dom.window.document.addEventListener('DOMContentLoaded', resolve, { once: true });
    });
  }

  return { dom, doc: dom.window.document, api };
}

async function waitFor(predicate, timeoutMs = 2000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error('La condición esperada no se cumplió a tiempo.');
}

test('PA-01: el botón "Consultar CHATBOT" está visible en la página', async () => {
  const { dom, doc } = await setupWidget();
  const launcher = doc.getElementById('chat-launcher');
  const panel = doc.getElementById('chat-panel');

  assert.ok(launcher);
  assert.match(launcher.textContent, /Consultar CHATBOT/);
  assert.equal(panel.hidden, true);

  dom.window.close();
});

test('PA-02: al hacer clic en el chatbot aparece el menú de preguntas', async () => {
  const { dom, doc } = await setupWidget();

  doc.getElementById('chat-launcher').click();

  await waitFor(() => doc.querySelectorAll('.chat-question').length > 0);

  const panel = doc.getElementById('chat-panel');
  const questions = Array.from(doc.querySelectorAll('.chat-question'));

  assert.equal(panel.hidden, false);
  assert.equal(questions.length, 2);
  assert.match(questions[0].textContent, /Ingresa el ID del pedido/);
  assert.equal(questions[0].dataset.questionId, 'order-status');

  dom.window.close();
});

test('PA-03: al ingresar un ID válido se muestra el estatus y la ubicación', async () => {
  const { dom, doc, api } = await setupWidget();

  doc.getElementById('chat-launcher').click();
  await waitFor(() => doc.querySelectorAll('.chat-question').length > 0);

  doc.querySelector('.chat-question').click();
  await waitFor(() => Boolean(doc.getElementById('order-form')));

  const input = doc.getElementById('order-id');
  input.value = 'PED-1001';

  doc.getElementById('order-form').dispatchEvent(
    new dom.window.Event('submit', { bubbles: true, cancelable: true })
  );

  await waitFor(() => Boolean(doc.querySelector('#order-result .order-card')));

  const result = doc.getElementById('order-result');
  assert.match(result.textContent, /Pedido PED-1001/);
  assert.match(result.textContent, /En camino/);
  assert.match(result.textContent, /Guadalajara/);

  const trackCall = api.calls.find((call) => call.url === '/api/orders/track');
  assert.ok(trackCall);
  assert.equal(trackCall.options.headers.Authorization, 'Bearer jwt-de-prueba');

  dom.window.close();
});

test('PA-03: un ID inexistente muestra un mensaje de error en el widget', async () => {
  const { dom, doc } = await setupWidget();

  doc.getElementById('chat-launcher').click();
  await waitFor(() => doc.querySelectorAll('.chat-question').length > 0);

  doc.querySelector('.chat-question').click();
  await waitFor(() => Boolean(doc.getElementById('order-form')));

  doc.getElementById('order-id').value = 'PED-9999';
  doc.getElementById('order-form').dispatchEvent(
    new dom.window.Event('submit', { bubbles: true, cancelable: true })
  );

  await waitFor(() => Boolean(doc.querySelector('#order-result .chat-error')));

  assert.match(doc.getElementById('order-result').textContent, /No encontramos un pedido/);

  dom.window.close();
});
