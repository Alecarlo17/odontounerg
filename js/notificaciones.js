/* =============================================
   NOTIFICACIONES.JS
   Sistema de notificaciones simples
   ============================================= */

/**
 * Cargar notificaciones del usuario actual
 * @param {string} userId
 * @returns {Array}
 */
async function loadNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  return data || [];
}

/**
 * Contar notificaciones no leídas
 * @param {string} userId
 * @returns {number}
 */
async function countUnreadNotifications(userId) {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('leida', false);

  return count || 0;
}

/**
 * Marcar notificación como leída
 * @param {string} notificationId
 */
async function markNotificationRead(notificationId) {
  await supabase
    .from('notifications')
    .update({ leida: true })
    .eq('id', notificationId);
}

/**
 * Marcar todas como leídas
 * @param {string} userId
 */
async function markAllNotificationsRead(userId) {
  await supabase
    .from('notifications')
    .update({ leida: true })
    .eq('user_id', userId)
    .eq('leida', false);
}

/**
 * Crear una notificación
 * @param {string} userId - ID del destinatario
 * @param {string} tipo - Tipo de notificación
 * @param {string} titulo - Título
 * @param {string} mensaje - Mensaje
 * @param {string|null} referenciaId - ID de referencia
 */
async function createNotification(userId, tipo, titulo, mensaje, referenciaId = null) {
  await supabase.from('notifications').insert({
    user_id: userId,
    tipo,
    titulo,
    mensaje,
    referencia_id: referenciaId
  });
}

/**
 * Renderizar panel de notificaciones
 * @param {Array} notifications
 * @returns {string} HTML
 */
function renderNotificationsPanel(notifications) {
  if (!notifications || notifications.length === 0) {
    return `
      <div class="empty-state" style="padding: 2rem;">
        <div class="empty-state-icon"><i data-lucide="bell"></i></div>
        <p class="empty-state-title">Sin notificaciones</p>
        <p class="empty-state-text">No tiene notificaciones nuevas</p>
      </div>
    `;
  }

  const icons = {
    solicitud: '<i data-lucide="mail" style="width:20px;height:20px;"></i>',

    aceptada: '✅',
    rechazada: '❌',
    mensaje: '<i data-lucide="message-circle" style="width:20px;height:20px;"></i>',
    cita: '<i data-lucide="calendar" style="width:20px;height:20px;"></i>',
    recordatorio: '⏰',
    calificacion: '⭐',
    sistema: '<i data-lucide="info" style="width:20px;height:20px;"></i>'
  };

  return notifications.map(n => `
    <div class="notification-item ${n.leida ? '' : 'unread'}" 
         onclick="markNotificationRead('${n.id}')" 
         style="padding: 0.85rem 1.25rem; border-bottom: 1px solid var(--border); cursor: pointer; transition: var(--transition); ${n.leida ? '' : 'background: var(--primary-50);'}">
      <div style="display: flex; gap: 0.75rem; align-items: flex-start;">
        <span style="font-size: 1.25rem; display:flex;">${icons[n.tipo] || '<i data-lucide="bell" style="width:20px;height:20px;"></i>'}</span>
        <div style="flex: 1; min-width: 0;">
          <p style="font-weight: 600; font-size: 0.875rem; margin-bottom: 0.15rem;">${escapeHTML(n.titulo)}</p>
          <p style="font-size: 0.8rem; color: var(--text-secondary);">${escapeHTML(n.mensaje)}</p>
          <p style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.25rem;">${timeAgo(n.created_at)}</p>
        </div>
        ${n.leida ? '' : '<span style="width:8px;height:8px;background:var(--primary);border-radius:50%;flex-shrink:0;margin-top:6px;"></span>'}
      </div>
    </div>
  `).join('');
}

/**
 * Inicializar listener de notificaciones en tiempo real
 * @param {string} userId
 * @param {Function} callback
 */
function subscribeToNotifications(userId, callback) {
  supabase
    .channel('notifications-' + userId)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      callback(payload.new);
    })
    .subscribe();
}
