# Diagramas del proyecto (Mermaid)

Diagramas de arquitectura, modelo de datos, clases e interfaces del ChatBot de
rastreo de pedidos. Se pueden visualizar en cualquier editor compatible con
Mermaid (por ejemplo, la extensión de Mermaid o [mermaid.live](https://mermaid.live)).

---

## 1. Casos de uso

```mermaid
flowchart LR
  Usuario((Usuario))
  Asesor((Asesor de soporte))

  CU1[Iniciar sesión]
  CU2[Consultar ChatBot]
  CU3[Ver menú de preguntas]
  CU4[Rastrear pedido por ID]
  CU5[Ver estatus y ubicación]
  CU6[Resolver duda del pedido]
  CU7[Atender casos especiales]

  Usuario --> CU1
  CU1 --> CU2
  CU2 --> CU3
  CU3 --> CU4
  CU4 --> CU5
  CU3 --> CU6
  Asesor -.-> CU7
  CU6 -.-> CU7
```

---

## 2. Arquitectura general

Arquitectura en capas: el navegador consume una API REST en Express; la API valida
el JWT, aplica las reglas del ChatBot y accede a SQLite mediante repositorios
inyectables. En las pruebas se sustituyen los repositorios SQLite por versiones en
memoria.

```mermaid
flowchart TB
  subgraph Cliente["Navegador del usuario"]
    Login["Pantalla de inicio de sesión"]
    Dashboard["Dashboard TrackBot<br/>buscador + timeline + telemetría"]
    Widget["Widget flotante<br/>Consultar CHATBOT"]
    Storage[("sessionStorage<br/>JWT")]
  end

  subgraph Servidor["Servidor Node.js + Express"]
    Static["express.static<br/>public/"]
    LoginAPI["POST /api/auth/login"]
    MeAPI["GET /api/auth/me"]
    MenuAPI["GET /api/chat/menu"]
    TrackAPI["POST /api/orders/track"]
    AskAPI["POST /api/chat/ask"]
    Auth["createAuth<br/>requireAuth + JWT"]
    Menu["chatMenu<br/>2 preguntas"]
    Answers["chatAnswers<br/>reglas de respuesta"]
    App["createApp<br/>composición de dependencias"]
  end

  subgraph Datos["Persistencia"]
    SQLite[("SQLite<br/>data/chatbot.db")]
    Users[("users")]
    Orders[("orders")]
  end

  subgraph Pruebas["Pruebas automatizadas"]
    InMemory["Repositorios en memoria"]
    TestDB[("SQLite :memory:")]
  end

  Login --> LoginAPI
  Login --> Storage
  Dashboard --> TrackAPI
  Widget --> MenuAPI
  Widget --> TrackAPI
  Widget --> AskAPI
  Storage -. "Bearer JWT" .-> Auth

  Static --> Login
  App --> LoginAPI
  App --> MeAPI
  App --> MenuAPI
  App --> TrackAPI
  App --> AskAPI

  LoginAPI --> Auth
  MeAPI --> Auth
  MenuAPI --> Auth
  TrackAPI --> Auth
  AskAPI --> Auth

  MenuAPI --> Menu
  AskAPI --> Answers
  TrackAPI --> Orders
  AskAPI --> Orders
  LoginAPI --> Users
  MeAPI --> Users

  SQLite --- Users
  SQLite --- Orders

  App -. "inyecta" .-> InMemory
  App -. "inyecta" .-> TestDB
```

### Capas

| Capa | Responsabilidad | Archivos |
| --- | --- | --- |
| Presentación | Login, dashboard, widget, sesión en `sessionStorage` | `public/index.html`, `public/styles.css`, `public/chatbot.js` |
| API / aplicación | Rutas REST, validación, autenticación y composición | `src/app.js`, `src/auth.js`, `src/server.js` |
| Dominio | Menú de preguntas y reglas de respuesta | `src/chatMenu.js`, `src/chatAnswers.js` |
| Persistencia | Repositorios y acceso a SQLite | `src/db/*.js`, `db/schema.sql`, `db/seed.sql` |
| Configuración | Variables de entorno y secretos | `src/config.js`, `.env` |

---

## 3. Modelo de datos

### 3.1 Diagrama entidad-relación

```mermaid
erDiagram
  USERS ||--o{ ORDERS : "es dueño de"

  USERS {
    INTEGER id PK "AUTOINCREMENT"
    TEXT username UK "Nombre de acceso, sin distinguir mayúsculas"
    TEXT display_name "Nombre visible"
    TEXT password_hash "Formato sal:hash scrypt"
    TEXT created_at "datetime('now')"
  }

  ORDERS {
    TEXT id PK "Ej. PED-1001"
    INTEGER user_id FK "users.id"
    TEXT customer_name "Nombre del cliente"
    TEXT status "En preparación, En camino, En reparto, Entregado"
    TEXT location "Ubicación actual o punto de entrega"
    TEXT estimated_delivery "ISO 8601"
    TEXT updated_at "datetime('now')"
  }
```

### 3.2 Reglas del modelo

- Un usuario puede tener **muchos** pedidos; un pedido pertenece a **un solo** usuario.
- `orders.user_id` es llave foránea a `users.id` y se activa `PRAGMA foreign_keys = ON`.
- `users.username` es único y se compara con `COLLATE NOCASE`.
- `orders.id` es texto porque el identificador visible es `PED-1001`.
- El repositorio **siempre** filtra por `id` y `user_id`; un usuario no puede consultar
  pedidos ajenos aunque conozca el ID.
- Las contraseñas nunca se guardan en texto plano: `password_hash` almacena `sal:hash`
  generado con `scrypt`.

### 3.3 Índices

```sql
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_user ON orders (user_id);
```

### 3.4 Diagrama de estados del pedido

```mermaid
stateDiagram-v2
  [*] --> EnPreparacion: Pedido creado
  EnPreparacion --> EnCamino: Sale del hub logístico
  EnCamino --> EnReparto: Repartidor asignado
  EnReparto --> Entregado: Firma o comprobante
  EnCamino --> Entregado: Entrega directa
  EnPreparacion --> Cancelado: Cancelación antes del reparto
  Cancelado --> [*]
  Entregado --> [*]
```

La interfaz traduce el estado a un avance del timeline:

| Estado | Paso del timeline |
| --- | --- |
| `En preparación` | 2 · Procesado |
| `En camino` / `En reparto` | 3 · En camino |
| `Entregado` | 4 · Entrega |

---

## 4. Diagrama de clases

El backend usa módulos ES y funciones fábrica. Las “clases” de la API se representan
con sus responsabilidades; los repositorios son interfaces que se implementan con
SQLite o en memoria.

```mermaid
classDiagram
  direction LR

  class Server {
    <<composition root>>
    +openDatabase(path)
    +applySchema(db)
    +createSqliteOrderRepository(db)
    +createSqliteUserRepository(db)
    +createApp(deps)
  }

  class AppFactory {
    <<module>>
    +createApp(deps) Express
  }

  class AuthService {
    +issueToken(payload) string
    +requireAuth(req, res, next) void
  }

  class PasswordService {
    <<module>>
    +hashPassword(password, salt) string
    +verifyPassword(password, storedHash) boolean
  }

  class OrderRepository {
    <<interface>>
    +findById(orderId, userId) Promise~OrderDTO~
  }

  class UserRepository {
    <<interface>>
    +findByUsername(username) Promise~UserRecord~
    +findById(id) Promise~PublicUser~
  }

  class SqliteOrderRepository {
    +findById(orderId, userId) Promise~OrderDTO~
  }

  class SqliteUserRepository {
    +findByUsername(username) Promise~UserRecord~
    +findById(id) Promise~PublicUser~
  }

  class InMemoryOrderRepository {
    +findById(orderId, userId) Promise~OrderDTO~
  }

  class InMemoryUserRepository {
    +findByUsername(username) Promise~UserRecord~
    +findById(id) Promise~PublicUser~
  }

  class ChatMenu {
    <<module>>
    +chatQuestions ChatQuestion[]
  }

  class ChatAnswers {
    <<module>>
    +extractOrderId(text) string
    +answerQuestion(question, context) ChatAnswer
  }

  class SqliteDatabase {
    <<module>>
    +openDatabase(path) DatabaseSync
    +applySchema(db) void
  }

  class Config {
    <<module>>
    +port number
    +sqlitePath string
    +jwtSecret string
    +jwtExpiresIn string
  }

  Server --> Config
  Server --> SqliteDatabase
  Server --> SqliteOrderRepository
  Server --> SqliteUserRepository
  Server --> AppFactory

  AppFactory --> AuthService
  AppFactory --> OrderRepository
  AppFactory --> UserRepository
  AppFactory --> ChatMenu
  AppFactory --> ChatAnswers
  AppFactory --> PasswordService

  AuthService --> PasswordService
  ChatAnswers --> OrderRepository

  SqliteOrderRepository ..|> OrderRepository
  SqliteUserRepository ..|> UserRepository
  InMemoryOrderRepository ..|> OrderRepository
  InMemoryUserRepository ..|> UserRepository

  SqliteOrderRepository --> SqliteDatabase
  SqliteUserRepository --> SqliteDatabase
```

### Responsabilidades

| Módulo | Tipo | Responsabilidad |
| --- | --- | --- |
| `src/server.js` | Composición | Abre SQLite, arma repositorios y arranca Express. |
| `src/app.js` | Fábrica | Crea la app, registra rutas y aplica el middleware JWT. |
| `src/auth.js` | Servicio | Firma y valida JWT con `issuer` y expiración. |
| `src/passwords.js` | Servicio | Hash y verificación de contraseñas con `scrypt`. |
| `src/chatMenu.js` | Dominio | Expone las dos preguntas de RF_03. |
| `src/chatAnswers.js` | Dominio | Detecta intención y redacta la respuesta de RF_05. |
| `src/db/sqliteOrderRepository.js` | Persistencia | Consulta pedidos filtrando por dueño. |
| `src/db/sqliteUserRepository.js` | Persistencia | Busca usuarios por nombre o ID. |
| `test/support/inMemory*.js` | Pruebas | Implementaciones sustitutas sin base de datos. |

---

## 5. Interfaces y contratos

### 5.1 Diagrama de interfaces

```mermaid
classDiagram
  direction LR

  class RestApi {
    <<interface>>
    +auth_login(username, password) LoginResponse
    +auth_me() UserResponse
    +chat_menu() MenuResponse
    +orders_track(orderId) OrderResponse
    +chat_ask(question) AnswerResponse
  }

  class AppDependencies {
    <<interface>>
    +orderRepository OrderRepository
    +userRepository UserRepository
    +jwtSecret string
    +jwtExpiresIn string
  }

  class OrderRepository {
    <<interface>>
    +findById(orderId, userId) OrderDTO
  }

  class UserRepository {
    <<interface>>
    +findByUsername(username) UserRecord
    +findById(id) PublicUser
  }

  class AuthService {
    <<interface>>
    +issueToken(payload) string
    +requireAuth(req, res, next) void
  }

  class LoginResponse {
    +token string
    +tokenType string
    +expiresIn string
    +user PublicUser
  }

  class UserResponse {
    +user PublicUser
  }

  class OrderResponse {
    +order OrderDTO
  }

  class MenuResponse {
    +questions ChatQuestion[]
  }

  class AnswerResponse {
    +intent string
    +answer string
  }

  class OrderDTO {
    +id string
    +customerName string
    +status string
    +location string
    +estimatedDelivery string
    +updatedAt string
  }

  class UserRecord {
    +id number
    +username string
    +displayName string
    +passwordHash string
  }

  class PublicUser {
    +id number
    +username string
    +displayName string
  }

  class ChatQuestion {
    +id string
    +type string
    +label string
    +prompt string
  }

  RestApi --> LoginResponse
  RestApi --> UserResponse
  RestApi --> OrderResponse
  RestApi --> MenuResponse
  RestApi --> AnswerResponse
  LoginResponse --> PublicUser
  UserResponse --> PublicUser
  OrderResponse --> OrderDTO
  MenuResponse --> ChatQuestion
  RestApi --> AuthService
  AppDependencies --> OrderRepository
  AppDependencies --> UserRepository
  AppDependencies --> AuthService
  OrderRepository --> OrderDTO
  UserRepository --> UserRecord
  UserRepository --> PublicUser
```

### 5.2 Contratos de los repositorios

```ts
type UserId = string | number;

interface OrderDTO {
  id: string;
  customerName: string;
  status: string;
  location: string;
  estimatedDelivery: string | null;
  updatedAt: string;
}

interface UserRecord {
  id: number;
  username: string;
  displayName: string;
  passwordHash: string;
}

interface PublicUser {
  id: number;
  username: string;
  displayName: string;
}

interface OrderRepository {
  /** Devuelve null si el pedido no existe o no pertenece al usuario. */
  findById(orderId: string, userId: UserId): Promise<OrderDTO | null>;
}

interface UserRepository {
  findByUsername(username: string): Promise<UserRecord | null>;
  findById(id: UserId): Promise<PublicUser | null>;
}

interface AuthService {
  issueToken(payload: {
    sub: string;
    username: string;
    displayName: string;
    role: 'customer';
  }): string;

  requireAuth(req: Request, res: Response, next: NextFunction): void;
}

interface ChatQuestion {
  id: string;
  type: 'order-id' | 'free-text' | 'info';
  label: string;
  prompt?: string;
  answer?: string;
}

interface ChatAnswer {
  intent: 'delivery-time' | 'cancellation' | 'refund' | 'general';
  answer: string;
}

interface AppDependencies {
  orderRepository: OrderRepository;
  userRepository: UserRepository;
  jwtSecret: string;
  jwtExpiresIn?: string;
  logger?: Pick<Console, 'error'>;
}
```

### 5.3 Contratos HTTP

| Método | Ruta | Autenticación | Entrada | Salida |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/login` | No | `{ username, password }` | `{ token, tokenType, expiresIn, user }` |
| `GET` | `/api/auth/me` | Bearer JWT | — | `{ user }` |
| `GET` | `/api/chat/menu` | Bearer JWT | — | `{ questions: ChatQuestion[] }` |
| `POST` | `/api/orders/track` | Bearer JWT | `{ orderId }` | `{ order: OrderDTO }` |
| `POST` | `/api/chat/ask` | Bearer JWT | `{ question }` | `{ intent, answer }` |
| `GET` | `/api/health` | No | — | `{ status: "ok" }` |

### 5.4 Formato de error

```json
{
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "No encontramos un pedido con ese ID asociado a tu cuenta."
  }
}
```

| Código | HTTP | Cuándo ocurre |
| --- | --- | --- |
| `INVALID_CREDENTIALS` | 400 / 401 | Faltan datos o el usuario/contraseña no coinciden. |
| `UNAUTHORIZED` | 401 | Falta el JWT, es inválido o expiró. |
| `INVALID_ORDER_ID` | 400 | El ID está vacío o no cumple `^[A-Z0-9-]{4,32}$`. |
| `ORDER_NOT_FOUND` | 404 | El pedido no existe o pertenece a otra cuenta. |
| `INVALID_QUESTION` | 400 | La duda está vacía o supera 500 caracteres. |
| `INVALID_JSON` | 400 | El cuerpo de la solicitud no es JSON válido. |
| `INTERNAL_ERROR` | 500 | Error inesperado del servidor. |

---

## 6. Secuencia: inicio de sesión y rastreo (RF_01 y RF_04)

```mermaid
sequenceDiagram
  actor Usuario
  participant Pagina as Dashboard TrackBot
  participant API as API Express
  participant Auth as AuthService
  participant DB as SQLite

  Usuario->>Pagina: Abre el sitio
  Pagina-->>Usuario: Solicita nombre y contraseña
  Usuario->>Pagina: Ingresa ana / pedidos123
  Pagina->>API: POST /api/auth/login
  API->>DB: SELECT usuario y hash
  DB-->>API: Usuario encontrado
  API->>Auth: verifyPassword + issueToken
  Auth-->>API: JWT
  API-->>Pagina: JWT + datos del usuario
  Pagina-->>Usuario: Muestra el dashboard
  Usuario->>Pagina: Escribe PED-1001 y pulsa "Rastrear pedido"
  Pagina->>API: POST /api/orders/track (Bearer JWT)
  API->>Auth: requireAuth
  Auth-->>API: Token válido
  API->>DB: SELECT pedido WHERE id = ? AND user_id = ?
  DB-->>API: Estatus y ubicación
  API-->>Pagina: Datos del pedido
  Pagina-->>Usuario: Timeline, ETA y telemetría actualizados
```

## 7. Secuencia: menú y duda general (RF_03 y RF_05)

```mermaid
sequenceDiagram
  actor Usuario
  participant Widget as Widget ChatBot
  participant API as API Express
  participant Answers as ChatAnswers
  participant DB as SQLite

  Usuario->>Widget: Clic en "Consultar CHATBOT"
  Widget->>API: GET /api/chat/menu (Bearer JWT)
  API-->>Widget: 2 preguntas
  Widget-->>Usuario: Muestra el menú

  Usuario->>Widget: Selecciona "¿Duda con respecto a mi pedido?"
  Widget-->>Usuario: Muestra campo de texto
  Usuario->>Widget: "¿Cuál es el tiempo de entrega?"
  Widget->>API: POST /api/chat/ask (Bearer JWT)
  API->>Answers: answerQuestion(texto, contexto)
  opt La duda incluye un ID de pedido propio
    API->>DB: SELECT pedido WHERE id = ? AND user_id = ?
    DB-->>API: Estatus, ubicación y ETA
  end
  Answers-->>API: { intent, answer }
  API-->>Widget: Respuesta del asistente
  Widget-->>Usuario: Muestra la respuesta
```

---

## 8. Matriz de trazabilidad

| Requisito | Componentes | Pruebas |
| --- | --- | --- |
| RF_01 Inicio de sesión | Login, `POST /api/auth/login`, `auth.js`, `users` | PA-1 |
| RF_02 Consultar CHATBOT | `#chat-launcher`, `#assistant-cta` | PA-2 |
| RF_03 Menú de preguntas | `GET /api/chat/menu`, `chatMenu.js` | PA-3 |
| RF_04 Rastreo por ID | `POST /api/orders/track`, `sqliteOrderRepository.js` | PA-4 |
| RF_05 Dudas del pedido | `POST /api/chat/ask`, `chatAnswers.js` | PA-5 |
