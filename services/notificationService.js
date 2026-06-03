const db = require('../config/database');
const crypto = require('crypto');

async function sendNotification(userId, tipo, titulo, mensaje, referenciaId = null) {
  try {
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();
    
    await db.supabase.from('notifications').insert({
      id, user_id: userId, tipo, titulo, mensaje, referencia_id: referenciaId, created_at
    });
  } catch(e) {
    console.error('Error sending notification', e);
  }
}

module.exports = { sendNotification };
