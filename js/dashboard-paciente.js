/* =============================================
   DASHBOARD-PACIENTE.JS
   Lógica del panel del paciente
   ============================================= */

let currentUser = null;
let allStudents = [];

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await requireAuth();
  if (!currentUser) return;
  if (currentUser.profile?.role !== 'patient') {
    redirectByRole(currentUser.profile.role);
    return;
  }

  setupSidebar();
  await loadDashboardData();

  subscribeToNotifications(currentUser.user.id, (notif) => {
    showToast(notif.titulo, 'info');
    updateNotificationBadge();
    if(typeof loadStats === 'function') loadStats();
    if(typeof loadNotificationsList === 'function') loadNotificationsList();
  });
});

function setupSidebar() {
  const name = currentUser.profile?.full_name || 'Paciente';
  document.getElementById('sidebar-name').textContent = name;
  document.getElementById('sidebar-avatar').textContent = getInitials(name);
}

async function loadDashboardData() {
  showLoading(true);
  try {
    await Promise.all([
      loadStats(),
      loadCasoActivo(),
      loadUpcomingAppointments(),
      updateNotificationBadge()
    ]);
    // Verificar si hay alta médica sin respuesta de reingreso
    checkPendingReingreso();

    // Banner de información clínica
    const banner = document.getElementById('clinical-info-required-banner');
    if (banner) {
      if (!currentUser.roleData?.consultation_reason || currentUser.roleData?.consultation_reason === 'Sin tratamiento pendiente') {
        banner.classList.remove('hidden');
      } else {
        banner.classList.add('hidden');
      }
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showToast('Error de conexión con la base de datos', 'error');
  } finally {
    showLoading(false);
  }
}

async function loadStats() {
  const userId = currentUser.user.id;
  let stats = { pendingRequests: 0, acceptedRequests: 0, activeAppointments: 0 };
  
  try {
    const res = await fetch(`/api/dashboard/patient/${userId}`);
    const json = await res.json();
    if (json.data) stats = json.data;
  } catch (e) {
    console.error('Error loading stats:', e);
  }
  
  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card"><div class="stat-icon orange"><i data-lucide="mail"></i></div><div class="stat-info"><div class="stat-label">Solicitudes Pendientes</div><div class="stat-value">${stats.pendingRequests}</div></div></div>
    <div class="stat-card"><div class="stat-icon green"><i data-lucide="graduation-cap"></i></div><div class="stat-info"><div class="stat-label">Estudiantes Asignados</div><div class="stat-value">${stats.acceptedRequests}</div></div></div>
    <div class="stat-card"><div class="stat-icon blue"><i data-lucide="calendar"></i></div><div class="stat-info"><div class="stat-label">Citas Activas</div><div class="stat-value">${stats.activeAppointments}</div></div></div>
    <div class="stat-card"><div class="stat-icon cyan"><i data-lucide="clipboard-check"></i></div><div class="stat-info"><div class="stat-label">Tratamientos Recibidos</div><div class="stat-value">${stats.completedTreatments || 0}</div></div></div>
  `;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Cargar estado del caso actual (Timeline)
 */
async function loadCasoActivo() {
  const container = document.getElementById('caso-activo-info');
  if (!container) return;

  try {
    const res = await fetch(`/api/dashboard/case-status/${currentUser.user.id}`);
    const json = await res.json();
    const caso = json.data;

    if (!caso) {
      // Sin caso activo: mostrar solicitudes pendientes
      const requests = await getPatientRequests(currentUser.user.id, 'pending');
      if (requests.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="heart-pulse"></i></div><p class="empty-state-text">Sin caso activo. Complete su diagnóstico para aparecer en la búsqueda.</p></div>';
      } else {
        container.innerHTML = `
          <p style="font-size:0.9rem;font-weight:600;margin-bottom:0.75rem;">
            📬 Solicitudes recibidas (${requests.length})
          </p>
          ${requests.slice(0,3).map(req => `
            <div style="display:flex;align-items:center;gap:0.75rem;padding:0.65rem 0;border-bottom:1px solid var(--border);">
              <span class="avatar avatar-sm avatar-placeholder">${getInitials(req.student?.full_name || 'E')}</span>
              <div style="flex:1"><p style="font-weight:600;font-size:0.875rem">${escapeHTML(req.student?.full_name || 'Estudiante')}</p>
              <p style="font-size:0.75rem;color:var(--text-muted)">${timeAgo(req.created_at)}</p></div>
              <div style="display:flex;gap:0.35rem">
                <button class="btn btn-success btn-sm" onclick="handleAcceptRequest('${req.id}')">Aceptar</button>
                <button class="btn btn-danger btn-sm" onclick="handleRejectRequest('${req.id}')">Rechazar</button>
              </div>
            </div>
          `).join('')}
        `;
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    // Construir timeline del caso
    const steps = [
      {
        done: true,
        icon: '✅',
        label: 'Solicitud aceptada',
        detail: caso.request.created_at ? new Date(caso.request.created_at).toLocaleDateString('es-VE') : ''
      },
      {
        done: !!caso.firstAppointment,
        icon: caso.firstAppointment ? '✅' : '◎',
        label: 'Primera cita',
        detail: caso.firstAppointment ? new Date(caso.firstAppointment.date).toLocaleDateString('es-VE') : 'Pendiente'
      },
      {
        done: caso.hasTreatments,
        icon: caso.hasTreatments ? '✅' : '◎',
        label: 'Tratamiento iniciado',
        detail: caso.hasTreatments ? `${caso.treatments.length} tratamiento(s)` : 'Pendiente'
      },
      {
        done: caso.totalSessions > 0,
        icon: caso.totalSessions > 0 ? '✅' : '◎',
        label: 'Sesiones clínicas',
        detail: caso.totalSessions > 0 ? `${caso.totalSessions} sesión(es) realizada(s)` : 'Sin sesiones'
      },
      {
        done: caso.request.status === 'completed',
        icon: caso.request.status === 'completed' ? '🏥' : '◎',
        label: 'Alta médica',
        detail: caso.request.discharged_at ? new Date(caso.request.discharged_at).toLocaleDateString('es-VE') : 'Pendiente'
      }
    ];

    const studentName = caso.student?.full_name || 'Tu estudiante';
    const statusBadgeColor = {
      accepted: '#3b82f6',
      active: '#10b981',
      completed: '#6b7280'
    }[caso.request.status] || '#6b7280';

    container.innerHTML = `
      <div style="margin-bottom:1rem;padding:0.75rem;background:var(--gray-50);border-radius:var(--radius);display:flex;align-items:center;gap:0.75rem;">
        <span class="avatar avatar-sm avatar-placeholder">${getInitials(studentName)}</span>
        <div>
          <p style="font-weight:700;font-size:0.95rem;">${escapeHTML(studentName)}</p>
          <span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:0.75rem;font-weight:600;background:${statusBadgeColor};color:white;">${{ accepted: 'Asignado', active: 'En Tratamiento', completed: 'Alta Médica' }[caso.request.status] || caso.request.status}</span>
        </div>
      </div>
      <div style="padding-left:0.5rem;">
        ${steps.map((step, i) => `
          <div style="display:flex;gap:0.75rem;align-items:flex-start;margin-bottom:${i < steps.length - 1 ? '0' : '0'};">
            <div style="display:flex;flex-direction:column;align-items:center;">
              <span style="font-size:1.1rem;line-height:1;">${step.icon}</span>
              ${i < steps.length - 1 ? `<div style="width:2px;height:28px;background:${step.done ? 'var(--success)' : 'var(--border)'};margin:4px 0;"></div>` : ''}
            </div>
            <div style="padding-bottom:${i < steps.length - 1 ? '0' : '0'}">
              <p style="font-weight:600;font-size:0.875rem;color:${step.done ? 'var(--text)' : 'var(--text-muted)'}">${step.label}</p>
              <p style="font-size:0.75rem;color:var(--text-muted);">${step.detail}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch(e) {
    console.error('Error cargando caso activo:', e);
  }
}

/**
 * Verificar si hay alta médica pendiente de respuesta
 */
async function checkPendingReingreso() {
  const key = `reingreso_respondido_${currentUser.user.id}`;
  if (sessionStorage.getItem(key)) return;

  try {
    const res = await fetch(`/api/dashboard/case-status/${currentUser.user.id}`);
    const json = await res.json();
    const caso = json.data;

    if (caso && caso.request.status === 'completed') {
      // Mostrar modal de reingreso automáticamente
      setTimeout(() => openReingresoModal(caso.request.id), 1500);
    }
  } catch(e) {}
}

async function loadUpcomingAppointments() {
  const appointments = await getAppointments(currentUser.user.id);
  const upcoming = appointments.filter(a => ['proposed', 'confirmed'].includes(a.status)).slice(0, 3);
  const container = document.getElementById('upcoming-appointments');
  if (upcoming.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="calendar"></i></div><p class="empty-state-text">Sin citas próximas</p></div>';
    return;
  }
  container.innerHTML = upcoming.map(a => renderAppointmentCard(a, currentUser.user.id)).join('');
}

/**
 * Actualizar badge de notificaciones
 */
async function updateNotificationBadge() {
  if (!currentUser || !currentUser.user) return;
  const uid = currentUser.user.id;
  
  const [reqCount, chatCount, apptCount, genCount] = await Promise.all([
    countUnreadNotifications(uid, 'solicitudes'),
    countUnreadNotifications(uid, 'chat'),
    countUnreadNotifications(uid, 'citas'),
    countUnreadNotifications(uid, 'generales')
  ]);

  const updateBadge = (id, count) => {
    const badge = document.getElementById(id);
    if (!badge) return;
    if (count > 0) { badge.textContent = count; badge.classList.remove('hidden'); }
    else { badge.classList.add('hidden'); }
  };

  updateBadge('req-badge', reqCount);
  updateBadge('chat-badge', chatCount);
  updateBadge('appt-badge', apptCount);
  updateBadge('notif-badge', genCount);

  const dot = document.getElementById('notif-dot');
  if (dot) {
    if (genCount > 0) dot.classList.remove('hidden');
    else dot.classList.add('hidden');
  }
}
const _loadedSections = new Set();

function showSection(sectionName, forceReload = false) {
  document.querySelectorAll('.page-content > section').forEach(s => s.classList.add('hidden'));
  document.getElementById(`section-${sectionName}`).classList.remove('hidden');

  if (typeof setActiveSidebarLink === 'function') {
    setActiveSidebarLink(sectionName);
  }

  const titles = {
    inicio: ['Inicio', 'Panel de control'],
    estudiantes: ['Estudiantes', 'Ver estudiantes disponibles'],
    solicitudes: ['Solicitudes', 'Gestionar solicitudes'],
    citas: ['Citas', 'Gestionar citas'],
    chat: ['Chat', 'Mensajes'],
    historial: ['Historial', 'Tratamientos'],
    perfil: ['Mi Perfil', 'Editar información'],
    notificaciones: ['Notificaciones', 'Centro de notificaciones']
  };
  const [title, subtitle] = titles[sectionName] || ['', ''];
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-subtitle').textContent = subtitle;
  if (!forceReload && _loadedSections.has(sectionName)) {
    return; // Ya fue cargado, usar caché visual
  }

  if (sectionName === 'notificaciones') {
    markAllNotificationsRead(currentUser.user.id, 'generales').then(() => updateNotificationBadge());
    loadNotificationsList(); 
  }
  else if (sectionName === 'solicitudes') {
    markAllNotificationsRead(currentUser.user.id, 'solicitudes').then(() => updateNotificationBadge());
    loadPatientRequestsList(); 
  }
  else if (sectionName === 'citas') {
    markAllNotificationsRead(currentUser.user.id, 'citas').then(() => updateNotificationBadge());
    loadAppointmentsList(); 
  }
  else if (sectionName === 'chat') {
    markAllNotificationsRead(currentUser.user.id, 'chat').then(() => updateNotificationBadge());
    loadChatConversations(); 
  }
  else if (sectionName === 'inicio') { loadDashboardData(); }
  else if (sectionName === 'estudiantes') { loadAvailableStudents(); }
  else if (sectionName === 'tratamientos') { loadTreatmentsHistory(); }
  else if (sectionName === 'historial') { loadTreatmentsHistory(); }
  else if (sectionName === 'perfil') { loadProfileData(); }
  else if (sectionName === 'diagnostico') { loadClinicalInfoForm(); }
  
  _loadedSections.add(sectionName);
}

// Funciones de estudiantes eliminadas: el paciente ya no puede buscar estudiantes ni enviar solicitudes.

async function loadPatientRequestsList(status = null) {
  const requests = await getPatientRequests(currentUser.user.id, status);
  const container = document.getElementById('requests-list');
  if (requests.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="mail"></i></div><p class="empty-state-title">Sin solicitudes</p></div>';
    return;
  }

  container.innerHTML = requests.map(req => {
    const statusInfo = getStatusInfo(req.status);
    const name = req.student?.full_name || 'Estudiante';
    let actions = '';
    let messageStr = req.message || '';
    const isFromPatient = messageStr.startsWith('[FromPatient]');
    if (isFromPatient) messageStr = messageStr.replace('[FromPatient]', '').trim();
    const isFromStudent = messageStr.startsWith('[FromStudent]');
    if (isFromStudent) messageStr = messageStr.replace('[FromStudent]', '').trim();

    if (req.status === 'pending' && !isFromPatient) {
      actions = `
        <button class="btn btn-success btn-sm" onclick="handleAcceptRequest('${req.id}')">Aceptar</button>
        <button class="btn btn-danger btn-sm" onclick="handleRejectRequest('${req.id}')">Rechazar</button>
      `;
    } else if (req.status === 'pending' && isFromPatient) {
      actions = `<span class="badge badge-warning">Enviada</span>`;
    } else if (req.status === 'completed') {
      actions = `<button class="btn btn-primary btn-sm" onclick="openCalificarModal('${req.student_id}')">Calificar Estudiante</button>`;
    }
    return `
      <div class="card" style="margin-bottom:0.75rem;animation:fadeIn 0.4s ease;">
        <div class="card-body" style="display:flex;align-items:center;gap:1rem;">
          <span class="avatar avatar-placeholder">${getInitials(name)}</span>
          <div style="flex:1">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <strong>${escapeHTML(name)}</strong>
              <span class="badge ${statusInfo.class}">${statusInfo.text}</span>
            </div>
            <p style="font-size:0.85rem;color:var(--text-secondary)">${messageStr ? escapeHTML(messageStr) : 'Sin mensaje'}</p>
            <p style="font-size:0.75rem;color:var(--text-muted)">${timeAgo(req.created_at)}</p>
          </div>
          <div style="display:flex;gap:0.35rem">${actions}</div>
        </div>
      </div>
    `;
  }).join('');
}

function showReqTab(status) {
  document.querySelectorAll('#section-solicitudes .tab').forEach(t => t.classList.remove('active'));
  if (typeof event !== 'undefined' && event?.target) {
    event.target.classList.add('active');
  }
  loadPatientRequestsList(status === 'todas' ? null : status);
}

async function handleAcceptRequest(id) {
  const success = await acceptRequest(id);
  if (success) { loadCasoActivo(); loadPatientRequestsList(); loadStats(); loadDashboardData(); }
}

async function handleRejectRequest(id) {
  const ok = await confirmAction('Rechazar Solicitud', '¿Está seguro de rechazar esta solicitud?');
  if (ok) {
    const success = await rejectRequest(id);
    if (success) { loadCasoActivo(); loadPatientRequestsList(); loadStats(); loadDashboardData(); }
  }
}

async function loadAppointmentsList() {
  const appointments = await getAppointments(currentUser.user.id);
  const container = document.getElementById('appointments-list');
  if (appointments.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="calendar"></i></div><p class="empty-state-title">Sin citas</p></div>';
    return;
  }
  container.innerHTML = appointments.map(a => renderAppointmentCard(a, currentUser.user.id)).join('');
}

async function handleConfirmAppointment(id) { await confirmAppointment(id); loadAppointmentsList(); loadDashboardData(); }
async function handleCancelAppointment(id) {
  const ok = await confirmAction('Cancelar Cita', '¿Está seguro?');
  if (ok) { await cancelAppointment(id); loadAppointmentsList(); loadDashboardData(); }
}
async function handleCompleteAppointment(id) { await completeAppointment(id); loadAppointmentsList(); loadDashboardData(); }

// Chat - misma lógica que estudiante
async function loadChatConversations() {
  const conversations = await getConversations(currentUser.user.id);
  const container = document.getElementById('chat-conversations-list');
  if (conversations.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:2rem"><div class="empty-state-icon"><i data-lucide="message-circle"></i></div><p class="empty-state-text">Sin conversaciones</p></div>';
    return;
  }
  container.innerHTML = conversations.map(c => `
    <div class="chat-item" onclick="openChat('${c.conversationId}', '${c.otherUser?.id}', '${escapeHTML(c.otherUser?.full_name || '')}')">
      <div class="chat-item-avatar-placeholder">${getInitials(c.otherUser?.full_name)}</div>
      <div class="chat-item-info">
        <div class="chat-item-name">${escapeHTML(c.otherUser?.full_name || 'Usuario')}</div>
        <div class="chat-item-last">${c.lastMessage ? escapeHTML(c.lastMessage.content) : 'Sin mensajes'}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.25rem">
        <span class="chat-item-time">${c.lastMessage ? timeAgo(c.lastMessage.created_at) : ''}</span>
        ${c.unreadCount > 0 ? `<span class="chat-item-unread">${c.unreadCount}</span>` : ''}
      </div>
    </div>
  `).join('');
}

async function openChat(conversationId, otherUserId, otherName) {
  currentConversationId = conversationId;

  await markMessagesAsRead(conversationId, currentUser.user.id);
  
  try {
    await supabase
      .from('notifications')
      .update({ leida: true })
      .eq('user_id', currentUser.user.id)
      .eq('tipo', 'chat')
      .eq('referencia_id', conversationId);
    if(typeof loadNotificationsList === 'function') loadNotificationsList();
  } catch(e) {}
  const messages = await getMessages(conversationId);
  document.getElementById('chat-main-panel').innerHTML = `
    <div class="chat-main-header">
      <span class="avatar avatar-placeholder avatar-sm">${getInitials(otherName)}</span>
      <div><div class="chat-main-name">${escapeHTML(otherName)}</div></div>
      <div style="margin-left:auto;display:flex;gap:0.25rem;">
        <button class="chat-header-btn" onclick="openReportModal('${otherUserId}', '${conversationId}')" title="Reportar usuario"><i data-lucide="flag" style="width:18px;height:18px;"></i></button>
      </div>
    </div>
    <div class="chat-messages" id="chat-messages">${messages.map(m => renderMessage(m, currentUser.user.id)).join('')}</div>
    <div class="chat-input-area">
      <input type="file" id="chat-image-input" accept="image/*" style="display:none" onchange="handleChatImageUpload(this)">
      <button class="chat-attach-btn" onclick="document.getElementById('chat-image-input').click()" title="Enviar imagen"><i data-lucide="image-plus" style="width:20px;height:20px;"></i></button>
      <input type="text" class="chat-input" id="chat-input" placeholder="Escriba un mensaje..." onkeypress="if(event.key==='Enter')handleSendMessage()">
      <button class="chat-send-btn" onclick="handleSendMessage()"><i data-lucide="send" style="width:18px;height:18px;"></i></button>
    </div>
  `;
  if (typeof lucide !== 'undefined') lucide.createIcons();
  scrollToBottom();
  subscribeToMessages(conversationId, (newMsg) => {
    const container = document.getElementById('chat-messages');
    if (container) { container.innerHTML += renderMessage(newMsg, currentUser.user.id); scrollToBottom(); }
  });
}

async function handleSendMessage() {
  const input = document.getElementById('chat-input');
  if (!input?.value.trim() || !currentConversationId) return;
  const content = input.value.trim();
  input.value = '';
  await sendMessage(currentConversationId, currentUser.user.id, content);
}

/**
 * Manejar envío de imagen en chat
 */
async function handleChatImageUpload(input) {
  if (!input.files || !input.files[0] || !currentConversationId) return;
  await sendChatImage(input.files[0], currentConversationId, currentUser.user.id);
  input.value = '';
}

async function loadTreatmentsHistory() {
  try {
    const res = await fetch(`/api/dashboard/treatments/patient/${currentUser.user.id}`);
    const json = await res.json();
    const treatments = json.data || [];
    
    const container = document.getElementById('treatments-list');
    if (!treatments || treatments.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="clipboard-list"></i></div><p class="empty-state-title">Sin tratamientos</p></div>';
      return;
    }
    container.innerHTML = `<div class="table-wrapper"><table class="data-table"><thead><tr><th>Estudiante</th><th>Tratamiento</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${treatments.map(t => {
      const est = { pendiente: { t: 'Pendiente', c: 'badge-warning' }, en_proceso: { t: 'En proceso', c: 'badge-primary' }, finalizado: { t: 'Finalizado', c: 'badge-success' } }[t.estado] || { t: t.estado, c: 'badge-gray' };
      const btn = t.estado === 'finalizado' ? `<button class="btn btn-sm btn-outline" onclick="openCalificarModal('${t.student_id}')">Calificar</button>` : '';
      return `<tr><td>${escapeHTML(t.other_name || '')}</td><td>${escapeHTML(t.tratamiento)}</td><td>${formatDate(t.fecha)}</td><td><span class="badge ${est.c}">${est.t}</span></td><td>${btn}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  } catch(e) {
    console.error(e);
  }
}

async function loadProfileData() {
  const userData = await getCurrentUser();
  if (!userData) return;
  const { profile, roleData } = userData;
  document.getElementById('profile-name-display').textContent = profile.full_name;
  document.getElementById('profile-email-display').textContent = profile.email;
  document.getElementById('profile-avatar').textContent = getInitials(profile.full_name);
  document.getElementById('prof-name').value = profile.full_name || '';
  document.getElementById('prof-phone').value = profile.phone || '';
  document.getElementById('prof-disponibilidad').value = profile.disponibilidad || 'disponible';
  document.getElementById('prof-age').value = roleData?.age || '';
  document.getElementById('prof-direccion').value = roleData?.direccion || '';
  document.getElementById('prof-problema').value = roleData?.consultation_reason || '';
  document.getElementById('prof-antecedentes').value = roleData?.medical_history || '';

  // Show floating button if patient is inactive
  const floatingBtn = document.getElementById('btn-floating-new-case');
  if (roleData?.accepts_requests === false || roleData?.consultation_reason === 'Sin tratamiento pendiente') {
    floatingBtn.style.display = 'flex';
  } else {
    floatingBtn.style.display = 'none';
  }
}

async function handleUpdateProfile(event) {
  event.preventDefault();
  const userId = currentUser.user.id;
  await updateProfile(userId, { fullName: document.getElementById('prof-name').value, phone: document.getElementById('prof-phone').value, disponibilidad: document.getElementById('prof-disponibilidad').value });
  await updatePatientData(userId, { age: document.getElementById('prof-age').value, phone: document.getElementById('prof-phone').value, address: document.getElementById('prof-direccion').value, medicalHistory: document.getElementById('prof-antecedentes').value, consultationReason: document.getElementById('prof-problema').value });
  setupSidebar();
}

async function handlePhotoUpload(input) {
  if (input.files?.[0]) { showLoading(true); await uploadProfilePhoto(currentUser.user.id, input.files[0]); showLoading(false); loadProfileData(); }
}

async function loadNotificationsList() {
  const notifications = await loadNotifications(currentUser.user.id);
  document.getElementById('notifications-list').innerHTML = renderNotificationsPanel(notifications);
}

window.handleNotificationClick = async (id) => {
  await markNotificationRead(id);
  loadNotificationsList();
  updateNotificationBadge();
};

async function handleMarkAllRead() { 
  await markAllNotificationsRead(currentUser.user.id); 
  loadNotificationsList(); 
  updateNotificationBadge(); 
}

function openCalificarModal(studentId) {
  document.getElementById('calificar-student-id').value = studentId;
  document.getElementById('modal-calificar').classList.add('active');
}

async function handleCalificar(event) {
  event.preventDefault();
  const studentId = document.getElementById('calificar-student-id').value;
  const rating = document.getElementById('calificar-puntuacion').value;
  const comment = document.getElementById('calificar-comentario').value;

  if (!rating) return;
  showLoading(true);

  try {
    // Ruta correcta: /api/ratings/student
    const res = await fetch('/api/ratings/student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        patientId: currentUser.user.id,
        rating: parseInt(rating),
        comment
      })
    });
    const json = await res.json();
    showLoading(false);
    if (!json.success) throw new Error(json.message);

    showToast('Calificación enviada exitosamente ⭐', 'success');
    closeModal('modal-calificar-estudiante');
    document.getElementById('rating-comment').value = '';
    // Resetear estrellas
    document.querySelectorAll('.star-btn').forEach(s => {
      s.style.filter = 'grayscale(1)';
      s.style.color = '';
      s.style.transform = 'scale(1)';
    });

  } catch (e) {
    showLoading(false);
    showToast(e.message || 'Error al enviar calificación', 'error');
  }
}

async function handleReingresoOption(option) {
  closeModal('modal-reingreso-pregunta');
  if (option === 'no') {
    showLoading(true);
    try {
      const res = await fetch(`/api/profile/${currentUser.user.id}/patient/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptsRequests: false,
          consultationReason: 'Sin tratamiento pendiente'
        })
      });
      showLoading(false);
      showToast('Estado actualizado. Ya no aparecerás en las búsquedas de estudiantes.', 'success');
      loadProfileData(); // this will show the floating button
    } catch (e) {
      showLoading(false);
      showToast('Error al actualizar estado', 'error');
    }
  } else if (option === 'si') {
    openNuevoCasoModal();
  }
}

function openNuevoCasoModal() {
  document.getElementById('modal-nuevo-caso').classList.add('active');
}

async function handleSubmitNuevoCaso(event) {
  event.preventDefault();
  const problema = document.getElementById('new-case-problema').value;
  const descripcion = document.getElementById('new-case-descripcion').value;
  const disponibilidad = document.getElementById('new-case-disponibilidad').value;

  showLoading(true);
  try {
    // 1. Update patient status
    const res = await fetch(`/api/profile/${currentUser.user.id}/patient/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acceptsRequests: true,
        consultationReason: problema,
        medicalHistory: descripcion // adding the description to medical history or similar
      })
    });
    
    // 2. Update overall profile for disponibilidad
    await updateProfile(currentUser.user.id, { disponibilidad });

    showLoading(false);
    showToast('Nuevo caso registrado. Ya estás visible para nuevos estudiantes.', 'success');
    closeModal('modal-nuevo-caso');
    document.getElementById('new-case-descripcion').value = '';
    loadProfileData(); // this will hide the floating button
  } catch (e) {
    showLoading(false);
    showToast('Error al registrar nuevo caso', 'error');
  }
}

async function viewStudentProfile(studentId) {
  const s = allStudents.find(st => st.id === studentId);
  if (!s) {
    showToast('No se encontró información del estudiante', 'error');
    return;
  }
  const student = Array.isArray(s.students) ? s.students[0] : (s.students || {});
  const disponibilidad = s.disponibilidad || 'disponible';
  const dispText = disponibilidad === 'disponible' ? 'Disponible' : disponibilidad === 'ocupado' ? 'Ocupado' : 'No disponible';
  const dispClass = disponibilidad === 'disponible' ? 'badge-success' : disponibilidad === 'ocupado' ? 'badge-warning' : 'badge-error';

  const avatarContainer = document.getElementById('perfil-estudiante-avatar');
  if (s.avatar_url) {
    avatarContainer.innerHTML = `<img src="${s.avatar_url}" class="avatar avatar-xl" alt="${escapeHTML(s.full_name)}">`;
  } else {
    avatarContainer.innerHTML = `<span class="avatar avatar-placeholder avatar-xl" style="font-size: 2rem;">${getInitials(s.full_name)}</span>`;
  }

  document.getElementById('perfil-estudiante-nombre').textContent = escapeHTML(s.full_name);
  
  const badgesHtml = [];
  if (student.academic_year) badgesHtml.push(`<span class="badge badge-primary">${escapeHTML(student.academic_year)}</span>`);
  if (student.section) badgesHtml.push(`<span class="badge badge-primary">Sección ${escapeHTML(student.section)}</span>`);
  
  document.getElementById('perfil-estudiante-badges').innerHTML = badgesHtml.join(' ');
  document.getElementById('perfil-estudiante-cedula').textContent = escapeHTML(student.student_id_card || 'No especificada');
  document.getElementById('perfil-estudiante-edad').textContent = escapeHTML(student.age ? student.age + ' años' : 'No especificada');
  document.getElementById('perfil-estudiante-disponibilidad').innerHTML = `<span class="badge ${dispClass}">${dispText}</span>`;
  
  let tratamientos = [];
  try {
    tratamientos = typeof student.treatments_needed === 'string' ? JSON.parse(student.treatments_needed) : (student.treatments_needed || []);
  } catch (e) {
    tratamientos = [];
  }
  const tratamientosContainer = document.getElementById('perfil-estudiante-tratamientos');
  if (tratamientos.length > 0) {
    tratamientosContainer.innerHTML = tratamientos.map(t => `<span class="badge badge-outline">${escapeHTML(t)}</span>`).join('');
  } else {
    tratamientosContainer.innerHTML = '<span style="color:var(--text-muted);font-size:0.85rem">No especificó</span>';
  }

  // Cargar datos en vivo del perfil (estrellas y cupos)
  try {
    const res = await fetch(`/api/profile/${studentId}/public-student`);
    const json = await res.json();
    if (json.success) {
      const avg = json.data.avgRating || 0;
      const count = json.data.ratingsCount || 0;
      const active = json.data.activePatients || 0;

      // Generar estrellas
      const fullStars = Math.round(avg);
      let starsHtml = '';
      for (let i = 1; i <= 5; i++) {
        starsHtml += `<span style="color:${i <= fullStars ? '#eab308' : 'var(--text-muted)'};font-size:1.2rem;">★</span>`;
      }
      starsHtml += ` <span style="font-size:0.9rem;font-weight:600;margin-left:0.5rem;">${avg.toFixed(1)}/5 (${count})</span>`;

      // Insertar en un contenedor de estadísticas extra
      let statsHtml = `
        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
          <div style="display:flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span style="font-size:0.9rem; font-weight:600;">Reputación:</span>
            <span>${starsHtml}</span>
          </div>
          <div style="display:flex; justify-content: space-between;">
            <span style="font-size:0.9rem; font-weight:600;">Pacientes Activos:</span>
            <span style="font-size:0.9rem; ${active >= 3 ? 'color:var(--danger);font-weight:bold;' : ''}">${active} / 3 permitidos</span>
          </div>
        </div>
      `;
      // Añadir al DOM
      const modalBody = document.querySelector('#modal-perfil-estudiante .modal-body');
      let extraStats = document.getElementById('perfil-estudiante-extra-stats');
      if (!extraStats) {
        extraStats = document.createElement('div');
        extraStats.id = 'perfil-estudiante-extra-stats';
        modalBody.insertBefore(extraStats, tratamientosContainer.parentNode);
      }
      extraStats.innerHTML = statsHtml;
    }
  } catch(e) {
    console.error('Error cargando stats de estudiante', e);
  }

  document.getElementById('modal-perfil-estudiante').classList.add('active');
}

// Helpers
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

/* ===== INFORMACIÓN CLÍNICA ===== */
async function loadClinicalInfoForm() {
  showLoading(true);
  const userData = await getCurrentUser();
  showLoading(false);
  if (!userData) return;
  const d = userData.roleData || {};
  const container = document.getElementById('clinical-info-container');
  if (!container) return;

  window.currentClinicalData = d;
  
  container.innerHTML = `
    <div style="background:var(--bg-card,#fff);padding:1.5rem;border-radius:16px;border:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
        <h3 style="margin:0;">📋 Resumen de tu Caso</h3>
        <button class="btn btn-sm btn-outline" onclick="showClinicalInfoCreateForm()">Editar</button>
      </div>
      <div style="display:grid;gap:12px;font-size:0.95rem;color:var(--text-primary)">
        <div><strong>Motivo de Consulta:</strong> ${escapeHTML(d.consultation_reason || 'No especificado')}</div>
        <div><strong>Descripción del Problema:</strong> ${escapeHTML(d.descripcion_problema || 'No especificada')}</div>
        <div><strong>Intensidad del Dolor:</strong> ${escapeHTML(d.intensidad_dolor || 'No especificada')}</div>
        <div><strong>Antecedentes Médicos:</strong> ${escapeHTML(d.medical_history || 'Ninguno')}</div>
      </div>
    </div>`;
}

function showClinicalInfoCreateForm() {
  const d = window.currentClinicalData || {};
  const container = document.getElementById('clinical-info-container');
  if (!container) return;

  container.innerHTML = `
    <form onsubmit="handleUpdateClinicalInfo(event)" style="background:var(--bg-card,#fff);padding:1.5rem;border-radius:16px;border:1px solid var(--border)">
      <h3 style="margin-bottom:1.25rem">Editar Información Clínica</h3>
      
      <div class="form-group"><label class="form-label">Motivo de consulta *</label>
        <select class="form-select" id="clin-motivo" required>
          <option value="Dolor dental" ${d.consultation_reason === 'Dolor dental' ? 'selected' : ''}>Dolor dental</option>
          <option value="Muela dañada o rota" ${d.consultation_reason === 'Muela dañada o rota' ? 'selected' : ''}>Muela dañada o rota</option>
          <option value="Caries" ${d.consultation_reason === 'Caries' ? 'selected' : ''}>Caries</option>
          <option value="Inflamación o infección" ${d.consultation_reason === 'Inflamación o infección' ? 'selected' : ''}>Inflamación o infección</option>
          <option value="Sangrado de encías" ${d.consultation_reason === 'Sangrado de encías' ? 'selected' : ''}>Sangrado de encías</option>
          <option value="Limpieza dental" ${d.consultation_reason === 'Limpieza dental' ? 'selected' : ''}>Limpieza dental</option>
          <option value="Extracción dental" ${d.consultation_reason === 'Extracción dental' ? 'selected' : ''}>Extracción dental</option>
          <option value="Prótesis o dentadura" ${d.consultation_reason === 'Prótesis o dentadura' ? 'selected' : ''}>Prótesis o dentadura</option>
          <option value="Ortodoncia" ${d.consultation_reason === 'Ortodoncia' ? 'selected' : ''}>Ortodoncia</option>
          <option value="Revisión general" ${d.consultation_reason === 'Revisión general' ? 'selected' : ''}>Revisión general</option>
          <option value="Otro" ${!['Dolor dental', 'Muela dañada o rota', 'Caries', 'Inflamación o infección', 'Sangrado de encías', 'Limpieza dental', 'Extracción dental', 'Prótesis o dentadura', 'Ortodoncia', 'Revisión general'].includes(d.consultation_reason) ? 'selected' : ''}>Otro (${escapeHTML(d.consultation_reason || '')})</option>
        </select>
      </div>
      
      <div class="form-group"><label class="form-label">Descripción del Problema *</label>
        <textarea class="form-textarea" id="clin-descripcion" rows="3" required>${escapeHTML(d.descripcion_problema || '')}</textarea>
      </div>

      <div class="form-group"><label class="form-label">Intensidad del Dolor *</label>
        <select class="form-select" id="clin-dolor" required>
          <option value="Sin dolor" ${d.intensidad_dolor === 'Sin dolor' ? 'selected' : ''}>🟢 Sin dolor</option>
          <option value="Dolor leve" ${d.intensidad_dolor === 'Dolor leve' ? 'selected' : ''}>🟡 Dolor leve</option>
          <option value="Dolor moderado" ${d.intensidad_dolor === 'Dolor moderado' ? 'selected' : ''}>🟠 Dolor moderado</option>
          <option value="Dolor fuerte" ${d.intensidad_dolor === 'Dolor fuerte' ? 'selected' : ''}>🔴 Dolor fuerte</option>
        </select>
      </div>

      <div class="form-group"><label class="form-label">Antecedentes Médicos (Texto libre)</label>
        <textarea class="form-textarea" id="clin-antecedentes" rows="3">${escapeHTML(d.medical_history || '')}</textarea>
      </div>

      <div style="display:flex;gap:1rem;margin-top:1.5rem">
        <button type="button" class="btn btn-outline" onclick="loadClinicalInfoForm()">Cancelar</button>
        <button type="submit" class="btn btn-primary" style="flex:1">💾 Guardar Cambios</button>
      </div>
    </form>`;
}

async function handleUpdateClinicalInfo(event) {
  event.preventDefault();
  showLoading(true);
  try {
    await updatePatientData(currentUser.user.id, {
      consultationReason: document.getElementById('clin-motivo').value,
      descripcionProblema: document.getElementById('clin-descripcion').value,
      intensidadDolor: document.getElementById('clin-dolor').value,
      medicalHistory: document.getElementById('clin-antecedentes').value
    });
    showLoading(false);
    showToast('Información clínica actualizada exitosamente', 'success');
    
    // Recargar perfil para actualizar roleData
    currentUser = await requireAuth();
    loadClinicalInfoForm();
  } catch (error) {
    showLoading(false);
    showToast('Error al actualizar información', 'error');
  }
}

/* =============================================
   ALTA MÉDICA – MODAL REINGRESO / CALIFICACIÓN
   ============================================= */

/**
 * Abrir el modal de seguimiento post-alta
 */
function openReingresoModal(requestId) {
  const key = `reingreso_respondido_${currentUser?.user?.id}`;
  if (sessionStorage.getItem(key)) return; // Ya respondido en esta sesión
  window._altaRequestId = requestId;
  document.getElementById('modal-alta-seguimiento').classList.add('active');
}

/**
 * Manejar decisión post-alta (reingreso o cierre)
 * @param {boolean} wantsNewCase
 */
async function handleAltaDecision(wantsNewCase) {
  closeModal('modal-alta-seguimiento');
  const key = `reingreso_respondido_${currentUser?.user?.id}`;
  sessionStorage.setItem(key, 'true');

  if (wantsNewCase) {
    try {
      await supabase
        .from('patients')
        .update({ accepts_requests: true })
        .eq('id', currentUser.user.id);
      showToast('Tu perfil ha sido reactivado. ¡Pronto recibirás nuevas solicitudes!', 'success');
      loadCasoActivo();
      loadStats();
    } catch(e) {
      showToast('Error al reactivar perfil', 'error');
    }
  } else {
    showToast('¡Que te mejores! Gracias por usar OdontoUNERG.', 'success');
  }

  // Mostrar modal de calificación si aplica
  if (window._altaRequestId) {
    setTimeout(async () => {
      try {
        const res = await fetch(`/api/requests/patient/${currentUser.user.id}`);
        const json = await res.json();
        const completed = (json.data || []).find(r => r.id === window._altaRequestId);
        if (completed?.student_id) {
          openCalificarModal(completed.student_id);
        }
      } catch(_) {}
    }, 1200);
  }
}

