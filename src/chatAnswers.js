const DELIVERY_PATTERN = /(tiempo|cu[aá]ndo|cuando|llegada|llegar|demora|retraso|entrega|fecha)/i;
const CANCELLATION_PATTERN = /(cancelar|cancelaci[oó]n|cancelacion)/i;
const REFUND_PATTERN = /(reembolso|devoluci[oó]n|devolucion|dinero|pago)/i;
const ORDER_ID_PATTERN = /\bPED-\d{3,}\b/i;

/** Extrae un ID de pedido del texto libre, si existe. */
export function extractOrderId(text) {
  const match = String(text || '').match(ORDER_ID_PATTERN);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Responde una duda del usuario con reglas simples (RF_05).
 * Si la duda incluye un ID de pedido propio, se usa su información.
 */
export function answerQuestion(question, { order = null, displayName = '' } = {}) {
  const text = String(question || '');

  if (order && DELIVERY_PATTERN.test(text)) {
    const estimated = order.estimatedDelivery
      ? ` La entrega estimada es ${formatDate(order.estimatedDelivery)}.`
      : '';

    return {
      intent: 'delivery-time',
      answer: `Tu pedido ${order.id} está "${order.status}" y se encuentra en ${order.location}.${estimated}`,
    };
  }

  if (DELIVERY_PATTERN.test(text)) {
    return {
      intent: 'delivery-time',
      answer:
        'El tiempo de entrega depende de la ruta y del estatus de tu pedido. Consulta la Pregunta 1 con tu ID para ver la ubicación y la fecha estimada.',
    };
  }

  if (CANCELLATION_PATTERN.test(text)) {
    return {
      intent: 'cancellation',
      answer:
        'Puedes solicitar la cancelación de tu pedido antes de que salga a reparto. Si ya está en camino, espera a recibirlo y solicita una devolución.',
    };
  }

  if (REFUND_PATTERN.test(text)) {
    return {
      intent: 'refund',
      answer:
        'Si tu pedido fue cancelado o llegó con problemas, puedes solicitar un reembolso. Un asesor revisará tu caso y te indicará los pasos a seguir.',
    };
  }

  return {
    intent: 'general',
    answer: `Gracias por tu duda${displayName ? `, ${displayName}` : ''}. No tengo una respuesta automática para esa consulta, pero un asesor la revisará y te contactará.`,
  };
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
