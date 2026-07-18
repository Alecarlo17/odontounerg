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
    const finalConversations = [];
    for (const r of reqs) {
      const conv = convsByReqId[r.id];
      if (!conv) continue;
      
      const student = Array.isArray(r.student) ? r.student[0] : r.student;
      const patient = Array.isArray(r.patient) ? r.patient[0] : r.patient;

      const { data: lastMsg } = await db.supabase
        .from('messages')
        .select('content, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const { count: unreadCount } = await db.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('tipo', 'mensaje')
        .eq('referencia_id', conv.id)
        .eq('leida', false);

      finalConversations.push({
        id: conv.id,
        student_id: r.student_id,
        patient_id: r.patient_id,
        status: r.status,
        student,
        patient,
        lastMessage: lastMsg && lastMsg.length > 0 ? lastMsg[0] : null,
        unreadCount: unreadCount || 0
      });
    }

    return finalConversations;
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
    
    await notifyReceiver(conversationId, senderId);
    return true;
  } catch (e) {
    console.error('Error en sendMessage:', e);
    return false;
  }
}

/**
 * Notificar al receptor sobre el nuevo mensaje
 */
async function notifyReceiver(conversationId, senderId) {
  try {
    const { data: conv } = await db.supabase
      .from('conversations')
      .select('request_id')
      .eq('id', conversationId)
      .single();
      
    if (!conv) return;

    const { data: req } = await db.supabase
      .from('requests')
      .select('student_id, patient_id')
      .eq('id', conv.request_id)
      .single();

    if (!req) return;

    const receiverId = (senderId === req.student_id) ? req.patient_id : req.student_id;

    // Verificar si ya tiene una notificación de chat sin leer
    const { data: existing } = await db.supabase
      .from('notifications')
      .select('id')
      .eq('user_id', receiverId)
      .eq('tipo', 'mensaje')
      .eq('referencia_id', conversationId)
      .eq('leida', false)
      .limit(1);

    if (!existing || existing.length === 0) {
      await db.supabase.from('notifications').insert({
        id: require('crypto').randomUUID(),
        user_id: receiverId,
        tipo: 'mensaje',
        titulo: 'Nuevo mensaje',
        mensaje: 'Tienes un nuevo mensaje sin leer.',
        referencia_id: conversationId,
        created_at: new Date().toISOString(),
        leida: false
      });
    }
  } catch(e) {
    console.error('Error notificando receptor:', e);
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
    
    await notifyReceiver(conversationId, senderId);
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
      .from('reports')
      .insert({
        reporter_id: reportData.reporterId,
        reported_id: reportData.reportedId,
        reason: reportData.motivo,
        description: reportData.observacion || null,
        status: 'pending',
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
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    if (data) {
      // Mapear el status de vuelta al español para el frontend
      const reverseStatusMap = {
        'pending': 'pendiente',
        'reviewed': 'revisado',
        'resolved': 'resuelto'
      };
      
      for (let r of data) {
        if (r.status && reverseStatusMap[r.status]) {
          r.status = reverseStatusMap[r.status];
        }
        
        // Mapear campos de inglés a español para el frontend
        if (r.reason !== undefined) {
          r.motivo = r.reason;
        }
        if (r.description !== undefined) {
          r.observacion = r.description;
        }
        
        if (r.reporter_id) {
          const { data: rep } = await db.supabase.from('profiles').select('full_name').eq('id', r.reporter_id).single();
          if (rep) r.reporter = rep;
        }
        if (r.reported_id) {
          const { data: repd } = await db.supabase.from('profiles').select('full_name').eq('id', r.reported_id).single();
          if (repd) r.reported = repd;
        }
      }
    }
    
    return data || [];
  } catch (e) {
    console.error('Error en getAllReports:', e);
    return [];
  }
}

/**
 * Actualizar estado de reporte
 */
async function updateReportStatus(reportId, status) {
  try {
    const statusMap = {
      'pendiente': 'pending',
      'revisado': 'reviewed',
      'resuelto': 'resolved'
    };
    const dbStatus = statusMap[status] || status;

    const { error } = await db.supabase
      .from('reports')
      .update({ status: dbStatus })
      .eq('id', reportId);

    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Error en updateReportStatus:', e);
    return false;
  }
}

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  sendImageMessage,
  reportUser,
  getAllReports,
  updateReportStatus
};
