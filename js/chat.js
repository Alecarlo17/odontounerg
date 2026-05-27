/* =============================================
   CHAT.JS - Sistema de Chat en Tiempo Real
   ============================================= */

// Variable global para la suscripción activa
let chatSubscription = null;
let currentConversationId = null;

/**
 * Obtener conversaciones del usuario
 * @param {string} userId
 */
async function getConversations(userId) {
  // Obtener requests donde el usuario es estudiante o paciente y están aceptadas
  const { data: requests } = await supabase
    .from('requests')
    .select(`
      id,
      student_id,
      patient_id,
      status,
      conversations(id, created_at)
    `)
    .or(`student_id.eq.${userId},patient_id.eq.${userId}`)
    .in('status', ['accepted', 'active', 'completed'])
    .order('updated_at', { ascending: false });

  if (!requests) return [];

  // Enriquecer con datos del otro usuario y último mensaje
  const conversations = [];
  for (const req of requests) {
    if (!req.conversations || req.conversations.length === 0) continue;
    const conv = req.conversations[0];
    const otherUserId = req.student_id === userId ? req.patient_id : req.student_id;

    // Obtener datos del otro usuario
    const { data: otherUser } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, disponibilidad')
      .eq('id', otherUserId)
      .single();

    // Obtener último mensaje
    const { data: lastMsg } = await supabase
      .from('messages')
      .select('content, created_at, sender_id')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Contar no leídos
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .eq('read', false)
      .neq('sender_id', userId);

    conversations.push({
      conversationId: conv.id,
      requestId: req.id,
      otherUser,
      lastMessage: lastMsg,
      unreadCount: count || 0
    });
  }

  return conversations;
}

/**
 * Obtener mensajes de una conversación
 * @param {string} conversationId
 */
async function getMessages(conversationId) {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  return data || [];
}

/**
 * Enviar mensaje
 * @param {string} conversationId
 * @param {string} senderId
 * @param {string} content
 */
async function sendMessage(conversationId, senderId, content) {
  if (!content || !content.trim()) return false;

  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content: content.trim()
  });

  if (error) {
    showToast('Error al enviar mensaje', 'error');
    return false;
  }
  return true;
}

/**
 * Marcar mensajes como leídos
 * @param {string} conversationId
 * @param {string} userId - ID del usuario que está leyendo
 */
async function markMessagesAsRead(conversationId, userId) {
  await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('read', false);
}

/**
 * Suscribirse a mensajes en tiempo real
 * @param {string} conversationId
 * @param {Function} callback
 */
function subscribeToMessages(conversationId, callback) {
  // Cancelar suscripción anterior si existe
  if (chatSubscription) {
    supabase.removeChannel(chatSubscription);
  }

  chatSubscription = supabase
    .channel('messages-' + conversationId)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    }, (payload) => {
      callback(payload.new);
    })
    .subscribe();
}

/**
 * Cancelar suscripción al chat
 */
function unsubscribeFromMessages() {
  if (chatSubscription) {
    supabase.removeChannel(chatSubscription);
    chatSubscription = null;
  }
}

/**
 * Renderizar un mensaje como HTML
 * @param {object} msg - Datos del mensaje
 * @param {string} currentUserId - ID del usuario actual
 * @returns {string} HTML
 */
function renderMessage(msg, currentUserId) {
  const isSent = msg.sender_id === currentUserId;
  const time = new Date(msg.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

  let contentHTML;
  if (msg.message_type === 'image' && msg.image_url) {
    contentHTML = `<div class="message-image"><a href="${msg.image_url}" target="_blank"><img src="${msg.image_url}" alt="Imagen" loading="lazy"></a></div>`;
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
