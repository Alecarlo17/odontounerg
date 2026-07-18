/* =============================================
   CHAT.JS - Sistema de Chat con Supabase Realtime
   ============================================= */

let currentConversationId = null;
let _chatChannel = null;

/**
 * Obtener conversaciones del usuario
 */
async function getConversations(userId) {
  try {
    const res = await fetch(`/api/chat/conversations/${userId}`);
    const json = await res.json();
    const conversations = json.data || [];

    return conversations.map(c => {
      const isStudent = c.student_id === userId;
      const otherUser = isStudent ? c.patient : c.student;
      return {
        conversationId: c.id,
        requestId: c.id,
        otherUser: {
          id: otherUser?.id,
          full_name: otherUser?.full_name || 'Usuario',
          avatar_url: otherUser?.avatar_url,
          disponibilidad: 'disponible'
        },
        lastMessage: c.lastMessage || null,
        unreadCount: c.unreadCount || 0
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
    showToast('Error al enviar mensaje', 'error');
    return false;
  }
}

/**
 * Enviar imagen en chat
 */
async function sendChatImage(file, conversationId, senderId) {
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast('La imagen no puede exceder 5MB', 'error');
    return;
  }

  if (!file.type.startsWith('image/')) {
    showToast('Solo se permiten archivos de imagen', 'error');
    return;
  }

  showLoading(true);
  try {
    const client = window.supabaseClient || supabase;
    const fileExt = file.name.split('.').pop();
    const fileName = `${conversationId}/${Date.now()}.${fileExt}`;
    
    // Si la cubeta 'chat_images' no existe o da error de RLS, usamos 'avatars' como respaldo temporal
    let bucket = 'chat_images';
    let uploadRes = await client.storage.from(bucket).upload(fileName, file);

    if (uploadRes.error) {
      console.warn("Fallo en chat_images, intentando con bucket 'avatars'...", uploadRes.error);
      bucket = 'avatars';
      uploadRes = await client.storage.from(bucket).upload(fileName, file);
    }

    if (uploadRes.error) {
      console.error("Error subiendo imagen a storage:", uploadRes.error);
      throw new Error('Error subiendo imagen al Storage');
    }

    const { data: urlData } = client.storage
      .from(bucket)
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    const res = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, senderId, content: `[Imagen] ${imageUrl}` })
    });
    
    const json = await res.json();
    if (!json.success) throw new Error('Error guardando el mensaje en la BD');
    
    showToast('Imagen enviada', 'success');
    return true;
  } catch (err) {
    console.error("sendChatImage Error:", err);
    showToast('Error al procesar la imagen', 'error');
    return false;
  } finally {
    showLoading(false);
  }
}

/**
 * Marcar mensajes como leídos
 */
async function markMessagesAsRead(conversationId, userId) {
  try {
    await fetch(`/api/chat/messages/${conversationId}/read`, { method: 'PUT' });
  } catch(e) {}
}

/**
 * Suscribirse a mensajes con Supabase Realtime
 * Reemplaza el antiguo setInterval de 3s → 0 queries en idle
 */
function subscribeToMessages(conversationId, callback) {
  unsubscribeFromMessages(); // Siempre cancelar anterior primero

  if (!conversationId) return;

  _chatChannel = supabase
    .channel(`chat-${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    }, (payload) => {
      if (payload.new) callback(payload.new);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Chat ${conversationId} conectado`);
      }
    });

  return _chatChannel;
}

/**
 * Cancelar suscripción al chat activo
 */
function unsubscribeFromMessages() {
  if (_chatChannel) {
    try { supabase.removeChannel(_chatChannel); } catch(_) {}
    _chatChannel = null;
  }
}

/**
 * Renderizar un mensaje como HTML
 */
function renderMessage(msg, currentUserId) {
  const isSent = msg.sender_id === currentUserId;
  const time = new Date(msg.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

  let contentHTML;
  const content = msg.content || '';
  if (content.startsWith('📷 Imagen: ') || content.startsWith('[Imagen] ')) {
    const url = content.replace('📷 Imagen: ', '').replace('[Imagen] ', '').trim();
    contentHTML = `
      <div class="message-bubble message-image-container" style="padding:0.25rem;background:transparent;">
        <a href="${url}" target="_blank">
          <img src="${url}" alt="Imagen enviada" loading="lazy" style="max-width:100%;height:auto;max-height:220px;border-radius:12px;display:block;box-shadow:var(--shadow-sm);">
        </a>
      </div>`;
  } else {
    contentHTML = `<div class="message-bubble">${escapeHTML(content)}</div>`;
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
  if (container) container.scrollTop = container.scrollHeight;
}
