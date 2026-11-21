# Defectos registrados

## Contexto

El directorio contiene una carpeta `.git`, pero el ejecutable `git` no está instalado en el equipo, por lo que el historial se leyó directamente de `.git/logs/HEAD` y de los objetos comprimidos de `.git/objects`. No existe carpeta `.github`, por lo que no hay issues ni comentarios que revisar.

Historial encontrado (4 commits):

| Commit | Mensaje |
| --- | --- |
| `f7ac48f` | Primer commit |
| `e66665e` | Actulizacion de AGENTS.md |
| `82517e9` | Actualización del documento |
| `b6a5cf3` | Ajustes de Interfaz |

Los tres defectos siguientes se reconstruyeron comparando el contenido real de los archivos en `f7ac48f` y `82517e9`.

| ID | Qué falló | Severidad | Cómo se corrigió | Verificado por |
| --- | --- | --- | --- | --- |
| D-01 | El primer commit usaba MySQL (`mysql2`, variables `DB_*` y `CREATE DATABASE ... ENGINE=InnoDB`), incumpliendo el stack SQLite definido en `AGENTS.md`. | Alta | En `82517e9` se migró a `node:sqlite`: `SQLITE_PATH`, esquema con `users`, `orders`, llave foránea `user_id` e índices; se eliminó `mysql2` y se agregaron `scripts/init-db.js` y `src/db/sqlite*.js`. | `test/sqlite.test.js` (integridad, semilla, login y rastreo) y `npm test`: 28/28. Además, `PRAGMA integrity_check = ok` sobre `data/chatbot.db`. |
| D-02 | La versión inicial exponía `/api/auth/guest` con un JWT de invitado (`role: guest`); no existía tabla `users`, hash de contraseñas ni `POST /api/auth/login`, por lo que RF_01 no estaba cubierto. | Alta | Se crearon `users.password_hash`, `src/passwords.js` (scrypt con sal), `src/db/sqliteUserRepository.js` y `/api/auth/login`; `issueGuestToken` se sustituyó por `issueToken` con `sub`, `username` y `displayName`. | PA-1: 4 pruebas de API y 3 de widget; credenciales incorrectas devuelven 401 y las rutas protegidas rechazan peticiones sin JWT. |
| D-03 | El menú inicial contemplaba una sola pregunta y no existía `POST /api/chat/ask` ni `src/chatAnswers.js`, por lo que RF_05 no estaba implementado. | Media-alta | Se agregó la segunda pregunta al menú, el endpoint protegido `/api/chat/ask` y reglas de intención (entrega, cancelación, reembolso y general) con extracción del ID de pedido propio. | PA-5: 5 pruebas de API y 1 de widget; `npm test` en verde. |

## Observaciones adicionales

- El commit `b6a5cf3` ("Ajustes de Interfaz") introdujo la interfaz visual de TrackBot y los diagramas PNG; no se registraron defectos nuevos en ese cambio.
- Las correcciones posteriores al último commit (mensaje claro ante `EBUSY`, script `create-database.js`, filtrado estricto por `user_id` y actualización del timeline) constan en el estado actual del código y en sus pruebas, pero no forman parte del historial de commits.
