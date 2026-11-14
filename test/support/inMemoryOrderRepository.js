/**
 * Repositorio en memoria con la misma interfaz que el repositorio MySQL.
 * Permite ejecutar las pruebas de aceptación sin una base de datos real.
 */
export class InMemoryOrderRepository {
  constructor(orders = []) {
    this.orders = new Map(orders.map((order) => [order.id.toUpperCase(), { ...order }]));
  }

  async findById(orderId) {
    return this.orders.get(String(orderId).toUpperCase()) || null;
  }
}

export const sampleOrders = [
  {
    id: 'PED-1001',
    customerName: 'Ana López',
    status: 'En camino',
    location: 'Centro de distribución Guadalajara, Jalisco',
    estimatedDelivery: '2026-11-08T18:00:00',
    updatedAt: '2026-11-07T10:30:00',
  },
  {
    id: 'PED-1002',
    customerName: 'Carlos Ramírez',
    status: 'En preparación',
    location: 'Almacén central, Ciudad de México',
    estimatedDelivery: '2026-11-09T14:30:00',
    updatedAt: '2026-11-07T09:00:00',
  },
  {
    id: 'PED-1004',
    customerName: 'Luis Hernández',
    status: 'Entregado',
    location: 'Domicilio del cliente, Puebla, Puebla',
    estimatedDelivery: '2026-11-06T12:00:00',
    updatedAt: '2026-11-06T12:05:00',
  },
];
