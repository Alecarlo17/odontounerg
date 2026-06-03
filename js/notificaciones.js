/* =============================================
   NOTIFICACIONES.JS
   Sistema de notificaciones locales
   ============================================= */

/**
 * Cargar notificaciones del usuario actual
 */
async function loadNotifications(userId) {
  try {
    const res = await fetch(`/api/notifications/${userId}`);
    const json = await res.json();
    return json.data || [];
  } catch(e) {
    return [];
  }
}

/**
 * Contar notificaciones no leídas
 */
async function countUnreadNotifications(userId) {
  try {
    const res = await fetch(`/api/notifications/${userId}/count`);
    const json = await res.json();
    return json.count || 0;
  } catch(e) {
    return 0;
  }
}

/**
 * Marcar notificación como leída
 */
async function markNotificationRead(notificationId) {
  try {
    await fetch(`/api/notifications/${notificationId}/read`, { method: 'PUT' });
  } catch(e) {}
}

/**
 * Marcar todas como leídas
 */
async function markAllNotificationsRead(userId) {
  try {
    await fetch(`/api/notifications/${userId}/read-all`, { method: 'PUT' });
  } catch(e) {}
}

/**
 * Crear una notificación
 */
async function createNotification(userId, tipo, titulo, mensaje, referenciaId = null) {
  try {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, tipo, titulo, mensaje, referenciaId })
    });
  } catch(e) {}
}

/**
 * Renderizar panel de notificaciones
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
         onclick="handleNotificationClick('${n.id}')" 
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
 * Inicializar listener de notificaciones (Polling)
 */
function subscribeToNotifications(userId, callback) {
  // Revisamos si hay notificaciones nuevas cada 5 segundos.
  let lastCheckedTime = new Date().toISOString();

  setInterval(async () => {
    try {
      const res = await fetch(`/api/notifications/${userId}`);
      const json = await res.json();
      const notifs = json.data || [];
      
      const nuevas = notifs.filter(n => n.created_at > lastCheckedTime);
      if (nuevas.length > 0) {
        lastCheckedTime = nuevas[0].created_at; // actualizar último check
        nuevas.forEach(n => callback(n));
      }
    } catch(e) {}
  }, 5000);
}
