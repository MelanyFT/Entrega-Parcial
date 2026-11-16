(function (global) {
  'use strict';

  const SESSION_KEY = 'chatbot.session';

  function createApp({ document: doc, fetch: fetchImpl, storage = null }) {
    const elements = {
      loginOverlay: doc.getElementById('login-overlay'),
      loginForm: doc.getElementById('login-form'),
      username: doc.getElementById('login-username'),
      password: doc.getElementById('login-password'),
      loginError: doc.getElementById('login-error'),
      loginSubmit: doc.getElementById('login-submit'),
      appShell: doc.getElementById('app-shell'),
      userMenu: doc.getElementById('user-menu'),
      userName: doc.getElementById('user-name'),
      logoutButton: doc.getElementById('logout-button'),
      launcher: doc.getElementById('chat-launcher'),
      panel: doc.getElementById('chat-panel'),
      menu: doc.getElementById('chat-menu'),
      closeButton: doc.getElementById('chat-close'),
    };

    if (
      !elements.loginOverlay ||
      !elements.loginForm ||
      !elements.appShell ||
      !elements.launcher ||
      !elements.panel ||
      !elements.menu
    ) {
      return null;
    }

    const triggers = Array.from(doc.querySelectorAll('[data-chat-open]'));
    const state = { session: null, open: false, questions: null };

    function readSession() {
      try {
        const raw = storage ? storage.getItem(SESSION_KEY) : null;
        if (!raw) return null;
        const session = JSON.parse(raw);
        return session && session.token ? session : null;
      } catch {
        return null;
      }
    }

    function saveSession(session) {
      try {
        if (storage) storage.setItem(SESSION_KEY, JSON.stringify(session));
      } catch {
        /* La sesión sigue activa en memoria aunque el almacenamiento esté bloqueado. */
      }
    }

    function clearSession() {
      try {
        if (storage) storage.removeItem(SESSION_KEY);
      } catch {
        /* Sin acción. */
      }
    }

    function setSession(session) {
      state.session = session;
      doc.body.dataset.authenticated = session ? 'true' : 'false';
      elements.appShell.hidden = !session;
      elements.loginOverlay.hidden = Boolean(session);

      if (session) {
        if (elements.userMenu) elements.userMenu.hidden = false;
        if (elements.userName) {
          elements.userName.textContent =
            session.user.displayName || session.user.username || '';
        }
      } else {
        if (elements.userMenu) elements.userMenu.hidden = true;
        if (elements.userName) elements.userName.textContent = '';
        setOpen(false);
        state.questions = null;
        elements.menu.innerHTML = '';
      }
    }

    function showLoginError(message) {
      if (!elements.loginError) return;
      elements.loginError.textContent = message;
      elements.loginError.hidden = false;
    }

    function clearLoginError() {
      if (!elements.loginError) return;
      elements.loginError.textContent = '';
      elements.loginError.hidden = true;
    }

    async function login(username, password) {
      const name = String(username || '').trim();

      if (!name || !password) {
        showLoginError('Escribe tu nombre y contraseña.');
        return false;
      }

      clearLoginError();
      if (elements.loginSubmit) {
        elements.loginSubmit.disabled = true;
        elements.loginSubmit.textContent = 'Entrando…';
      }

      try {
        const response = await fetchImpl('/api/auth/login', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: name, password }),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          showLoginError(
            (data.error && data.error.message) ||
              'El nombre o la contraseña no son correctos.'
          );
          return false;
        }

        const session = { token: data.token, user: data.user };
        saveSession(session);
        setSession(session);
        return true;
      } catch {
        showLoginError('Ocurrió un error de conexión. Intenta de nuevo.');
        return false;
      } finally {
        if (elements.loginSubmit) {
          elements.loginSubmit.disabled = false;
          elements.loginSubmit.textContent = 'Entrar';
        }
      }
    }

    async function restoreSession() {
      const stored = readSession();
      if (!stored) {
        setSession(null);
        return false;
      }

      try {
        const response = await fetchImpl('/api/auth/me', {
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + stored.token,
          },
        });

        if (!response.ok) {
          clearSession();
          setSession(null);
          return false;
        }

        const data = await response.json();
        const session = { token: stored.token, user: data.user || stored.user };
        saveSession(session);
        setSession(session);
        return true;
      } catch {
        clearSession();
        setSession(null);
        return false;
      }
    }

    function logout() {
      clearSession();
      setSession(null);
      if (elements.loginForm) elements.loginForm.reset();
      clearLoginError();
      if (elements.username) elements.username.focus();
    }

    async function request(path, options = {}) {
      if (!state.session) throw new Error('UNAUTHENTICATED');

      const headers = Object.assign({ Accept: 'application/json' }, options.headers || {}, {
        Authorization: 'Bearer ' + state.session.token,
      });

      if (options.body) headers['Content-Type'] = 'application/json';

      const response = await fetchImpl(path, Object.assign({}, options, { headers }));

      if (response.status === 401) {
        logout();
        throw new Error('UNAUTHENTICATED');
      }

      return response;
    }

    function setOpen(open) {
      if (open && !state.session) return;

      state.open = open;
      elements.panel.hidden = !open;
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
      elements.menu.innerHTML = '';
      const paragraph = doc.createElement('p');
      paragraph.className = kind === 'error' ? 'chat-error' : 'chat-hint';
      paragraph.textContent = text;
      elements.menu.appendChild(paragraph);
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
      elements.menu.innerHTML = '';

      const greeting = doc.createElement('p');
      greeting.className = 'chat-greeting';
      greeting.textContent = '¡Hola! ¿En qué puedo ayudarte hoy?';

      const hint = doc.createElement('p');
      hint.className = 'chat-hint';
      hint.textContent = 'Selecciona una pregunta:';

      elements.menu.append(greeting, hint);

      (state.questions || []).forEach((question) => {
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'chat-question';
        button.dataset.questionId = question.id;
        button.textContent = question.label;
        button.addEventListener('click', () => selectQuestion(question));
        elements.menu.appendChild(button);
      });
    }

    function selectQuestion(question) {
      if (question.type === 'order-id') {
        showOrderForm(question);
      } else if (question.type === 'free-text') {
        showQuestionForm(question);
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
      elements.menu.appendChild(back);
      return back;
    }

    function showOrderForm(question) {
      elements.menu.innerHTML = '';

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
      input.maxLength = 32;
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

      elements.menu.append(prompt, form, result);
      addBackButton();
      input.focus();
    }

    function showQuestionForm(question) {
      elements.menu.innerHTML = '';

      const prompt = doc.createElement('p');
      prompt.className = 'chat-prompt';
      prompt.textContent = question.prompt || question.label;

      const form = doc.createElement('form');
      form.id = 'question-form';
      form.className = 'chat-form';
      form.noValidate = true;

      const label = doc.createElement('label');
      label.htmlFor = 'order-question';
      label.textContent = 'Tu duda';

      const textarea = doc.createElement('textarea');
      textarea.id = 'order-question';
      textarea.name = 'question';
      textarea.rows = 3;
      textarea.maxLength = 500;
      textarea.placeholder = 'Ej. ¿Cuál es el tiempo de entrega?';
      textarea.required = true;

      const submit = doc.createElement('button');
      submit.type = 'submit';
      submit.className = 'chat-send';
      submit.textContent = 'Enviar pregunta';

      form.append(label, textarea, submit);

      const result = doc.createElement('div');
      result.id = 'question-result';
      result.className = 'question-result';
      result.setAttribute('aria-live', 'polite');

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        askQuestion(textarea.value, result, submit);
      });

      elements.menu.append(prompt, form, result);
      addBackButton();
      textarea.focus();
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

    async function askQuestion(rawQuestion, container, submit) {
      const question = String(rawQuestion || '').trim();

      if (!question) {
        renderError(container, 'Escribe tu duda para continuar.');
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Enviando…';
      container.innerHTML = '';

      try {
        const response = await request('/api/chat/ask', {
          method: 'POST',
          body: JSON.stringify({ question }),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          renderError(
            container,
            (data.error && data.error.message) ||
              'No pudimos responder tu pregunta. Intenta de nuevo.'
          );
          return;
        }

        renderAnswer(data, container);
      } catch {
        renderError(container, 'Ocurrió un error de conexión. Intenta de nuevo.');
      } finally {
        submit.disabled = false;
        submit.textContent = 'Enviar pregunta';
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

    function renderAnswer(data, container) {
      container.innerHTML = '';

      const card = doc.createElement('article');
      card.className = 'chat-answer';

      const heading = doc.createElement('h3');
      heading.textContent = 'Respuesta del asistente';

      const answer = doc.createElement('p');
      answer.textContent =
        (data && data.answer) || 'No recibimos una respuesta. Intenta de nuevo.';

      card.append(heading, answer);
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
      elements.menu.innerHTML = '';

      const title = doc.createElement('h3');
      title.className = 'chat-info-title';
      title.textContent = question.label;

      const answer = doc.createElement('p');
      answer.className = 'chat-info-text';
      answer.textContent = question.answer || 'Un asesor podrá ayudarte con esta consulta.';

      elements.menu.append(title, answer);
      addBackButton();
    }

    if (elements.loginForm) {
      elements.loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        login(elements.username ? elements.username.value : '', elements.password ? elements.password.value : '');
      });
    }

    if (elements.logoutButton) {
      elements.logoutButton.addEventListener('click', logout);
    }

    triggers.forEach((trigger) => trigger.addEventListener('click', toggle));
    if (elements.closeButton) {
      elements.closeButton.addEventListener('click', () => setOpen(false));
    }

    doc.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.open) setOpen(false);
    });

    setSession(null);

    return {
      login,
      logout,
      restoreSession,
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

    const app = createApp({
      document: global.document,
      fetch: global.fetch.bind(global),
      storage,
    });

    global.chatbot = app;
    if (app) app.restoreSession();
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createApp };
  }

  if (typeof window !== 'undefined' && window.document) {
    if (window.document.readyState === 'loading') {
      window.document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
