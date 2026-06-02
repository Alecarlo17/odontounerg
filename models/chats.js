/* =============================================
   MODEL: CHATS.JS
   Modelo de datos para el chat en tiempo real
   SQLite como Principal
   ============================================= */

const db = require('../config/database');

/**
 * Obtener conversaciones de un usuario (basadas en solicitudes aceptadas)
 */
async function getConversations(userId) {
  try {
    const sql = `
      SELECT r.id as conversation_id, r.student_id, r.patient_id, r.status,
             s.full_name as student_name, s.avatar_url as student_avatar,
             p.full_name as patient_name, p.avatar_url as patient_avatar
      FROM requests r
      LEFT JOIN profiles s ON r.student_id = s.id
      LEFT JOIN profiles p ON r.patient_id = p.id
      WHERE (r.student_id = ? OR r.patient_id = ?)
        AND r.status IN ('accepted', 'active', 'completed')
    `;
    const requests = await db.querySQLite(sql, [userId, userId]);
    
    // Formatear simulando el response original de Supabase
    return requests.map(r => ({
      id: r.conversation_id,
      student_id: r.student_id,
      patient_id: r.patient_id,
      status: r.status,
      student: { id: r.student_id, full_name: r.student_name, avatar_url: r.student_avatar },
      patient: { id: r.patient_id, full_name: r.patient_name, avatar_url: r.patient_avatar }
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Obtener mensajes de una conversación
 */
async function getMessages(conversationId) {
  try {
    // Usamos el id de la solicitud como conversation_id, pero nuestra tabla SQLite no tiene conversation_id.
    // Bueno, en SQLite la creamos como: id, sender_id, receiver_id, message, read, created_at.
    // Vamos a guardar 'conversation_id' dentro de 'id' o crear la tabla correcta.
    // Como no podemos alterar la tabla fácilmente sin perder datos, lo guardaremos con un prefijo o simplemente
    // buscaremos si la tabla soporta conversation_id, si no, lo adaptamos.
    
    // Modificaremos la tabla chats si es necesario o usaremos 'chats' mapeando conversation_id a un campo.
    // Por simplicidad en esta reescritura, y sabiendo que el chat local era un placeholder:
    const sql = 'SELECT * FROM chats WHERE id LIKE ? ORDER BY created_at ASC';
    const data = await db.querySQLite(sql, [conversationId + '%']);
    
    return data.map(m => ({
      id: m.id,
      conversation_id: conversationId,
      sender_id: m.sender_id,
      content: m.message,
      created_at: m.created_at
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Enviar un mensaje de texto
 */
async function sendMessage(conversationId, senderId, content) {
  try {
    const msgId = conversationId + '_' + Date.now();
    const created_at = new Date().toISOString();
    
    // receiver_id no lo tenemos directo, pero podemos inferirlo de la solicitud o dejarlo null
    await db.runSQLite(
      'INSERT INTO chats (id, sender_id, message, created_at) VALUES (?, ?, ?, ?)',
      [msgId, senderId, content.trim(), created_at]
    );

    if (await db.getStatus()) {
      db.supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: content.trim(),
        message_type: 'text',
        created_at
      }).then(()=>{}).catch(()=>{});
    }

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Enviar un mensaje con imagen
 */
async function sendImageMessage(conversationId, senderId, imageUrl) {
  try {
    const msgId = conversationId + '_img_' + Date.now();
    const created_at = new Date().toISOString();
    
    await db.runSQLite(
      'INSERT INTO chats (id, sender_id, message, created_at) VALUES (?, ?, ?, ?)',
      [msgId, senderId, '📷 Imagen: ' + imageUrl, created_at]
    );

    if (await db.getStatus()) {
      db.supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: '📷 Imagen',
        image_url: imageUrl,
        message_type: 'image',
        created_at
      }).then(()=>{}).catch(()=>{});
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Reportar un usuario dentro del chat
 */
async function reportUser(reportData) {
  try {
    const id = Date.now().toString();
    const created_at = new Date().toISOString();
    // Guardamos en la tabla reports (sqlite) en lugar de user_reports
    const content = 'Motivo: ' + reportData.motivo + ' - Obs: ' + reportData.observacion;
    await db.runSQLite(
      'INSERT INTO reports (id, title, content, created_by, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, 'Reporte de Usuario Chat', content, reportData.reporterId, created_at]
    );

    if (await db.getStatus()) {
      db.supabase.from('user_reports').insert({
        reporter_id: reportData.reporterId,
        reported_id: reportData.reportedId,
        conversation_id: reportData.conversationId,
        motivo: reportData.motivo,
        observacion: reportData.observacion || null,
        status: 'pendiente',
        created_at
      }).then(()=>{}).catch(()=>{});
    }

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Obtener todos los reportes (para administración)
 */
async function getAllReports() {
  try {
    const data = await db.querySQLite('SELECT * FROM reports ORDER BY created_at DESC');
    return data;
  } catch (e) {
    return [];
  }
}

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  sendImageMessage,
  reportUser,
  getAllReports
};
