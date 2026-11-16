-- Usuarios de prueba. Todos usan la contraseña: pedidos123
INSERT INTO users (id, username, display_name, password_hash)
VALUES
  (1, 'ana', 'Ana López', 'seed-ana:8724601d00aa8b4db91305e9d2042527827a013039fbaef22de1458772b41664f7d019dfe585bc722a83557f3de36bc0e13f4bcce10dcaa413c296337b1d1944'),
  (2, 'carlos', 'Carlos Ramírez', 'seed-carlos:5d08909b78572d46f976bfa58d4e20ef352f07c302a8ba9b431a3ff374746b0fef0c48f023b26d4984bf27cd7a1e4afb2d6d33aeda3a306b137d260a93ec5405'),
  (3, 'maria', 'María Torres', 'seed-maria:198b29c9fc1046f73d082a57f1474af09384fcd77335c374d699bf5b473367dd55a1f88412eee215cdd80c159cd1ff8cf1951d2cfdf63f9df1abe46e4bce7bde'),
  (4, 'luis', 'Luis Hernández', 'seed-luis:6c38ee2be8cbcc78cf8c1ea8095f3c42c3d4ce3d66181ebb247d4e8bb654ef591a75cbda9cbe46ad1dc4b95fa67b458f9f98088a680b667757387539f8c7b042')
ON CONFLICT (id) DO UPDATE SET
  username = excluded.username,
  display_name = excluded.display_name,
  password_hash = excluded.password_hash;

-- Pedidos de prueba, cada uno asociado a su usuario.
INSERT INTO orders (id, user_id, customer_name, status, location, estimated_delivery, updated_at)
VALUES
  ('PED-1001', 1, 'Ana López', 'En camino', 'Centro de distribución Guadalajara, Jalisco', '2026-11-08T18:00:00', '2026-11-07T10:30:00'),
  ('PED-1002', 2, 'Carlos Ramírez', 'En preparación', 'Almacén central, Ciudad de México', '2026-11-09T14:30:00', '2026-11-07T09:00:00'),
  ('PED-1003', 3, 'María Torres', 'En reparto', 'Ruta de entrega zona norte, Monterrey, Nuevo León', '2026-11-07T20:00:00', '2026-11-07T16:45:00'),
  ('PED-1004', 4, 'Luis Hernández', 'Entregado', 'Domicilio del cliente, Puebla, Puebla', '2026-11-06T12:00:00', '2026-11-06T12:05:00')
ON CONFLICT (id) DO UPDATE SET
  user_id = excluded.user_id,
  customer_name = excluded.customer_name,
  status = excluded.status,
  location = excluded.location,
  estimated_delivery = excluded.estimated_delivery,
  updated_at = excluded.updated_at;
