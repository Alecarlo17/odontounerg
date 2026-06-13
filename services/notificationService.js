const db = require('../config/database');
const crypto = require('crypto');

/**
 * Enviar una notificación a un usuario
 */
async function sendNotification(userId, tipo, titulo, mensaje, referenciaId = null) {
  try {
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();
    await db.supabase.from('notifications').insert({
      id, user_id: userId, tipo, titulo, mensaje,
      referencia_id: referenciaId, leida: false, created_at
    });
  } catch(e) {
    console.error('Error sending notification:', e);
  }
}

/**
 * Registrar actividad en el log de auditoría
 */
async function logActivity(userId, userName, accion, modulo, detalle = '') {
  try {
    await db.supabase.from('activity_log').insert({
      user_id: userId,
      user_name: userName || 'Sistema',
      accion,
      modulo,
      detalle,
      created_at: new Date().toISOString()
    });
  } catch(e) {
    console.error('Error logging activity:', e);
  }
}

module.exports = { sendNotification, logActivity };
