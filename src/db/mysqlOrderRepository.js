/**
 * Repositorio de pedidos respaldado por MySQL.
 * Devuelve objetos con nombres de campo listos para la API (camelCase).
 */
export function createMysqlOrderRepository(pool) {
  return {
    async findById(orderId) {
      const [rows] = await pool.execute(
        `SELECT
           id,
           customer_name,
           status,
           location,
           DATE_FORMAT(estimated_delivery, '%Y-%m-%dT%H:%i:%s') AS estimated_delivery,
           DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s') AS updated_at
         FROM orders
         WHERE id = ?
         LIMIT 1`,
        [orderId]
      );

      if (rows.length === 0) return null;

      const row = rows[0];
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
