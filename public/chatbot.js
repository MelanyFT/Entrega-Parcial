(function (global) {
  'use strict';

  const TOKEN_KEY = 'chatbot.guestToken';

  function createChatbot({ document: doc, fetch: fetchImpl, storage = null }) {
    const launcher = doc.getElementById('chat-launcher');
    const panel = doc.getElementById('chat-panel');
    const menu = doc.getElementById('chat-menu');
    const closeButton = doc.getElementById('chat-close');

    if (!launcher || !panel || !menu) return null;

    const triggers = Array.from(doc.querySelectorAll('[data-chat-open]'));
    const state = { open: false, token: null, questions: null };

    function readStoredToken() {
      try {
        return storage ? storage.getItem(TOKEN_KEY) : null;
      } catch {
        return null;
      }
    }

    function storeToken(token) {
      try {
        if (storage) storage.setItem(TOKEN_KEY, token);
      } catch {
        /* El almacenamiento puede estar bloqueado; la sesión sigue en memoria. */
      }
    }

    function clearToken() {
      try {
        if (storage) storage.removeItem(TOKEN_KEY);
      } catch {
        /* Sin acción. */
      }
    }

    async function getToken(forceRefresh = false) {
      if (!forceRefresh && state.token) return state.token;

      if (!forceRefresh) {
        const stored = readStoredToken();
        if (stored) {
          state.token = stored;
          return stored;
        }
      }

      const response = await fetchImpl('/api/auth/guest', {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) throw new Error('No se pudo iniciar la sesión del chat.');

      const data = await response.json();
      if (!data || !data.token) throw new Error('La sesión del chat no es válida.');

      state.token = data.token;
      storeToken(data.token);
      return state.token;
    }

    async function request(path, options = {}) {
      const token = await getToken();
      const headers = Object.assign({ Accept: 'application/json' }, options.headers || {}, {
        Authorization: 'Bearer ' + token,
      });

      if (options.body) headers['Content-Type'] = 'application/json';

      let response = await fetchImpl(path, Object.assign({}, options, { headers }));

      // Si el token expiró, se solicita uno nuevo y se repite la consulta una vez.
      if (response.status === 401) {
        state.token = null;
        clearToken();
        const freshToken = await getToken(true);
        headers.Authorization = 'Bearer ' + freshToken;
        response = await fetchImpl(path, Object.assign({}, options, { headers }));
      }

      return response;
    }

    function setOpen(open) {
      state.open = open;
      panel.hidden = !open;
      triggers.forEach((trigger) => trigger.setAttribute('aria-expanded', String(open)));

      if (open) {
        if (state.questions) {
          renderMenu();
        } else {
          loadMenu();
        }
      }
    }

    function toggle() {
      setOpen(!state.open);
    }

    function showStatus(text, kind = 'hint') {
      menu.innerHTML = '';
      const paragraph = doc.createElement('p');
      paragraph.className = kind === 'error' ? 'chat-error' : 'chat-hint';
      paragraph.textContent = text;
      menu.appendChild(paragraph);
    }

    async function loadMenu() {
      showStatus('Cargando preguntas…');

      try {
        const response = await request('/api/chat/menu');
        if (!response.ok) throw new Error('No se pudo cargar el menú.');

        const data = await response.json();
        state.questions = Array.isArray(data.questions) ? data.questions : [];
        renderMenu();
      } catch {
        showStatus(
          'No pudimos cargar el menú de preguntas. Revisa tu conexión e intenta de nuevo.',
          'error'
        );
      }
    }

    function renderMenu() {
      menu.innerHTML = '';

      const greeting = doc.createElement('p');
      greeting.className = 'chat-greeting';
      greeting.textContent = '¡Hola! ¿En qué puedo ayudarte hoy?';

      const hint = doc.createElement('p');
      hint.className = 'chat-hint';
      hint.textContent = 'Selecciona una pregunta:';

      menu.append(greeting, hint);

      (state.questions || []).forEach((question) => {
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'chat-question';
        button.dataset.questionId = question.id;
        button.textContent = question.label;
        button.addEventListener('click', () => selectQuestion(question));
        menu.appendChild(button);
      });
    }

    function selectQuestion(question) {
      if (question.type === 'order-id') {
        showOrderForm(question);
      } else {
        showInfo(question);
      }
    }

    function addBackButton() {
      const back = doc.createElement('button');
      back.type = 'button';
      back.className = 'chat-back';
      back.textContent = '← Volver al menú';
      back.addEventListener('click', renderMenu);
      menu.appendChild(back);
      return back;
    }

    function showOrderForm(question) {
      menu.innerHTML = '';

      const prompt = doc.createElement('p');
      prompt.className = 'chat-prompt';
      prompt.textContent = question.prompt || question.label;

      const form = doc.createElement('form');
      form.id = 'order-form';
      form.className = 'chat-form';
      form.noValidate = true;

      const label = doc.createElement('label');
      label.htmlFor = 'order-id';
      label.textContent = 'ID del pedido';

      const input = doc.createElement('input');
      input.id = 'order-id';
      input.name = 'orderId';
      input.type = 'text';
      input.placeholder = 'Ej. PED-1001';
      input.autocomplete = 'off';
      input.required = true;

      const submit = doc.createElement('button');
      submit.type = 'submit';
      submit.className = 'chat-send';
      submit.textContent = 'Consultar estatus';

      form.append(label, input, submit);

      const result = doc.createElement('div');
      result.id = 'order-result';
      result.className = 'order-result';
      result.setAttribute('aria-live', 'polite');

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        trackOrder(input.value, result, submit);
      });

      menu.append(prompt, form, result);
      addBackButton();
      input.focus();
    }

    async function trackOrder(rawOrderId, container, submit) {
      const orderId = String(rawOrderId || '').trim();

      if (!orderId) {
        renderError(container, 'Escribe el ID de tu pedido para continuar.');
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Consultando…';
      container.innerHTML = '';

      try {
        const response = await request('/api/orders/track', {
          method: 'POST',
          body: JSON.stringify({ orderId }),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          renderError(
            container,
            (data.error && data.error.message) ||
              'No pudimos consultar el pedido. Intenta de nuevo.'
          );
          return;
        }

        renderOrder(data.order, container);
      } catch {
        renderError(container, 'Ocurrió un error de conexión. Intenta de nuevo.');
      } finally {
        submit.disabled = false;
        submit.textContent = 'Consultar estatus';
      }
    }

    function renderError(container, message) {
      container.innerHTML = '';
      const paragraph = doc.createElement('p');
      paragraph.className = 'chat-error';
      paragraph.setAttribute('role', 'alert');
      paragraph.textContent = message;
      container.appendChild(paragraph);
    }

    function renderOrder(order, container) {
      if (!order) {
        renderError(container, 'No recibimos la información del pedido.');
        return;
      }

      container.innerHTML = '';

      const card = doc.createElement('article');
      card.className = 'order-card';

      const heading = doc.createElement('h3');
      heading.textContent = 'Pedido ' + order.id;

      const badge = doc.createElement('span');
      badge.className = 'order-badge ' + statusClass(order.status);
      badge.textContent = order.status || 'Sin estatus';

      const location = doc.createElement('p');
      location.className = 'order-location';
      const pin = doc.createElement('span');
      pin.setAttribute('aria-hidden', 'true');
      pin.textContent = '📍 ';
      location.appendChild(pin);
      location.appendChild(doc.createTextNode(order.location || 'Ubicación no disponible'));

      card.append(heading, badge, location);

      if (order.estimatedDelivery) {
        const eta = doc.createElement('p');
        eta.className = 'order-meta';
        eta.textContent = 'Entrega estimada: ' + formatDate(order.estimatedDelivery);
        card.appendChild(eta);
      }

      if (order.updatedAt) {
        const updated = doc.createElement('p');
        updated.className = 'order-meta';
        updated.textContent = 'Última actualización: ' + formatDate(order.updatedAt);
        card.appendChild(updated);
      }

      container.appendChild(card);
    }

    function statusClass(status) {
      const normalized = String(status || '').toLowerCase();
      if (normalized.includes('entregado')) return 'is-delivered';
      if (normalized.includes('camino') || normalized.includes('reparto')) return 'is-transit';
      return 'is-pending';
    }

    function formatDate(value) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    }

    function showInfo(question) {
      menu.innerHTML = '';

      const title = doc.createElement('h3');
      title.className = 'chat-info-title';
      title.textContent = question.label;

      const answer = doc.createElement('p');
      answer.className = 'chat-info-text';
      answer.textContent = question.answer || 'Un asesor podrá ayudarte con esta consulta.';

      menu.append(title, answer);
      addBackButton();
    }

    triggers.forEach((trigger) => trigger.addEventListener('click', toggle));
    if (closeButton) closeButton.addEventListener('click', () => setOpen(false));

    doc.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.open) setOpen(false);
    });

    setOpen(false);

    return {
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle,
      getState: () => Object.assign({}, state),
    };
  }

  function init() {
    const storage = (() => {
      try {
        return global.sessionStorage;
      } catch {
        return null;
      }
    })();

    global.chatbot = createChatbot({
      document: global.document,
      fetch: global.fetch.bind(global),
      storage,
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createChatbot };
  }

  if (typeof window !== 'undefined' && window.document) {
    if (window.document.readyState === 'loading') {
      window.document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
