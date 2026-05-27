/* =============================================
   CONTROLLER: CHAT CONTROLLER
   Controlador del chat en tiempo real
   
   Maneja la lógica de mensajes, envío
   de imágenes y reportes de usuarios.
   ============================================= */

const ChatsModel = require('../models/chats');

/**
 * Obtener conversaciones del usuario
 */
async function getConversations(req, res) {
  const conversations = await ChatsModel.getConversations(req.params.userId);
  return res.json({ success: true, data: conversations });
}

/**
 * Obtener mensajes de una conversación
 */
async function getMessages(req, res) {
  const messages = await ChatsModel.getMessages(req.params.conversationId);
  return res.json({ success: true, data: messages });
}

/**
 * Enviar mensaje de texto
 */
async function sendMessage(req, res) {
  const { conversationId, senderId, content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: 'Mensaje vacío' });
  }

  const success = await ChatsModel.sendMessage(conversationId, senderId, content);
  if (!success) {
    return res.status(500).json({ success: false, message: 'Error al enviar' });
  }
  return res.json({ success: true, message: 'Mensaje enviado' });
}

/**
 * Reportar usuario desde el chat
 */
async function reportUser(req, res) {
  const { reporterId, reportedId, conversationId, motivo, observacion } = req.body;

  // Validar motivo
  const motivosPermitidos = [
    'comportamiento_inapropiado',
    'spam',
    'lenguaje_ofensivo',
    'otro'
  ];

  if (!motivo || !motivosPermitidos.includes(motivo)) {
    return res.status(400).json({
      success: false,
      message: 'Seleccione un motivo válido para el reporte'
    });
  }

  const success = await ChatsModel.reportUser({
    reporterId,
    reportedId,
    conversationId,
    motivo,
    observacion
  });

  if (!success) {
    return res.status(500).json({ success: false, message: 'Error al enviar reporte' });
  }
  return res.json({ success: true, message: 'Reporte enviado correctamente' });
}

/**
 * Obtener todos los reportes (admin)
 */
async function getAllReports(req, res) {
  const reports = await ChatsModel.getAllReports();
  return res.json({ success: true, data: reports });
}

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  reportUser,
  getAllReports
};
