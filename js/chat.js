/* =============================================
   CHAT.JS - Sistema de Chat (MVC / Offline)
   ============================================= */

let currentConversationId = null;
let chatPollingInterval = null;

/**
 * Obtener conversaciones del usuario
 */
async function getConversations(userId) {
  try {
    const res = await fetch(`/api/chat/conversations/${userId}`);
    const json = await res.json();
    const conversations = json.data || [];
    
    // Formatear para que coincida con la interfaz del frontend original
    return conversations.map(c => {
      const isStudent = c.student_id === userId;
      const otherUser = isStudent ? c.patient : c.student;
      return {
        conversationId: c.id,
        requestId: c.id, // usamos el mismo ID
        otherUser: {
          id: otherUser.id,
          full_name: otherUser.full_name,
          avatar_url: otherUser.avatar_url,
          disponibilidad: 'disponible'
        },
        lastMessage: { content: '...' }, // No cargamos el último mensaje por simplicidad offline
        unreadCount: 0
      };
    });
  } catch(e) {
    return [];
  }
}

/**
 * Obtener mensajes de una conversación
 */
async function getMessages(conversationId) {
  try {
    const res = await fetch(`/api/chat/messages/${conversationId}`);
    const json = await res.json();
    return json.data || [];
  } catch(e) {
    return [];
  }
}

/**
 * Enviar mensaje
 */
async function sendMessage(conversationId, senderId, content) {
  if (!content || !content.trim()) return false;

  try {
    const res = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, senderId, content })
    });
    const json = await res.json();
    if (!json.success) throw new Error();
    return true;
  } catch(e) {
    showToast('Error al enviar mensaje offline', 'error');
    return false;
  }
}

/**
 * Marcar mensajes como leídos
 */
async function markMessagesAsRead(conversationId, userId) {
  try {
    // Implementación simplificada
    await fetch(`/api/chat/messages/${conversationId}/read`, { method: 'PUT' });
  } catch(e) {}
}

/**
 * Suscribirse a mensajes en tiempo real (Polling local)
 */
function subscribeToMessages(conversationId, callback) {
  unsubscribeFromMessages();
  let lastChecked = new Date().toISOString();

  chatPollingInterval = setInterval(async () => {
    try {
      const msgs = await getMessages(conversationId);
      const nuevas = msgs.filter(m => m.created_at > lastChecked);
      if (nuevas.length > 0) {
        lastChecked = nuevas[nuevas.length - 1].created_at;
        nuevas.forEach(m => callback(m));
      }
    } catch(e) {}
  }, 3000); // Polling cada 3 segundos
}

/**
 * Cancelar suscripción al chat
 */
function unsubscribeFromMessages() {
  if (chatPollingInterval) {
    clearInterval(chatPollingInterval);
    chatPollingInterval = null;
  }
}

/**
 * Renderizar un mensaje como HTML
 */
function renderMessage(msg, currentUserId) {
  const isSent = msg.sender_id === currentUserId;
  const time = new Date(msg.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

  let contentHTML;
  if (msg.content && msg.content.startsWith('📷 Imagen: ')) {
    const url = msg.content.replace('📷 Imagen: ', '');
    contentHTML = `<div class="message-image"><a href="#" target="_blank"><img src="${url}" alt="Imagen" loading="lazy"></a></div>`;
  } else {
    contentHTML = `<div class="message-bubble">${escapeHTML(msg.content)}</div>`;
  }

  return `
    <div class="message ${isSent ? 'sent' : 'received'}">
      ${contentHTML}
      <span class="message-time">${time}</span>
    </div>
  `;
}

/**
 * Scroll al final de los mensajes
 */
function scrollToBottom() {
  const container = document.getElementById('chat-messages');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}
