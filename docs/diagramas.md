# Diagramas del proyecto (Mermaid)

Los diagramas se pueden visualizar en cualquier editor compatible con Mermaid
(por ejemplo, la extensión de Mermaid o mermaid.live).

## 1. Casos de uso

```mermaid
flowchart LR
  Usuario((Usuario))
  Asesor((Asesor de soporte))

  CU1[Consultar ChatBot]
  CU2[Ver menú de preguntas]
  CU3[Rastrear pedido por ID]
  CU4[Ver estatus y ubicación]
  CU5[Resolver dudas generales]

  Usuario --> CU1
  CU1 --> CU2
  CU2 --> CU3
  CU3 --> CU4
  CU2 --> CU5
  Asesor -.-> CU5
```

## 2. Arquitectura

```mermaid
flowchart TB
  subgraph Cliente["Navegador del usuario"]
    Pagina[Página principal]
    Widget[Widget ChatBot]
  end

  subgraph Servidor["Servidor Express"]
    Auth["POST /api/auth/guest"]
    Menu["GET /api/chat/menu"]
    Track["POST /api/orders/track"]
    JWT[Middleware JWT]
  end

  DB[(MySQL<br/>tabla orders)]

  Pagina --> Widget
  Widget --> Auth
  Widget --> Menu
  Widget --> Track
  Menu --> JWT
  Track --> JWT
  Track --> DB
```

## 3. Secuencia de rastreo de un pedido

```mermaid
sequenceDiagram
  actor Usuario
  participant Widget as Widget ChatBot
  participant API as API Express
  participant DB as MySQL

  Usuario->>Widget: Clic en "Consultar CHATBOT"
  Widget->>API: POST /api/auth/guest
  API-->>Widget: JWT de invitado
  Widget->>API: GET /api/chat/menu (Bearer JWT)
  API-->>Widget: Menú de preguntas
  Usuario->>Widget: Selecciona la pregunta 1
  Widget-->>Usuario: Solicita ID del pedido
  Usuario->>Widget: Ingresa PED-1001
  Widget->>API: POST /api/orders/track (Bearer JWT)
  API->>DB: SELECT estatus y ubicación WHERE id = ?
  DB-->>API: Datos del pedido
  API-->>Widget: Estatus y ubicación
  Widget-->>Usuario: Muestra tarjeta con el resultado
```
