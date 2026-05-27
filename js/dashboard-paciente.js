/* =============================================
   DASHBOARD-PACIENTE.JS
   Lógica del panel del paciente
   ============================================= */

let currentUser = null;
let currentConversationId = null;

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
    await Promise.all([loadStats(), loadPendingRequestsPreview(), loadUpcomingAppointments(), updateNotificationBadge()]);
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showToast('Error de conexión con la base de datos', 'error');
  } finally {
    showLoading(false);
  }
}

async function loadStats() {
  const userId = currentUser.user.id;
  const { count: pendingReqs } = await supabase.from('requests').select('*', { count: 'exact', head: true }).eq('patient_id', userId).eq('status', 'pending');
  const { count: acceptedReqs } = await supabase.from('requests').select('*', { count: 'exact', head: true }).eq('patient_id', userId).in('status', ['accepted', 'active']);

  const { data: myReqs } = await supabase.from('requests').select('id').eq('patient_id', userId);
  let citasCount = 0;
  if (myReqs && myReqs.length > 0) {
    const { count } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).in('request_id', myReqs.map(r => r.id)).in('status', ['proposed', 'confirmed']);
    citasCount = count || 0;
  }

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card"><div class="stat-icon orange"><i data-lucide="mail"></i></div><div class="stat-info"><div class="stat-label">Solicitudes Pendientes</div><div class="stat-value">${pendingReqs || 0}</div></div></div>
    <div class="stat-card"><div class="stat-icon green"><i data-lucide="graduation-cap"></i></div><div class="stat-info"><div class="stat-label">Estudiantes Asignados</div><div class="stat-value">${acceptedReqs || 0}</div></div></div>
    <div class="stat-card"><div class="stat-icon blue"><i data-lucide="calendar"></i></div><div class="stat-info"><div class="stat-label">Citas Activas</div><div class="stat-value">${citasCount}</div></div></div>
  `;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function loadPendingRequestsPreview() {
  const requests = await getPatientRequests(currentUser.user.id, 'pending');
  const container = document.getElementById('pending-requests-preview');
  if (requests.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="mail"></i></div><p class="empty-state-text">Sin solicitudes pendientes</p></div>';
    return;
  }

  container.innerHTML = requests.slice(0, 3).map(req => {
    const name = req.student?.full_name || 'Estudiante';
    return `
      <div style="display:flex;align-items:center;gap:0.75rem;padding:0.65rem 0;border-bottom:1px solid var(--border);">
        <span class="avatar avatar-sm avatar-placeholder">${getInitials(name)}</span>
        <div style="flex:1"><p style="font-weight:600;font-size:0.875rem">${escapeHTML(name)}</p><p style="font-size:0.75rem;color:var(--text-muted)">${timeAgo(req.created_at)}</p></div>
        <div style="display:flex;gap:0.35rem">
          <button class="btn btn-success btn-sm" onclick="handleAcceptRequest('${req.id}')">Aceptar</button>
          <button class="btn btn-danger btn-sm" onclick="handleRejectRequest('${req.id}')">Rechazar</button>
        </div>
      </div>
    `;
  }).join('');
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

async function updateNotificationBadge() {
  const count = await countUnreadNotifications(currentUser.user.id);
  const badge = document.getElementById('notif-badge');
  const dot = document.getElementById('notif-dot');
  if (count > 0) { badge.textContent = count; badge.classList.remove('hidden'); dot.classList.remove('hidden'); }
  else { badge.classList.add('hidden'); dot.classList.add('hidden'); }
}

function showSection(sectionName) {
  document.querySelectorAll('.page-content > section').forEach(s => s.classList.add('hidden'));
  document.getElementById(`section-${sectionName}`).classList.remove('hidden');

  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const links = document.querySelectorAll('.sidebar-link');
  links.forEach(l => { if (l.textContent.trim().toLowerCase().includes(sectionName === 'inicio' ? 'inicio' : sectionName)) l.classList.add('active'); });

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

  switch (sectionName) {
    case 'estudiantes': loadStudentsList(); break;
    case 'solicitudes': loadPatientRequestsList(); break;
    case 'citas': loadAppointmentsList(); break;
    case 'chat': loadChatConversations(); break;
    case 'historial': loadTreatmentsHistory(); break;
    case 'perfil': loadProfileData(); break;
    case 'notificaciones': loadNotificationsList(); break;
  }
}

async function loadStudentsList() {
  const students = await getAvailableStudents();
  const container = document.getElementById('students-grid');
  if (students.length === 0) {
    container.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon"><i data-lucide="graduation-cap"></i></div><p class="empty-state-title">No hay estudiantes disponibles</p></div>';
    return;
  }
  container.innerHTML = students.map(s => {
    const student = s.students;
    return `
      <div class="patient-card">
        <div class="patient-card-header">
          ${s.avatar_url ? `<img src="${s.avatar_url}" class="patient-card-avatar">` : `<span class="avatar avatar-placeholder" style="width:48px;height:48px">${getInitials(s.full_name)}</span>`}
          <div>
            <div class="patient-card-name">${escapeHTML(s.full_name)}</div>
            <div class="patient-card-meta">${student?.section ? 'Sección ' + student.section : ''} ${student?.academic_year ? '· ' + student.academic_year : ''}</div>
          </div>
        </div>
        <div class="patient-card-body">
          <p style="font-size:0.85rem;color:var(--text-secondary)"><i data-lucide="building-2" style="width:14px;height:14px;display:inline;"></i> ${escapeHTML(student?.university || 'UNERG')}</p>
        </div>
        <div class="patient-card-footer">
          <button class="btn btn-primary btn-sm" onclick="handleSendRequestToStudent('${s.id}')">Enviar Solicitud</button>
        </div>
      </div>
    `;
  }).join('');
}

function filterStudentsList() {
  const term = document.getElementById('search-students').value.toLowerCase();
  // Simple client-side filter
  document.querySelectorAll('#students-grid .patient-card').forEach(card => {
    const name = card.querySelector('.patient-card-name')?.textContent.toLowerCase() || '';
    card.style.display = name.includes(term) ? '' : 'none';
  });
}

async function handleSendRequestToStudent(studentId) {
  const ok = await confirmAction('Enviar Solicitud', '¿Desea enviar una solicitud a este estudiante?');
  if (!ok) return;
  // En este caso el paciente envía al estudiante, invertimos los roles
  const success = await sendRequest(studentId, currentUser.user.id);
  if (success) loadStudentsList();
}

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
    if (req.status === 'pending') {
      actions = `
        <button class="btn btn-success btn-sm" onclick="handleAcceptRequest('${req.id}')">Aceptar</button>
        <button class="btn btn-danger btn-sm" onclick="handleRejectRequest('${req.id}')">Rechazar</button>
      `;
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
            <p style="font-size:0.85rem;color:var(--text-secondary)">${req.message ? escapeHTML(req.message) : 'Sin mensaje'}</p>
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
  event.target.classList.add('active');
  loadPatientRequestsList(status === 'todas' ? null : status);
}

async function handleAcceptRequest(id) {
  const success = await acceptRequest(id);
  if (success) { loadPendingRequestsPreview(); loadPatientRequestsList(); loadStats(); }
}

async function handleRejectRequest(id) {
  const ok = await confirmAction('Rechazar Solicitud', '¿Está seguro de rechazar esta solicitud?');
  if (ok) {
    const success = await rejectRequest(id);
    if (success) { loadPendingRequestsPreview(); loadPatientRequestsList(); loadStats(); }
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

async function handleConfirmAppointment(id) { await confirmAppointment(id); loadAppointmentsList(); }
async function handleCancelAppointment(id) {
  const ok = await confirmAction('Cancelar Cita', '¿Está seguro?');
  if (ok) { await cancelAppointment(id); loadAppointmentsList(); }
}
async function handleCompleteAppointment(id) { await completeAppointment(id); loadAppointmentsList(); }

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
  const { data: treatments } = await supabase.from('treatments').select('*, student:student_id(full_name)').eq('patient_id', currentUser.user.id).order('created_at', { ascending: false });
  const container = document.getElementById('treatments-list');
  if (!treatments || treatments.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="clipboard-list"></i></div><p class="empty-state-title">Sin tratamientos</p></div>';
    return;
  }
  container.innerHTML = `<div class="table-wrapper"><table class="data-table"><thead><tr><th>Estudiante</th><th>Tratamiento</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>${treatments.map(t => {
    const est = { pendiente: { t: 'Pendiente', c: 'badge-warning' }, en_proceso: { t: 'En proceso', c: 'badge-primary' }, finalizado: { t: 'Finalizado', c: 'badge-success' } }[t.estado] || { t: t.estado, c: 'badge-gray' };
    return `<tr><td>${escapeHTML(t.student?.full_name || '')}</td><td>${escapeHTML(t.tratamiento)}</td><td>${formatDate(t.fecha)}</td><td><span class="badge ${est.c}">${est.t}</span></td></tr>`;
  }).join('')}</tbody></table></div>`;
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
}

async function handleUpdateProfile(event) {
  event.preventDefault();
  const userId = currentUser.user.id;
  await updateProfile(userId, { fullName: document.getElementById('prof-name').value, phone: document.getElementById('prof-phone').value, disponibilidad: document.getElementById('prof-disponibilidad').value });
  await updatePatientData(userId, { age: document.getElementById('prof-age').value, phone: document.getElementById('prof-phone').value, direccion: document.getElementById('prof-direccion').value, medicalHistory: document.getElementById('prof-antecedentes').value, consultationReason: document.getElementById('prof-problema').value });
  setupSidebar();
}

async function handlePhotoUpload(input) {
  if (input.files?.[0]) { showLoading(true); await uploadProfilePhoto(currentUser.user.id, input.files[0]); showLoading(false); loadProfileData(); }
}

async function loadNotificationsList() {
  const notifications = await loadNotifications(currentUser.user.id);
  document.getElementById('notifications-list').innerHTML = renderNotificationsPanel(notifications);
}

async function handleMarkAllRead() { await markAllNotificationsRead(currentUser.user.id); loadNotificationsList(); updateNotificationBadge(); }

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
