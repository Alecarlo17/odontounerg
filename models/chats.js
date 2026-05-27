/* =============================================
   MODEL: CHATS.JS
   Modelo de datos para el chat en tiempo real
   
   Encapsula las consultas a Supabase
   relacionadas con conversaciones y mensajes.
   ============================================= */

const supabase = require('../config/supabase');

/**
 * Obtener conversaciones de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Array} Lista de conversaciones
 */
async function getConversations(userId) {
  const { data: requests } = await supabase
    .from('requests')
    .select(`
      id, student_id, patient_id, status,
      conversations(id, created_at)
    `)
    .or(`student_id.eq.${userId},patient_id.eq.${userId}`)
    .in('status', ['accepted', 'active', 'completed'])
    .order('updated_at', { ascending: false });

  return requests || [];
}

/**
 * Obtener mensajes de una conversación
 * @param {string} conversationId - ID de la conversación
 * @returns {Array} Lista de mensajes
 */
async function getMessages(conversationId) {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  return data || [];
}

/**
 * Enviar un mensaje de texto
 * @param {string} conversationId - ID de la conversación
 * @param {string} senderId - ID del remitente
 * @param {string} content - Contenido del mensaje
 * @returns {boolean} Éxito de la operación
 */
async function sendMessage(conversationId, senderId, content) {
  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content: content.trim(),
    message_type: 'text'
  });

  return !error;
}

/**
 * Enviar un mensaje con imagen
 * @param {string} conversationId - ID de la conversación
 * @param {string} senderId - ID del remitente
 * @param {string} imageUrl - URL de la imagen en Storage
 * @returns {boolean} Éxito de la operación
 */
async function sendImageMessage(conversationId, senderId, imageUrl) {
  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content: '📷 Imagen',
    image_url: imageUrl,
    message_type: 'image'
  });

  return !error;
}

/**
 * Reportar un usuario dentro del chat
 * @param {object} reportData - Datos del reporte
 * @returns {boolean} Éxito de la operación
 */
async function reportUser(reportData) {
  const { error } = await supabase.from('user_reports').insert({
    reporter_id: reportData.reporterId,
    reported_id: reportData.reportedId,
    conversation_id: reportData.conversationId,
    motivo: reportData.motivo,
    observacion: reportData.observacion || null,
    status: 'pendiente'
  });

  return !error;
}

/**
 * Obtener todos los reportes (para administración)
 * @returns {Array} Lista de reportes
 */
async function getAllReports() {
  const { data } = await supabase
    .from('user_reports')
    .select(`
      *,
      reporter:reporter_id(full_name, email),
      reported:reported_id(full_name, email)
    `)
    .order('created_at', { ascending: false });

  return data || [];
}

// Exportar funciones del modelo
module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  sendImageMessage,
  reportUser,
  getAllReports
};
