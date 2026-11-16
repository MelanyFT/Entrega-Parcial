/**
 * Repositorio en memoria con la misma interfaz que el repositorio SQLite.
 * Permite ejecutar las pruebas de aceptación sin una base de datos real.
 */
export class InMemoryOrderRepository {
  constructor(orders = []) {
    this.orders = new Map(orders.map((order) => [order.id.toUpperCase(), { ...order }]));
  }

  async findById(orderId, userId) {
    const order = this.orders.get(String(orderId).toUpperCase());
    if (!order) return null;
    if (userId !== undefined && String(order.userId) !== String(userId)) return null;

    const { userId: _userId, ...publicOrder } = order;
    return publicOrder;
  }
}

export const sampleOrders = [
  {
    id: 'PED-1001',
    userId: 1,
    customerName: 'Ana López',
    status: 'En camino',
    location: 'Centro de distribución Guadalajara, Jalisco',
    estimatedDelivery: '2026-11-08T18:00:00',
    updatedAt: '2026-11-07T10:30:00',
  },
  {
    id: 'PED-1002',
    userId: 2,
    customerName: 'Carlos Ramírez',
    status: 'En preparación',
    location: 'Almacén central, Ciudad de México',
    estimatedDelivery: '2026-11-09T14:30:00',
    updatedAt: '2026-11-07T09:00:00',
  },
  {
    id: 'PED-1003',
    userId: 3,
    customerName: 'María Torres',
    status: 'En reparto',
    location: 'Ruta de entrega zona norte, Monterrey, Nuevo León',
    estimatedDelivery: '2026-11-07T20:00:00',
    updatedAt: '2026-11-07T16:45:00',
  },
  {
    id: 'PED-1004',
    userId: 4,
    customerName: 'Luis Hernández',
    status: 'Entregado',
    location: 'Domicilio del cliente, Puebla, Puebla',
    estimatedDelivery: '2026-11-06T12:00:00',
    updatedAt: '2026-11-06T12:05:00',
  },
];
