# Trazabilidad completa de pruebas

Comando ejecutado: `npm test` (`node --test "test/**/*.test.js"`).
Resultado observado: **28 pruebas, 28 aprobadas, 0 fallidas**.

| ID | Archivo | Caso de prueba | Requisito | Resultado |
| --- | --- | --- | --- | --- |
| T-01 | `test/acceptance.test.js` | PA-1: la página muestra el inicio de sesión con nombre y contraseña | RF_01 | Aprobado |
| T-02 | `test/acceptance.test.js` | PA-1: el inicio de sesión válido devuelve un JWT y el usuario | RF_01 | Aprobado |
| T-03 | `test/acceptance.test.js` | PA-1: credenciales incorrectas o incompletas son rechazadas | RF_01 | Aprobado |
| T-04 | `test/acceptance.test.js` | PA-1: las rutas protegidas exigen un JWT válido | RF_01 / RF_04 | Aprobado |
| T-05 | `test/acceptance.test.js` | PA-2: la página principal incluye la opción "Consultar CHATBOT" | RF_02 | Aprobado |
| T-06 | `test/acceptance.test.js` | PA-2: los recursos del widget se sirven correctamente | RF_02 | Aprobado |
| T-07 | `test/acceptance.test.js` | PA-3: el menú de preguntas se obtiene con una sesión JWT | RF_03 | Aprobado |
| T-08 | `test/acceptance.test.js` | PA-4: consultar un pedido propio devuelve su estatus y ubicación | RF_04 | Aprobado |
| T-09 | `test/acceptance.test.js` | PA-4: el ID del pedido no distingue mayúsculas de minúsculas | RF_04 | Aprobado |
| T-10 | `test/acceptance.test.js` | PA-4: un usuario no puede consultar el pedido de otra cuenta | RF_04 | Aprobado |
| T-11 | `test/acceptance.test.js` | PA-4: un pedido inexistente devuelve un error claro | RF_04 | Aprobado |
| T-12 | `test/acceptance.test.js` | PA-4: se valida el ID del pedido antes de consultar | RF_04 | Aprobado |
| T-13 | `test/acceptance.test.js` | PA-5: responde dudas sobre el tiempo de entrega | RF_05 | Aprobado |
| T-14 | `test/acceptance.test.js` | PA-5: responde dudas sobre cancelación y reembolso | RF_05 | Aprobado |
| T-15 | `test/acceptance.test.js` | PA-5: usa el pedido propio cuando la duda menciona el ID | RF_05 | Aprobado |
| T-16 | `test/acceptance.test.js` | PA-5: no revela pedidos de otra cuenta en la respuesta | RF_05 | Aprobado |
| T-17 | `test/acceptance.test.js` | PA-5: valida preguntas vacías o demasiado largas | RF_05 | Aprobado |
| T-18 | `test/widget.test.js` | PA-1: la pantalla inicial solicita nombre y contraseña | RF_01 | Aprobado |
| T-19 | `test/widget.test.js` | PA-1: valida las credenciales y permite entrar con datos correctos | RF_01 | Aprobado |
| T-20 | `test/widget.test.js` | PA-1: cerrar sesión vuelve a la pantalla de inicio de sesión | RF_01 | Aprobado |
| T-21 | `test/widget.test.js` | PA-2 y PA-3: "Consultar CHATBOT" despliega el menú de preguntas | RF_02 / RF_03 | Aprobado |
| T-22 | `test/widget.test.js` | PA-4: al ingresar un ID válido se muestra el estatus y la ubicación | RF_04 | Aprobado |
| T-23 | `test/widget.test.js` | PA-4: el buscador principal actualiza el timeline del dashboard | RF_04 | Aprobado |
| T-24 | `test/widget.test.js` | PA-3: las consultas frecuentes abren la pregunta correspondiente del chat | RF_03 | Aprobado |
| T-25 | `test/widget.test.js` | PA-4: un ID inexistente muestra un mensaje de error en el widget | RF_04 | Aprobado |
| T-26 | `test/widget.test.js` | PA-5: la segunda pregunta responde una duda sobre el pedido | RF_05 | Aprobado |
| T-27 | `test/sqlite.test.js` | SQLite: el esquema y el seed cargan usuarios y pedidos de prueba | RF_04 (persistencia) | Aprobado |
| T-28 | `test/sqlite.test.js` | SQLite: inicio de sesión y rastreo funcionan de extremo a extremo | RF_01 / RF_04 | Aprobado |

## Resumen por requisito principal

Conteo sin duplicar los casos que cubren más de un requisito.

| Requisito | Casos | Aprobados |
| --- | --- | --- |
| RF_01 Inicio de sesión | 8 | 8 |
| RF_02 Consultar CHATBOT | 2 | 2 |
| RF_03 Menú de preguntas | 3 | 3 |
| RF_04 Rastreo por ID | 9 | 9 |
| RF_05 Dudas del pedido | 6 | 6 |
| **Total** | **28** | **28** |
