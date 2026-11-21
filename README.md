# ChatBot de rastreo de pedidos

Sistema web que integra un ChatBot en una página de EntregaYa (TrackBot) para que los usuarios
inicien sesión y consulten el estatus, la ubicación y las dudas de sus pedidos sin esperar
a un asesor.

El proyecto se desarrolló a partir de la especificación `Fundamentos de Mi Proyecto.docx`
y del stack definido en `AGENTS.md`.

## Requisitos implementados

| ID | Requisito | Implementación |
| --- | --- | --- |
| RF_01 | Inicio de sesión con nombre y contraseña | Pantalla de login + `POST /api/auth/login` + JWT |
| RF_02 | Mostrar la opción **Consultar CHATBOT** en la página principal | Buscador principal, tarjeta del asistente y botón flotante en `public/index.html` |
| RF_03 | Al hacer clic, desplegar el menú de preguntas | Panel del widget + `GET /api/chat/menu` |
| RF_04 | Pregunta 1: rastrear el pedido por ID y mostrar su ubicación/estatus | Formulario del widget + `POST /api/orders/track` |
| RF_05 | Pregunta 2: resolver dudas generales del pedido | Formulario de texto libre + `POST /api/chat/ask` |

## Stack

- **Frontend:** HTML, CSS y JavaScript (widget sin dependencias de framework).
- **Backend:** Node.js + Express.
- **Base de datos:** SQLite mediante el módulo nativo `node:sqlite` (Node.js 22.13 o superior).
- **Seguridad:** inicio de sesión con contraseña cifrada (scrypt) y JWT.

## Estructura del proyecto

```
.
├── data/
│   └── chatbot.db              # Base de datos SQLite (se crea con npm run db:init)
├── db/
│   ├── schema.sql              # Tablas users y orders
│   └── seed.sql                # Usuarios y pedidos de prueba
├── docs/
│   └── diagramas.md            # Diagramas Mermaid
├── public/
│   ├── index.html              # Login + página principal + widget
│   ├── styles.css
│   └── chatbot.js              # Sesión, login y lógica del ChatBot
├── scripts/
│   ├── create-database.js      # Crea/resetea la BD (opciones --reset y --path)
│   ├── export-diagrams.ps1     # Exporta los diagramas Mermaid a PNG
│   └── init-db.js              # Reinicia la BD y carga usuarios/pedidos de prueba
├── src/
│   ├── app.js                  # Aplicación Express (repositorios inyectables)
│   ├── auth.js                 # Emisión y validación de JWT
│   ├── chatAnswers.js          # Respuestas de RF_05
│   ├── chatMenu.js             # Menú de preguntas (RF_03)
│   ├── config.js
│   ├── passwords.js            # Hash y verificación de contraseñas
│   ├── server.js               # Arranque del servidor
│   └── db/
│       ├── sqlite.js           # Apertura de la BD y creación del esquema
│       ├── sqliteOrderRepository.js
│       └── sqliteUserRepository.js
├── test/
│   ├── acceptance.test.js      # Pruebas de aceptación PA-1 a PA-5
│   ├── sqlite.test.js          # Integración con SQLite
│   ├── widget.test.js          # Pruebas del widget con jsdom
│   └── support/
└── package.json
```

## Diagramas

La documentación de arquitectura, modelo de datos, clases e interfaces está en
[`docs/diagramas.md`](docs/diagramas.md). Incluye diagramas Mermaid de:

- Casos de uso.
- Arquitectura general por capas.
- Modelo entidad-relación y estados del pedido.
- Clases del backend y contratos de los repositorios.
- Secuencias de inicio de sesión, rastreo y dudas.
- Interfaces y contratos HTTP.

Las versiones exportadas en PNG están en [`docs/diagramas/`](docs/diagramas/). Para
regenerarlas después de editar el Markdown:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\export-diagrams.ps1
```

## Configuración

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env` y ajusta los valores. El archivo `.env` no se versiona.

   ```env
   PORT=3000
   SQLITE_PATH=./data/chatbot.db
   JWT_SECRET=cambia-esta-clave-por-una-larga-y-aleatoria
   JWT_EXPIRES_IN=1h
   ```

3. Inicializa la base de datos SQLite con los usuarios y pedidos de prueba:

   ```bash
   npm run db:init        # reinicia la BD (comando original)
   npm run db:create      # crea la BD solo si no existe
   npm run db:reset       # borra y vuelve a crear la BD
   ```

   El script `scripts/create-database.js` acepta opciones:

   ```bash
   node scripts/create-database.js                       # crear si no existe
   node scripts/create-database.js --reset               # reiniciar
   node scripts/create-database.js --path ./data/otra.db # ruta personalizada
   node scripts/create-database.js --help                # ayuda
   ```

   > Todos los comandos detienen antes el servidor, porque el archivo SQLite queda
   > bloqueado mientras la aplicación está en ejecución. `.env` no se modifica:
   > la ruta se toma de `SQLITE_PATH` o de `./data/chatbot.db`.

4. Arranca el servidor:

   ```bash
   npm start
   ```

5. Abre `http://localhost:3000` e inicia sesión.

### Usuarios de prueba

Todos usan la contraseña **`pedidos123`**.

| Nombre | Pedido |
| --- | --- |
| `ana` | `PED-1001` |
| `carlos` | `PED-1002` |
| `maria` | `PED-1003` |
| `luis` | `PED-1004` |

> Cada usuario solo puede consultar sus propios pedidos.

### Pedidos de prueba

| ID | Estatus | Ubicación |
| --- | --- | --- |
| `PED-1001` | En camino | Centro de distribución Guadalajara, Jalisco |
| `PED-1002` | En preparación | Almacén central, Ciudad de México |
| `PED-1003` | En reparto | Ruta de entrega zona norte, Monterrey, Nuevo León |
| `PED-1004` | Entregado | Domicilio del cliente, Puebla, Puebla |

## API

| Método | Ruta | Descripción | Auth |
| --- | --- | --- | --- |
| `GET` | `/` | Página principal con login y widget | No |
| `POST` | `/api/auth/login` | Inicia sesión con nombre y contraseña | No |
| `GET` | `/api/auth/me` | Devuelve el usuario de la sesión | Bearer JWT |
| `GET` | `/api/chat/menu` | Devuelve el menú de preguntas | Bearer JWT |
| `POST` | `/api/orders/track` | Consulta un pedido propio por `orderId` | Bearer JWT |
| `POST` | `/api/chat/ask` | Responde una duda sobre el pedido | Bearer JWT |
| `GET` | `/api/health` | Estado del servicio | No |

Ejemplo de inicio de sesión y rastreo:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"ana\",\"password\":\"pedidos123\"}"

curl -X POST http://localhost:3000/api/orders/track \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"orderId\":\"PED-1001\"}"

curl -X POST http://localhost:3000/api/chat/ask \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"question\":\"¿Cuál es el tiempo de entrega?\"}"
```

## Pruebas

```bash
npm test
```

Las pruebas de aceptación usan repositorios en memoria y las de integración usan SQLite
en memoria, por lo que **no requieren ningún servidor de base de datos**:

- **PA-1:** login con nombre y contraseña, rechazo de credenciales incorrectas y cierre de sesión.
- **PA-2:** la página principal muestra la opción "Consultar CHATBOT".
- **PA-3:** al abrir el chatbot se despliega el menú con las dos preguntas.
- **PA-4:** la Pregunta 1 muestra estatus y ubicación; un usuario no puede ver pedidos ajenos.
- **PA-5:** la Pregunta 2 responde dudas de entrega, cancelación y reembolso.
- **Integración SQLite:** esquema, seed, login, rastreo y respuestas con la base real.

## Notas

- `JWT_SECRET` debe cambiarse por una clave larga y aleatoria antes de publicar.
- Las contraseñas se almacenan con hash scrypt y sal; nunca en texto plano.
- El widget guarda la sesión en `sessionStorage` y la valida contra `/api/auth/me`.
- Si tu `.env` conserva variables `DB_*` de una versión anterior, se ignoran; la ruta
  de SQLite se configura con `SQLITE_PATH`.
- Para producción se recomienda agregar limitación de intentos (rate limiting) y HTTPS.
