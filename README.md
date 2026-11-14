# ChatBot de rastreo de pedidos

Sistema web que integra un ChatBot en una página de Envíos Express para que los usuarios
consulten el estatus y la ubicación de sus pedidos sin esperar a un asesor.

El proyecto se desarrolló a partir de la especificación `Fundamentos de Mi Proyecto.docx`.

## Requisitos implementados

| ID | Requisito | Implementación |
| --- | --- | --- |
| RF_01 | Mostrar la opción **Consultar CHATBOT** en la página principal | Botón flotante y botón principal en `public/index.html` |
| RF_02 | Al hacer clic, desplegar el menú de preguntas | Panel del widget + `GET /api/chat/menu` |
| RF_03 | Preguntar el ID del pedido y mostrar su ubicación/estatus | Formulario del widget + `POST /api/orders/track` |

## Stack

- **Frontend:** HTML, CSS y JavaScript (widget sin dependencias de framework).
- **Backend:** Node.js + Express.
- **Base de datos:** MySQL (pedidos de prueba).
- **Seguridad:** JWT de invitado para las consultas del chatbot.

## Estructura del proyecto

```
.
├── db/
│   ├── schema.sql              # Tabla orders
│   └── seed.sql                # Pedidos de prueba
├── docs/
│   └── diagramas.md            # Diagramas Mermaid
├── public/
│   ├── index.html              # Página principal + widget
│   ├── styles.css
│   └── chatbot.js              # Lógica del ChatBot
├── scripts/
│   └── init-db.js              # Crea la BD y carga los pedidos de prueba
├── src/
│   ├── app.js                  # Aplicación Express (repositorio inyectable)
│   ├── auth.js                 # Emisión y validación de JWT
│   ├── chatMenu.js             # Menú de preguntas (RF_02)
│   ├── config.js
│   ├── server.js               # Arranque del servidor
│   └── db/
│       ├── pool.js
│       └── mysqlOrderRepository.js
├── test/
│   ├── acceptance.test.js      # Pruebas de aceptación de la API
│   ├── widget.test.js          # Pruebas del widget con jsdom
│   └── support/
└── package.json
```

## Configuración

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env` y ajusta las credenciales de MySQL y el secreto JWT.
   El archivo `.env` no se versiona.

3. Inicializa la base de datos y carga los pedidos de prueba:

   ```bash
   npm run db:init
   ```

4. Arranca el servidor:

   ```bash
   npm start
   ```

5. Abre `http://localhost:3000`.

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
| `GET` | `/` | Página principal con el widget | No |
| `POST` | `/api/auth/guest` | Emite un JWT de invitado | No |
| `GET` | `/api/chat/menu` | Devuelve el menú de preguntas | Bearer JWT |
| `POST` | `/api/orders/track` | Consulta un pedido por `orderId` | Bearer JWT |
| `GET` | `/api/health` | Estado del servicio | No |

Ejemplo de rastreo:

```bash
curl -X POST http://localhost:3000/api/orders/track \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"orderId\":\"PED-1001\"}"
```

## Pruebas

```bash
npm test
```

Las pruebas de aceptación usan un repositorio en memoria, por lo que **no requieren MySQL**
para ejecutarse:

- **PA-01:** la página principal muestra la opción "Consultar CHATBOT" y sus recursos.
- **PA-02:** al abrir el chatbot se despliega el menú de preguntas (API y widget).
- **PA-03:** al ingresar un ID válido se muestran estatus y ubicación; los IDs inválidos
  o inexistentes reciben un mensaje claro; las rutas exigen JWT.

## Notas

- `JWT_SECRET` debe cambiarse por una clave larga y aleatoria antes de publicar.
- El widget obtiene automáticamente un JWT de invitado y lo reutiliza durante la sesión.
- Para producción se recomienda agregar limitación de intentos (rate limiting) y HTTPS.
