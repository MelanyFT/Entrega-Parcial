/**
 * Menú de preguntas del ChatBot (RF_02).
 * La primera pregunta es la definida en RF_03: rastreo por ID de pedido.
 */
export const chatQuestions = [
  {
    id: 'order-status',
    type: 'order-id',
    label: '¿Ingresa el ID del pedido para saber en dónde se encuentra mi pedido?',
    prompt: 'Ingresa el ID del pedido para saber en dónde se encuentra mi pedido.',
  },
  {
    id: 'status-help',
    type: 'info',
    label: '¿Qué significa cada estatus de mi pedido?',
    answer:
      'En preparación: tu pedido se está empacando. En camino: ya salió del almacén. En reparto: está en la ruta de entrega. Entregado: fue recibido en el domicilio.',
  },
  {
    id: 'advisor',
    type: 'info',
    label: '¿Cómo puedo contactar a un asesor?',
    answer:
      'Si tu consulta no se resuelve con el ChatBot, escribe a soporte@envios-express.example y un asesor te responderá en un máximo de 24 horas.',
  },
];
