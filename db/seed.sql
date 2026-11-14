-- Pedidos de prueba para validar el chatbot.
USE chatbot;

INSERT INTO orders (id, customer_name, status, location, estimated_delivery)
VALUES
  ('PED-1001', 'Ana López', 'En camino', 'Centro de distribución Guadalajara, Jalisco', '2026-11-08 18:00:00'),
  ('PED-1002', 'Carlos Ramírez', 'En preparación', 'Almacén central, Ciudad de México', '2026-11-09 14:30:00'),
  ('PED-1003', 'María Torres', 'En reparto', 'Ruta de entrega zona norte, Monterrey, Nuevo León', '2026-11-07 20:00:00'),
  ('PED-1004', 'Luis Hernández', 'Entregado', 'Domicilio del cliente, Puebla, Puebla', '2026-11-06 12:00:00')
ON DUPLICATE KEY UPDATE
  customer_name = VALUES(customer_name),
  status = VALUES(status),
  location = VALUES(location),
  estimated_delivery = VALUES(estimated_delivery);
