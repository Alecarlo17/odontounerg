/* =============================================
   CONTROLLER: NOTIFICATIONS CONTROLLER
   ============================================= */

const db = require('../config/database');
const crypto = require('crypto');

async function loadNotifications(req, res) {
  const { userId } = req.params;
  try {
    const { data, error } = await db.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return res.json({ success: true, data: data || [] });
  } catch(e) {
    console.error('Error in loadNotifications:', e);
    return res.status(500).json({ success: false, data: [] });
  }
}

async function countUnread(req, res) {
  const { userId } = req.params;
  try {
    const { count, error } = await db.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('leida', false);

    if (error) throw error;
    return res.json({ success: true, count: count || 0 });
  } catch(e) {
    console.error('Error in countUnread:', e);
    return res.status(500).json({ success: false, count: 0 });
  }
}

async function markRead(req, res) {
  const { id } = req.params;
  try {
    const { error } = await db.supabase
      .from('notifications')
      .update({ leida: true })
      .eq('id', id);

    if (error) throw error;
    return res.json({ success: true });
  } catch(e) {
    console.error('Error in markRead:', e);
    return res.status(500).json({ success: false });
  }
}

async function markAllRead(req, res) {
  const { userId } = req.params;
  try {
    const { error } = await db.supabase
      .from('notifications')
      .update({ leida: true })
      .eq('user_id', userId)
      .eq('leida', false);

    if (error) throw error;
    return res.json({ success: true });
  } catch(e) {
    console.error('Error in markAllRead:', e);
    return res.status(500).json({ success: false });
  }
}

async function createNotification(req, res) {
  const { userId, tipo, titulo, mensaje, referenciaId } = req.body;
  try {
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();
    
    const { error } = await db.supabase
      .from('notifications')
      .insert({
        id, 
        user_id: userId, 
        tipo, 
        titulo, 
        mensaje, 
        referencia_id: referenciaId || null, 
        created_at,
        leida: false
      });

    if (error) throw error;
    return res.json({ success: true });
  } catch(e) {
    console.error('Error in createNotification:', e);
    return res.status(500).json({ success: false });
  }
}

module.exports = {
  loadNotifications, countUnread, markRead, markAllRead, createNotification
};
