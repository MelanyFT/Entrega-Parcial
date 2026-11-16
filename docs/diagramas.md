# Diagramas del proyecto (Mermaid)

Los diagramas se pueden visualizar en cualquier editor compatible con Mermaid
(por ejemplo, la extensión de Mermaid o mermaid.live).

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

## 2. Arquitectura

```mermaid
flowchart TB
  subgraph Cliente["Navegador del usuario"]
    Login[Pantalla de login]
    Pagina[Página principal]
    Widget[Widget ChatBot]
  end

  subgraph Servidor["Servidor Express"]
    Auth["POST /api/auth/login<br/>GET /api/auth/me"]
    Menu["GET /api/chat/menu"]
    Track["POST /api/orders/track"]
    Ask["POST /api/chat/ask"]
    JWT[Middleware JWT]
  end

  subgraph Datos["SQLite"]
    Users[(users)]
    Orders[(orders)]
  end

  Login --> Auth
  Auth --> Users
  Pagina --> Widget
  Widget --> Menu
  Widget --> Track
  Widget --> Ask
  Menu --> JWT
  Track --> JWT
  Ask --> JWT
  Track --> Orders
  Ask --> Orders
```

## 3. Secuencia: inicio de sesión y rastreo (RF_01 y RF_04)

```mermaid
sequenceDiagram
  actor Usuario
  participant Pagina as Página web
  participant API as API Express
  participant DB as SQLite

  Usuario->>Pagina: Abre el sitio
  Pagina-->>Usuario: Solicita nombre y contraseña
  Usuario->>Pagina: Ingresa ana / pedidos123
  Pagina->>API: POST /api/auth/login
  API->>DB: SELECT usuario y hash
  DB-->>API: Usuario encontrado
  API-->>Pagina: JWT + datos del usuario
  Pagina-->>Usuario: Muestra la página principal
  Usuario->>Pagina: Clic en "Consultar CHATBOT"
  Pagina->>API: GET /api/chat/menu (Bearer JWT)
  API-->>Pagina: Menú de preguntas
  Usuario->>Pagina: Selecciona Pregunta 1 e ingresa PED-1001
  Pagina->>API: POST /api/orders/track (Bearer JWT)
  API->>DB: SELECT pedido WHERE id = ? AND user_id = ?
  DB-->>API: Estatus y ubicación
  API-->>Pagina: Datos del pedido
  Pagina-->>Usuario: Tarjeta con estatus y ubicación
```

## 4. Secuencia: duda general (RF_05)

```mermaid
sequenceDiagram
  actor Usuario
  participant Widget as Widget ChatBot
  participant API as API Express
  participant DB as SQLite

  Usuario->>Widget: Selecciona "¿Duda con respecto a mi pedido?"
  Widget-->>Usuario: Muestra campo de texto
  Usuario->>Widget: "¿Cuál es el tiempo de entrega?"
  Widget->>API: POST /api/chat/ask (Bearer JWT)
  API->>API: Detecta intención de entrega
  opt La duda incluye un ID de pedido propio
    API->>DB: SELECT pedido WHERE id = ? AND user_id = ?
    DB-->>API: Estatus, ubicación y fecha estimada
  end
  API-->>Widget: Respuesta del asistente
  Widget-->>Usuario: Muestra la respuesta
```
