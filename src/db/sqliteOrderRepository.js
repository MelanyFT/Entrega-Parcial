/**
 * Repositorio de pedidos respaldado por SQLite.
 * Devuelve objetos con nombres de campo listos para la API (camelCase).
 * Solo devuelve pedidos que pertenecen al usuario autenticado.
 */
export function createSqliteOrderRepository(db) {
  const findByIdStatement = db.prepare(
    `SELECT
       id,
       customer_name,
       status,
       location,
       estimated_delivery,
       updated_at
     FROM orders
     WHERE id = ? AND user_id = ?
     LIMIT 1`
  );

  return {
    async findById(orderId, userId) {
      const row = findByIdStatement.get(orderId, userId);
      if (!row) return null;

      return {
        id: row.id,
        customerName: row.customer_name,
        status: row.status,
        location: row.location,
        estimatedDelivery: row.estimated_delivery,
        updatedAt: row.updated_at,
      };
    },
  };
}
