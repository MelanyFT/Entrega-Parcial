/**
 * Menú de preguntas del ChatBot (RF_03).
 * Pregunta 1: rastreo por ID (RF_04).
 * Pregunta 2: dudas generales sobre el pedido (RF_05).
 */
export const chatQuestions = [
  {
    id: 'order-status',
    type: 'order-id',
    label: '¿Ingresa el ID del pedido para saber en dónde se encuentra mi pedido?',
    prompt: 'Ingresa el ID del pedido para saber en dónde se encuentra mi pedido.',
  },
  {
    id: 'order-question',
    type: 'free-text',
    label: '¿Duda con respecto a mi pedido?',
    prompt:
      'Escribe tu duda con respecto a tu pedido. Por ejemplo: tiempo de llegada, cancelación o reembolso.',
  },
];
