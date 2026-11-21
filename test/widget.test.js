import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const chatbotScript = readFileSync(new URL('../public/chatbot.js', import.meta.url), 'utf8');

const SESSION = {
  token: 'jwt-ana',
  user: { id: 1, username: 'ana', displayName: 'Ana López' },
};

const MENU = [
  {
    id: 'order-status',
    type: 'order-id',
    label: '¿Ingresa el ID del pedido para saber en dónde se encuentra mi pedido?',
    prompt: 'Ingresa el ID del pedido para saber en dónde se encuentra mi pedido.',
  },
  {
    id: 'order-question',
    type: 'free-text',
    label: '¿Duda con respecto a mi pedido?',
    prompt: 'Escribe tu duda con respecto a tu pedido.',
  },
];

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function unauthorized() {
  return jsonResponse(
    { error: { code: 'UNAUTHORIZED', message: 'Tu sesión expiró. Inicia sesión de nuevo.' } },
    401
  );
}

function createFakeApi() {
  const calls = [];

  async function fakeFetch(url, options = {}) {
    calls.push({ url, options });
    const method = (options.method || 'GET').toUpperCase();
    const headers = options.headers || {};

    if (url === '/api/auth/login' && method === 'POST') {
      const { username, password } = JSON.parse(options.body || '{}');

      if (username === 'ana' && password === 'pedidos123') {
        return jsonResponse({
          token: SESSION.token,
          tokenType: 'Bearer',
          expiresIn: '1h',
          user: SESSION.user,
        });
      }

      return jsonResponse(
        {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'El nombre o la contraseña no son correctos.',
          },
        },
        401
      );
    }

    if (url === '/api/auth/me') {
      if (headers.Authorization !== `Bearer ${SESSION.token}`) return unauthorized();
      return jsonResponse({ user: SESSION.user });
    }

    if (url === '/api/chat/menu') {
      if (headers.Authorization !== `Bearer ${SESSION.token}`) return unauthorized();
      return jsonResponse({ questions: MENU });
    }

    if (url === '/api/orders/track') {
      if (headers.Authorization !== `Bearer ${SESSION.token}`) return unauthorized();
      const { orderId } = JSON.parse(options.body || '{}');

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
            message:
              'No encontramos un pedido con ese ID asociado a tu cuenta. Verifica el número e inténtalo de nuevo.',
          },
        },
        404
      );
    }

    if (url === '/api/chat/ask') {
      if (headers.Authorization !== `Bearer ${SESSION.token}`) return unauthorized();
      const { question } = JSON.parse(options.body || '{}');

      if (/tiempo|entrega|cu[aá]ndo/i.test(question)) {
        return jsonResponse({
          intent: 'delivery-time',
          answer:
            'El tiempo de entrega depende de la ruta y del estatus de tu pedido.',
        });
      }

      if (/cancelar|cancelaci[oó]n/i.test(question)) {
        return jsonResponse({
          intent: 'cancellation',
          answer: 'Puedes solicitar la cancelación antes de que salga a reparto.',
        });
      }

      if (/reembolso|devoluci[oó]n/i.test(question)) {
        return jsonResponse({
          intent: 'refund',
          answer: 'Puedes solicitar un reembolso si tu pedido llegó con problemas.',
        });
      }

      return jsonResponse({
        intent: 'general',
        answer: 'Un asesor revisará tu duda y te contactará.',
      });
    }

    throw new Error(`Solicitud inesperada: ${method} ${url}`);
  }

  return { fakeFetch, calls };
}

async function waitFor(predicate, timeoutMs = 2000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error('La condición esperada no se cumplió a tiempo.');
}

async function setupWidget({ authenticated = false } = {}) {
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const api = createFakeApi();

  dom.window.fetch = api.fakeFetch;

  if (authenticated) {
    dom.window.sessionStorage.setItem('chatbot.session', JSON.stringify(SESSION));
  }

  dom.window.eval(chatbotScript);

  if (dom.window.document.readyState === 'loading') {
    await new Promise((resolve) => {
      dom.window.document.addEventListener('DOMContentLoaded', resolve, { once: true });
    });
  }

  if (authenticated) {
    await waitFor(() => !dom.window.document.getElementById('app-shell').hidden);
  } else {
    await waitFor(() => dom.window.document.body.dataset.authenticated === 'false');
  }

  return { dom, doc: dom.window.document, api };
}

async function submitLogin(dom, doc, username, password) {
  doc.getElementById('login-username').value = username;
  doc.getElementById('login-password').value = password;
  doc.getElementById('login-form').dispatchEvent(
    new dom.window.Event('submit', { bubbles: true, cancelable: true })
  );
}

async function openChat(doc) {
  doc.getElementById('chat-launcher').click();
  await waitFor(() => doc.querySelectorAll('.chat-question').length === 2);
}

test('PA-1: la pantalla inicial solicita nombre y contraseña', async () => {
  const { dom, doc } = await setupWidget();

  assert.equal(doc.getElementById('login-overlay').hidden, false);
  assert.equal(doc.getElementById('app-shell').hidden, true);
  assert.match(doc.getElementById('login-title').textContent, /Inicia sesión/);
  assert.ok(doc.getElementById('login-username'));
  assert.ok(doc.getElementById('login-password'));

  dom.window.close();
});

test('PA-1: valida las credenciales y permite entrar con datos correctos', async () => {
  const { dom, doc } = await setupWidget();

  await submitLogin(dom, doc, 'ana', 'incorrecta');
  await waitFor(() => !doc.getElementById('login-error').hidden);
  assert.match(doc.getElementById('login-error').textContent, /no son correctos/);

  await submitLogin(dom, doc, 'ana', 'pedidos123');
  await waitFor(() => !doc.getElementById('app-shell').hidden);

  assert.equal(doc.getElementById('login-overlay').hidden, true);
  assert.equal(doc.getElementById('user-name').textContent, 'Ana López');
  assert.ok(dom.window.sessionStorage.getItem('chatbot.session'));

  dom.window.close();
});

test('PA-1: cerrar sesión vuelve a la pantalla de inicio de sesión', async () => {
  const { dom, doc } = await setupWidget({ authenticated: true });

  doc.getElementById('logout-button').click();

  assert.equal(doc.getElementById('login-overlay').hidden, false);
  assert.equal(doc.getElementById('app-shell').hidden, true);
  assert.equal(dom.window.sessionStorage.getItem('chatbot.session'), null);

  dom.window.close();
});

test('PA-2 y PA-3: "Consultar CHATBOT" despliega el menú de preguntas', async () => {
  const { dom, doc } = await setupWidget({ authenticated: true });

  const launcher = doc.getElementById('chat-launcher');
  assert.match(launcher.textContent, /Consultar CHATBOT/);
  assert.equal(doc.getElementById('chat-panel').hidden, true);

  await openChat(doc);

  const panel = doc.getElementById('chat-panel');
  const questions = Array.from(doc.querySelectorAll('.chat-question'));

  assert.equal(panel.hidden, false);
  assert.equal(questions.length, 2);
  assert.match(questions[0].textContent, /Ingresa el ID del pedido/);
  assert.equal(questions[0].dataset.questionId, 'order-status');
  assert.match(questions[1].textContent, /Duda con respecto a mi pedido/);
  assert.equal(questions[1].dataset.questionId, 'order-question');

  dom.window.close();
});

test('PA-4: al ingresar un ID válido se muestra el estatus y la ubicación', async () => {
  const { dom, doc, api } = await setupWidget({ authenticated: true });

  await openChat(doc);
  doc.querySelectorAll('.chat-question')[0].click();
  await waitFor(() => Boolean(doc.getElementById('order-form')));

  doc.getElementById('order-id').value = 'PED-1001';
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
  assert.equal(trackCall.options.headers.Authorization, 'Bearer jwt-ana');

  dom.window.close();
});

test('PA-4: el buscador principal actualiza el timeline del dashboard', async () => {
  const { dom, doc, api } = await setupWidget({ authenticated: true });

  doc.getElementById('tracking-input').value = 'PED-1001';
  doc.getElementById('tracking-search-form').dispatchEvent(
    new dom.window.Event('submit', { bubbles: true, cancelable: true })
  );

  await waitFor(() => Boolean(doc.querySelector('#tracking-feedback .order-card')));

  assert.match(doc.getElementById('tracking-feedback').textContent, /Pedido PED-1001/);
  assert.match(doc.getElementById('showcase-order-id').textContent, /PED-1001/);
  assert.equal(doc.getElementById('showcase-status').textContent, 'En camino');
  assert.match(doc.getElementById('showcase-location').textContent, /Guadalajara/);
  assert.match(doc.getElementById('assistant-summary').textContent, /PED-1001/);
  assert.ok(
    doc.querySelector('#showcase-timeline .timeline-step[data-step="3"].is-active')
  );

  const trackCall = api.calls.find((call) => call.url === '/api/orders/track');
  assert.ok(trackCall);
  assert.equal(trackCall.options.headers.Authorization, 'Bearer jwt-ana');

  dom.window.close();
});

test('PA-3: las consultas frecuentes abren la pregunta correspondiente del chat', async () => {
  const { dom, doc } = await setupWidget({ authenticated: true });

  doc
    .querySelector('.quick-pill[data-quick-question="free-text"]')
    .click();

  await waitFor(() => Boolean(doc.getElementById('question-form')));

  assert.equal(doc.getElementById('chat-panel').hidden, false);
  assert.match(
    doc.getElementById('order-question').value,
    /tiempo estimado de entrega/i
  );

  dom.window.close();
});

test('PA-4: un ID inexistente muestra un mensaje de error en el widget', async () => {
  const { dom, doc } = await setupWidget({ authenticated: true });

  await openChat(doc);
  doc.querySelectorAll('.chat-question')[0].click();
  await waitFor(() => Boolean(doc.getElementById('order-form')));

  doc.getElementById('order-id').value = 'PED-9999';
  doc.getElementById('order-form').dispatchEvent(
    new dom.window.Event('submit', { bubbles: true, cancelable: true })
  );

  await waitFor(() => Boolean(doc.querySelector('#order-result .chat-error')));
  assert.match(doc.getElementById('order-result').textContent, /No encontramos un pedido/);

  dom.window.close();
});

test('PA-5: la segunda pregunta responde una duda sobre el pedido', async () => {
  const { dom, doc, api } = await setupWidget({ authenticated: true });

  await openChat(doc);
  doc.querySelectorAll('.chat-question')[1].click();
  await waitFor(() => Boolean(doc.getElementById('question-form')));

  doc.getElementById('order-question').value = '¿Cuál es el tiempo de entrega?';
  doc.getElementById('question-form').dispatchEvent(
    new dom.window.Event('submit', { bubbles: true, cancelable: true })
  );

  await waitFor(() => Boolean(doc.querySelector('#question-result .chat-answer')));

  const result = doc.getElementById('question-result');
  assert.match(result.textContent, /Respuesta del asistente/);
  assert.match(result.textContent, /tiempo de entrega/);

  const askCall = api.calls.find((call) => call.url === '/api/chat/ask');
  assert.ok(askCall);
  assert.equal(askCall.options.headers.Authorization, 'Bearer jwt-ana');

  dom.window.close();
});
