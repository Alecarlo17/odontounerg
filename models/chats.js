/* =============================================
   MODEL: CHATS.JS
   Modelo de datos para el chat en tiempo real
   ============================================= */

const db = require('../config/database');

/**
 * Obtener conversaciones de un usuario (basadas en solicitudes aceptadas)
 */
async function getConversations(userId) {
  try {
    // 1. Obtener solicitudes aceptadas/activas
    const { data: reqs, error: reqsError } = await db.supabase
      .from('requests')
      .select('id, student_id, patient_id, status, student:student_id(id, full_name, avatar_url), patient:patient_id(id, full_name, avatar_url)')
      .or(`student_id.eq.${userId},patient_id.eq.${userId}`)
      .in('status', ['accepted', 'active', 'completed']);

    if (reqsError) throw reqsError;
    if (!reqs || reqs.length === 0) return [];

    const reqIds = reqs.map(r => r.id);

    // 2. Obtener conversaciones existentes
    const { data: convs } = await db.supabase
      .from('conversations')
      .select('id, request_id')
      .in('request_id', reqIds);

    const existingConvs = convs || [];
    const convsByReqId = {};
    existingConvs.forEach(c => convsByReqId[c.request_id] = c);

    // 3. Crear las que falten
    for (const r of reqs) {
      if (!convsByReqId[r.id]) {
        const { data: newConv } = await db.supabase
          .from('conversations')
          .insert({ request_id: r.id })
          .select('id, request_id')
          .single();
        if (newConv) {
          convsByReqId[r.id] = newConv;
        }
      }
    }

    // 4. Mapear al formato esperado
    return reqs.map(r => {
      const conv = convsByReqId[r.id];
      if (!conv) return null;
      
      const student = Array.isArray(r.student) ? r.student[0] : r.student;
      const patient = Array.isArray(r.patient) ? r.patient[0] : r.patient;

      return {
        id: conv.id, // REAL conversation ID
        student_id: r.student_id,
        patient_id: r.patient_id,
        status: r.status,
        student,
        patient
      };
    }).filter(Boolean);
  } catch (e) {
    console.error('Error en getConversations:', e);
    return [];
  }
}

/**
 * Obtener mensajes de una conversación
 */
async function getMessages(conversationId) {
  try {
    const { data, error } = await db.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    return (data || []).map(m => ({
      id: m.id,
      conversation_id: m.conversation_id,
      sender_id: m.sender_id,
      content: m.content,
      created_at: m.created_at,
      image_url: m.image_url
    }));
  } catch (e) {
    console.error('Error en getMessages:', e);
    return [];
  }
}

/**
 * Enviar un mensaje de texto
 */
async function sendMessage(conversationId, senderId, content) {
  try {
    const created_at = new Date().toISOString();
    
    const { error } = await db.supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: content.trim(),
        created_at
      });

    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Error en sendMessage:', e);
    return false;
  }
}

/**
 * Enviar un mensaje con imagen
 */
async function sendImageMessage(conversationId, senderId, imageUrl) {
  try {
    const created_at = new Date().toISOString();
    
    const { error } = await db.supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: '📷 Imagen',
        image_url: imageUrl,
        created_at
      });

    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Error en sendImageMessage:', e);
    return false;
  }
}

/**
 * Reportar un usuario dentro del chat
 */
async function reportUser(reportData) {
  try {
    const created_at = new Date().toISOString();
    
    const { error } = await db.supabase
      .from('user_reports')
      .insert({
        reporter_id: reportData.reporterId,
        reported_id: reportData.reportedId,
        conversation_id: reportData.conversationId,
        motivo: reportData.motivo,
        observacion: reportData.observacion || null,
        status: 'pendiente',
        created_at
      });

    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Error en reportUser:', e);
    return false;
  }
}

/**
 * Obtener todos los reportes (para administración)
 */
async function getAllReports() {
  try {
    const { data, error } = await db.supabase
      .from('user_reports')
      .select(`
        *,
        reporter:profiles!user_reports_reporter_id_fkey(full_name),
        reported:profiles!user_reports_reported_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error en getAllReports:', e);
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
