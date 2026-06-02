/* =============================================
   CONTROLLER: NOTIFICATIONS CONTROLLER
   ============================================= */

const db = require('../config/database');

async function loadNotifications(req, res) {
  const { userId } = req.params;
  try {
    const data = await db.querySQLite('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [userId]);
    return res.json({ success: true, data: data || [] });
  } catch(e) {
    return res.status(500).json({ success: false, data: [] });
  }
}

async function countUnread(req, res) {
  const { userId } = req.params;
  try {
    const data = await db.getSQLite('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND leida = 0', [userId]);
    return res.json({ success: true, count: data ? data.count : 0 });
  } catch(e) {
    return res.status(500).json({ success: false, count: 0 });
  }
}

async function markRead(req, res) {
  const { id } = req.params;
  try {
    await db.runSQLite('UPDATE notifications SET leida = 1 WHERE id = ?', [id]);
    if (await db.getStatus()) {
      db.supabase.from('notifications').update({ leida: true }).eq('id', id).then(()=>{}).catch(()=>{});
    }
    return res.json({ success: true });
  } catch(e) {
    return res.status(500).json({ success: false });
  }
}

async function markAllRead(req, res) {
  const { userId } = req.params;
  try {
    await db.runSQLite('UPDATE notifications SET leida = 1 WHERE user_id = ? AND leida = 0', [userId]);
    if (await db.getStatus()) {
      db.supabase.from('notifications').update({ leida: true }).eq('user_id', userId).eq('leida', false).then(()=>{}).catch(()=>{});
    }
    return res.json({ success: true });
  } catch(e) {
    return res.status(500).json({ success: false });
  }
}

async function createNotification(req, res) {
  const { userId, tipo, titulo, mensaje, referenciaId } = req.body;
  try {
    const id = Date.now().toString();
    const created_at = new Date().toISOString();
    await db.runSQLite(
      'INSERT INTO notifications (id, user_id, tipo, titulo, mensaje, referencia_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, userId, tipo, titulo, mensaje, referenciaId || null, created_at]
    );

    if (await db.getStatus()) {
      db.supabase.from('notifications').insert({
        id, user_id: userId, tipo, titulo, mensaje, referencia_id: referenciaId, created_at
      }).then(()=>{}).catch(()=>{});
    }
    return res.json({ success: true });
  } catch(e) {
    return res.status(500).json({ success: false });
  }
}

module.exports = {
  loadNotifications, countUnread, markRead, markAllRead, createNotification
};
