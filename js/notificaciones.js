/* =============================================
   NOTIFICACIONES.JS
   Sistema de notificaciones con Supabase Realtime
   ============================================= */

let _notifChannel = null;

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
async function countUnreadNotifications(userId, categoria = null) {
  try {
    const url = categoria ? `/api/notifications/${userId}/count?categoria=${categoria}` : `/api/notifications/${userId}/count`;
    const res = await fetch(url);
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
async function markAllNotificationsRead(userId, categoria = null) {
  try {
    const url = categoria ? `/api/notifications/${userId}/read-all?categoria=${categoria}` : `/api/notifications/${userId}/read-all`;
    await fetch(url, { method: 'PUT' });
  } catch(e) {}
}

/**
 * Crear una notificación (desde frontend)
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

  const iconMap = {
    solicitud: '<i data-lucide="mail" style="width:18px;height:18px;"></i>',
    aceptada: '✅',
    rechazada: '❌',
    mensaje: '<i data-lucide="message-circle" style="width:18px;height:18px;"></i>',
    cita: '<i data-lucide="calendar" style="width:18px;height:18px;"></i>',
    alta_medica: '🏥',
    sistema: '<i data-lucide="info" style="width:18px;height:18px;"></i>',
    recordatorio: '⏰',
    calificacion: '⭐',
    request_new: '<i data-lucide="mail" style="width:18px;height:18px;"></i>',
    request_accepted: '✅',
    request_rejected: '❌',
    request_discharged: '🏥'
  };

  return notifications.map(n => `
    <div class="notification-item ${n.leida ? '' : 'unread'}"
         onclick="handleNotificationClick('${n.id}', '${n.tipo}', '${n.referencia_id || ''}')"
         style="padding:0.85rem 1.25rem;border-bottom:1px solid var(--border);cursor:pointer;transition:var(--transition);${n.leida ? '' : 'background:var(--primary-50);'}">
      <div style="display:flex;gap:0.75rem;align-items:flex-start;">
        <span style="font-size:1.1rem;display:flex;align-items:center;flex-shrink:0;margin-top:2px;">${iconMap[n.tipo] || '<i data-lucide="bell" style="width:18px;height:18px;"></i>'}</span>
        <div style="flex:1;min-width:0;">
          <p style="font-weight:600;font-size:0.875rem;margin-bottom:0.15rem;">${escapeHTML(n.titulo)}</p>
          <p style="font-size:0.8rem;color:var(--text-secondary);">${escapeHTML(n.mensaje)}</p>
          <p style="font-size:0.7rem;color:var(--text-muted);margin-top:0.25rem;">${timeAgo(n.created_at)}</p>
        </div>
        ${n.leida ? '' : '<span style="width:8px;height:8px;background:var(--primary);border-radius:50%;flex-shrink:0;margin-top:6px;"></span>'}
      </div>
    </div>
  `).join('');
}

  /**
   * Suscribirse a notificaciones (Supabase Realtime + Polling Fallback)
   */
  function subscribeToNotifications(userId, callback) {
    if (_notifChannel) {
      try { supabase.removeChannel(_notifChannel); } catch(_) {}
      _notifChannel = null;
    }
  
    if (!userId) return;
  
    // Intento de Realtime
    _notifChannel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        if (payload.new) callback(payload.new);
      })
      .subscribe();

    let lastSeenDate = new Date().toISOString();

    // Polling de respaldo cada 5 segundos para actualizar badges 
    // y emitir alertas si Realtime no está habilitado en la tabla notifications.
    setInterval(async () => {
      try {
        const res = await fetch(`/api/notifications/${userId}`);
        const json = await res.json();
        const notifs = json.data || [];
        
        // Buscar notificaciones nuevas (creadas después de lastSeenDate)
        const nuevas = notifs.filter(n => new Date(n.created_at) > new Date(lastSeenDate));
        
        if (nuevas.length > 0) {
          // Actualizar lastSeenDate a la más reciente (notifs viene ordenado desc)
          lastSeenDate = nuevas[0].created_at;
          
          // Disparar callback para cada notificación nueva (muestra el Toast)
          // Se iteran al revés para que se muestren en orden cronológico
          [...nuevas].reverse().forEach(n => callback(n));
        }

        if (typeof updateNotificationBadge === 'function') {
          updateNotificationBadge();
        }
      } catch(e) {}
    }, 5000);
  
    return _notifChannel;
  }

/**
 * Cancelar suscripción a notificaciones
 */
function unsubscribeFromNotifications() {
  if (_notifChannel) {
    try { supabase.removeChannel(_notifChannel); } catch(_) {}
    _notifChannel = null;
  }
}
