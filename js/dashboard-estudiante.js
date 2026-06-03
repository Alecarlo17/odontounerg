/* =============================================
   DASHBOARD-ESTUDIANTE.JS
   Lógica del panel del estudiante
   ============================================= */

// Variables globales
let currentUser = null;
let allPatients = [];

/**
 * Inicializar dashboard del estudiante
 */
document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await requireAuth();
  if (!currentUser) return;

  // Verificar que sea estudiante
  if (currentUser.profile?.role !== 'student') {
    redirectByRole(currentUser.profile.role);
    return;
  }

  // Configurar sidebar
  setupSidebar();

  // Cargar datos iniciales
  await loadDashboardData();

  // Suscribirse a notificaciones en tiempo real
  subscribeToNotifications(currentUser.user.id, (notif) => {
    showToast(notif.titulo, 'info');
    updateNotificationBadge();
  });
});

/**
 * Configurar sidebar con datos del usuario
 */
function setupSidebar() {
  const name = currentUser.profile?.full_name || 'Estudiante';
  document.getElementById('sidebar-name').textContent = name;
  document.getElementById('sidebar-avatar').textContent = getInitials(name);
}

/**
 * Cargar todos los datos del dashboard
 */
async function loadDashboardData() {
  showLoading(true);
  try {
    await Promise.all([
      loadStats(),
      loadUpcomingAppointments(),
      loadRecentRequests(),
      updateNotificationBadge()
    ]);
  } catch (err) {
    console.error('Error loading dashboard:', err);
  } finally {
    showLoading(false);
  }
}

/**
 * Cargar estadísticas
 */
async function loadStats() {
  const userId = currentUser.user.id;

  // Obtener perfil público que tiene el conteo de activos y promedio
  let avgRating = 0;
  let activePatients = 0;
  try {
    const res = await fetch(`/api/profile/${userId}/public-student`);
    const json = await res.json();
    if (json.success) {
      avgRating = json.data.avgRating || 0;
      activePatients = json.data.activePatients || 0;
    }
  } catch (e) {
    console.error('Error fetching profile stats', e);
  }

  // Contar solicitudes pendientes
  const { count: pendingCount } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', userId)
    .eq('status', 'pending');

  // Contar citas pendientes
  const { data: myRequests } = await supabase
    .from('requests')
    .select('id')
    .eq('student_id', userId);
  
  let appointmentsCount = 0;
  if (myRequests && myRequests.length > 0) {
    const reqIds = myRequests.map(r => r.id);
    const { count } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .in('request_id', reqIds)
      .in('status', ['proposed', 'confirmed']);
    appointmentsCount = count || 0;
  }

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon blue"><i data-lucide="users"></i></div>
      <div class="stat-info">
        <div class="stat-label">Pacientes Activos</div>
        <div class="stat-value" style="${activePatients >= 3 ? 'color:var(--danger)' : ''}">${activePatients}/3</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon orange"><i data-lucide="star"></i></div>
      <div class="stat-info">
        <div class="stat-label">Promedio de Calificación</div>
        <div class="stat-value">${avgRating.toFixed(1)}/5</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green"><i data-lucide="calendar"></i></div>
      <div class="stat-info">
        <div class="stat-label">Citas Activas</div>
        <div class="stat-value">${appointmentsCount}</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon cyan"><i data-lucide="mail"></i></div>
      <div class="stat-info">
        <div class="stat-label">Solicitudes Pendientes</div>
        <div class="stat-value">${pendingCount || 0}</div>
      </div>
    </div>
  `;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Cargar próximas citas
 */
async function loadUpcomingAppointments() {
  const appointments = await getAppointments(currentUser.user.id);
  const upcoming = appointments.filter(a => 
    ['proposed', 'confirmed'].includes(a.status) && new Date(a.date) >= new Date()
  ).slice(0, 3);

  const container = document.getElementById('upcoming-appointments');
  if (upcoming.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="calendar"></i></div><p class="empty-state-text">Sin citas próximas</p></div>';
    return;
  }

  container.innerHTML = upcoming.map(a => renderAppointmentCard(a, currentUser.user.id)).join('');
}

/**
 * Cargar solicitudes recientes
 */
async function loadRecentRequests() {
  const requests = await getStudentRequests(currentUser.user.id);
  const recent = requests.slice(0, 3);

  const container = document.getElementById('recent-requests');
  if (recent.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="mail"></i></div><p class="empty-state-text">Sin solicitudes</p></div>';
    return;
  }

  container.innerHTML = recent.map(req => {
    const statusInfo = getStatusInfo(req.status);
    const patientName = req.patient?.full_name || 'Paciente';
    return `
      <div style="display:flex;align-items:center;gap:0.75rem;padding:0.65rem 0;border-bottom:1px solid var(--border);">
        <span class="avatar avatar-sm avatar-placeholder">${getInitials(patientName)}</span>
        <div style="flex:1;min-width:0;">
          <p style="font-weight:600;font-size:0.875rem;">${escapeHTML(patientName)}</p>
          <p style="font-size:0.75rem;color:var(--text-muted);">${timeAgo(req.created_at)}</p>
        </div>
        <span class="badge ${statusInfo.class}">${statusInfo.text}</span>
      </div>
    `;
  }).join('');
}

/**
 * Actualizar badge de notificaciones
 */
async function updateNotificationBadge() {
  const count = await countUnreadNotifications(currentUser.user.id);
  const badge = document.getElementById('notif-badge');
  const dot = document.getElementById('notif-dot');
  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove('hidden');
    dot.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
    dot.classList.add('hidden');
  }
}

/**
 * Mostrar sección del dashboard
 * @param {string} sectionName
 */
function showSection(sectionName) {
  // Ocultar todas las secciones
  document.querySelectorAll('.page-content > section').forEach(s => s.classList.add('hidden'));
  document.getElementById(`section-${sectionName}`).classList.remove('hidden');

  // Actualizar sidebar activo
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const links = document.querySelectorAll('.sidebar-link');
  links.forEach(l => {
    if (l.textContent.trim().toLowerCase().includes(sectionName === 'inicio' ? 'inicio' : sectionName)) {
      l.classList.add('active');
    }
  });

  // Actualizar título
  const titles = {
    inicio: ['Inicio', 'Panel de control'],
    pacientes: ['Pacientes', 'Buscar pacientes disponibles'],
    solicitudes: ['Solicitudes', 'Gestionar solicitudes'],
    citas: ['Citas', 'Gestionar citas odontológicas'],
    chat: ['Chat', 'Mensajes en tiempo real'],
    calificaciones: ['Calificaciones', 'Reputación y comentarios'],
    historial: ['Historial', 'Tratamientos realizados'],
    perfil: ['Mi Perfil', 'Editar información personal'],
    notificaciones: ['Notificaciones', 'Centro de notificaciones']
  };
  const [title, subtitle] = titles[sectionName] || ['', ''];
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-subtitle').textContent = subtitle;

  // Cargar datos de la sección
  switch (sectionName) {
    case 'pacientes': loadPatients(); break;
    case 'solicitudes': loadStudentRequestsList(); break;
    case 'citas': loadAppointmentsList(); break;
    case 'chat': loadChatConversations(); break;
    case 'calificaciones': loadRatings(); break;
    case 'historial': loadTreatmentsHistory(); break;
    case 'perfil': loadProfileData(); break;
    case 'notificaciones': loadNotificationsList(); break;
  }
}

/**
 * Cargar pacientes disponibles
 */
async function loadPatients() {
  const filter = document.getElementById('filter-treatment')?.value || 'all';
  allPatients = await getAvailablePatients(filter === 'all' ? null : filter);

  renderPatients(allPatients);
}

/**
 * Filtrar pacientes
 */
function filterPatients() {
  const searchTerm = document.getElementById('search-patients').value.toLowerCase();
  const treatment = document.getElementById('filter-treatment').value;

  let filtered = allPatients;
  if (searchTerm) {
    filtered = filtered.filter(p => 
      p.full_name?.toLowerCase().includes(searchTerm) ||
      p.patients?.consultation_reason?.toLowerCase().includes(searchTerm)
    );
  }
  if (treatment && treatment !== 'all') {
    filtered = filtered.filter(p => p.patients?.consultation_reason === treatment);
  }

  renderPatients(filtered);
}

/**
 * Renderizar tarjetas de pacientes
 */
function renderPatients(patients) {
  const container = document.getElementById('patients-grid');
  if (patients.length === 0) {
    container.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon"><i data-lucide="users"></i></div><p class="empty-state-title">No se encontraron pacientes</p><p class="empty-state-text">Intente cambiar los filtros de búsqueda</p></div>';
    return;
  }

  container.innerHTML = patients.map(p => {
    const patient = p.patients;
    const disponibilidad = p.disponibilidad || 'disponible';
    const dispBadge = disponibilidad === 'disponible' ? 'badge-success' : disponibilidad === 'ocupado' ? 'badge-warning' : 'badge-error';
    const dispText = disponibilidad === 'disponible' ? 'Disponible' : disponibilidad === 'ocupado' ? 'Ocupado' : 'No disponible';

    return `
      <div class="patient-card">
        <div class="patient-card-header">
          ${p.avatar_url 
            ? `<img src="${p.avatar_url}" class="patient-card-avatar" alt="${p.full_name}">`
            : `<span class="avatar avatar-placeholder" style="width:48px;height:48px;font-size:1rem;">${getInitials(p.full_name)}</span>`}
          <div>
            <div class="patient-card-name">${escapeHTML(p.full_name)}</div>
            <div class="patient-card-meta">${patient?.age ? patient.age + ' años' : ''} ${patient?.gender ? '· ' + patient.gender : ''}</div>
          </div>
          <span class="badge ${dispBadge}" style="margin-left:auto">${dispText}</span>
        </div>
        <div class="patient-card-body">
          ${patient?.consultation_reason ? `<div class="patient-card-problem"><i data-lucide="heart-pulse" style="width:14px;height:14px;"></i> ${escapeHTML(patient.consultation_reason)}</div>` : ''}
          ${patient?.medical_history ? `<p class="patient-card-info" style="margin-top:0.5rem">${escapeHTML(patient.medical_history.substring(0, 100))}${patient.medical_history.length > 100 ? '...' : ''}</p>` : ''}
          ${p.phone ? `<p style="font-size:0.8rem;color:var(--text-muted);margin-top:0.35rem">📞 ${escapeHTML(p.phone)}</p>` : ''}
        </div>
        <div class="patient-card-footer">
          <button class="btn btn-primary btn-sm" onclick="openSolicitudModal('${p.id}', '${escapeHTML(p.full_name)}', '${escapeHTML(patient?.consultation_reason || '')}')">Enviar Solicitud</button>
          <button class="btn btn-outline btn-sm" onclick="viewPatientProfile('${p.id}')">Ver Perfil</button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Abrir modal de solicitud
 */
function openSolicitudModal(patientId, name, problem) {
  document.getElementById('solicitud-patient-id').value = patientId;
  document.getElementById('modal-solicitud-paciente').innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.25rem;padding:0.75rem;background:var(--gray-50);border-radius:var(--radius);">
      <span class="avatar avatar-placeholder">${getInitials(name)}</span>
      <div>
        <p style="font-weight:600;">${name}</p>
        ${problem ? `<span class="badge badge-primary">${problem}</span>` : ''}
      </div>
    </div>
  `;
  document.getElementById('solicitud-message').value = '';
  document.getElementById('modal-solicitud').classList.add('active');
}

/**
 * Enviar solicitud
 */
async function handleSendRequest(event) {
  event.preventDefault();
  const patientId = document.getElementById('solicitud-patient-id').value;
  const message = document.getElementById('solicitud-message').value;
  const success = await sendRequest(currentUser.user.id, patientId, message);
  if (success) {
    closeModal('modal-solicitud');
    loadPatients();
  }
}

/**
 * Cargar lista de solicitudes
 */
async function loadStudentRequestsList(status = null) {
  const requests = await getStudentRequests(currentUser.user.id, status);
  const container = document.getElementById('requests-list');

  if (requests.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="mail"></i></div><p class="empty-state-title">Sin solicitudes</p><p class="empty-state-text">No tiene solicitudes en esta categoría</p></div>';
    return;
  }

  container.innerHTML = requests.map(req => {
    const statusInfo = getStatusInfo(req.status);
    const name = req.patient?.full_name || 'Paciente';
    let messageStr = req.message || 'Sin mensaje';
    if (messageStr.startsWith('[FromStudent]')) {
      messageStr = messageStr.replace('[FromStudent]', '').trim();
    }
    let actionsStr = '';
    if (req.status === 'accepted' || req.status === 'active') {
      actionsStr = `<button class="btn btn-sm btn-success" onclick="handleDischarge('${req.id}')" style="margin-top:0.5rem;">Dar de Alta</button>`;
    }

    return `
      <div class="card" style="margin-bottom:0.75rem;animation:fadeIn 0.4s ease;">
        <div class="card-body" style="display:flex;align-items:center;gap:1rem;">
          <span class="avatar avatar-placeholder">${getInitials(name)}</span>
          <div style="flex:1">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong>${escapeHTML(name)}</strong>
              <span class="badge ${statusInfo.class}">${statusInfo.text}</span>
            </div>
            <p style="font-size:0.85rem;color:var(--text-secondary);">${escapeHTML(messageStr)}</p>
            <p style="font-size:0.75rem;color:var(--text-muted);">${timeAgo(req.created_at)}</p>
            ${actionsStr}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Dar de alta al paciente
 */
async function handleDischarge(requestId) {
  const ok = await confirmAction('Dar de Alta', '¿Está seguro de que desea dar de alta al paciente? El tratamiento debe estar finalizado.');
  if (ok) {
    try {
      const res = await fetch(`/api/requests/${requestId}/discharge`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (json.success) {
        showToast('Paciente dado de alta', 'success');
        loadStudentRequestsList();
        loadStats();
      } else {
        showToast(json.message || 'Error al dar de alta', 'error');
      }
    } catch (e) {
      showToast('Error de conexión', 'error');
    }
  }
}

/**
 * Mostrar tab de solicitudes
 */
function showRequestTab(status) {
  document.querySelectorAll('#section-solicitudes .tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  loadStudentRequestsList(status === 'todas' ? null : status);
}

/**
 * Cargar lista de citas
 */
async function loadAppointmentsList(status = null) {
  const appointments = await getAppointments(currentUser.user.id, status);
  const container = document.getElementById('appointments-list');

  if (appointments.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i data-lucide="calendar"></i></div>
        <p class="empty-state-title">Sin citas</p>
        <p class="empty-state-text">No tiene citas en esta categoría</p>
        <button class="btn btn-primary" style="margin-top:1rem" onclick="openNewAppointmentModal()">Nueva Cita</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="text-align:right;margin-bottom:1rem;">
      <button class="btn btn-primary btn-sm" onclick="openNewAppointmentModal()">+ Nueva Cita</button>
    </div>
  ` + appointments.map(a => renderAppointmentCard(a, currentUser.user.id)).join('');
}

function showAppointmentTab(status) {
  document.querySelectorAll('#section-citas .tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  loadAppointmentsList(status === 'todas' ? null : status);
}

/**
 * Abrir modal de nueva cita
 */
async function openNewAppointmentModal() {
  // Cargar requests aceptadas para el select
  const requests = await getStudentRequests(currentUser.user.id, 'accepted');
  const select = document.getElementById('cita-request');
  select.innerHTML = '<option value="">Seleccione un paciente</option>' +
    requests.map(r => `<option value="${r.id}">${r.patient?.full_name || 'Paciente'}</option>`).join('');

  // Set fecha mínima a hoy
  document.getElementById('cita-fecha').min = new Date().toISOString().split('T')[0];
  document.getElementById('modal-nueva-cita').classList.add('active');
}

async function handleCreateAppointment(event) {
  event.preventDefault();
  const fecha = document.getElementById('cita-fecha').value;
  const hora = document.getElementById('cita-hora').value;
  const dateTime = new Date(`${fecha}T${hora}`).toISOString();

  const success = await createAppointment({
    requestId: document.getElementById('cita-request').value,
    proposedBy: currentUser.user.id,
    date: dateTime,
    duration: parseInt(document.getElementById('cita-duracion').value) || 60,
    location: document.getElementById('cita-lugar').value,
    notes: document.getElementById('cita-notas').value
  });

  if (success) {
    closeModal('modal-nueva-cita');
    loadAppointmentsList();
  }
}

async function handleConfirmAppointment(id) {
  await confirmAppointment(id);
  loadAppointmentsList();
  loadUpcomingAppointments();
}

async function handleCancelAppointment(id) {
  const ok = await confirmAction('Cancelar Cita', '¿Está seguro de cancelar esta cita?');
  if (ok) {
    await cancelAppointment(id);
    loadAppointmentsList();
    loadUpcomingAppointments();
  }
}

async function handleCompleteAppointment(id) {
  await completeAppointment(id);
  loadAppointmentsList();
  loadUpcomingAppointments();
}

/**
 * Cargar conversaciones del chat
 */
async function loadChatConversations() {
  const conversations = await getConversations(currentUser.user.id);
  const container = document.getElementById('chat-conversations-list');

  if (conversations.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:2rem"><div class="empty-state-icon"><i data-lucide="message-circle"></i></div><p class="empty-state-text">Sin conversaciones. Envíe una solicitud primero.</p></div>';
    return;
  }

  container.innerHTML = conversations.map(c => `
    <div class="chat-item ${currentConversationId === c.conversationId ? 'active' : ''}" onclick="openChat('${c.conversationId}', '${c.otherUser?.id}', '${escapeHTML(c.otherUser?.full_name || 'Usuario')}')">
      ${c.otherUser?.avatar_url 
        ? `<img src="${c.otherUser.avatar_url}" class="chat-item-avatar" alt="">`
        : `<div class="chat-item-avatar-placeholder">${getInitials(c.otherUser?.full_name)}</div>`}
      <div class="chat-item-info">
        <div class="chat-item-name">${escapeHTML(c.otherUser?.full_name || 'Usuario')}</div>
        <div class="chat-item-last">${c.lastMessage ? escapeHTML(c.lastMessage.content) : 'Sin mensajes'}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.25rem;">
        <span class="chat-item-time">${c.lastMessage ? timeAgo(c.lastMessage.created_at) : ''}</span>
        ${c.unreadCount > 0 ? `<span class="chat-item-unread">${c.unreadCount}</span>` : ''}
      </div>
    </div>
  `).join('');
}

/**
 * Abrir un chat
 */
async function openChat(conversationId, otherUserId, otherName) {
  currentConversationId = conversationId;

  // Marcar como leídos
  await markMessagesAsRead(conversationId, currentUser.user.id);

  // Cargar mensajes
  const messages = await getMessages(conversationId);

  // Renderizar chat
  document.getElementById('chat-main-panel').innerHTML = `
    <div class="chat-main-header">
      <span class="avatar avatar-placeholder avatar-sm">${getInitials(otherName)}</span>
      <div>
        <div class="chat-main-name">${escapeHTML(otherName)}</div>
      </div>
      <div style="margin-left:auto;display:flex;gap:0.25rem;">
        <button class="chat-header-btn" onclick="openReportModal('${otherUserId}', '${conversationId}')" title="Reportar usuario"><i data-lucide="flag" style="width:18px;height:18px;"></i></button>
      </div>
    </div>
    <div class="chat-messages" id="chat-messages">
      ${messages.map(m => renderMessage(m, currentUser.user.id)).join('')}
    </div>
    <div class="chat-input-area">
      <input type="file" id="chat-image-input" accept="image/*" style="display:none" onchange="handleChatImageUpload(this)">
      <button class="chat-attach-btn" onclick="document.getElementById('chat-image-input').click()" title="Enviar imagen"><i data-lucide="image-plus" style="width:20px;height:20px;"></i></button>
      <input type="text" class="chat-input" id="chat-input" placeholder="Escriba un mensaje..." onkeypress="if(event.key==='Enter')handleSendMessage()">
      <button class="chat-send-btn" onclick="handleSendMessage()"><i data-lucide="send" style="width:18px;height:18px;"></i></button>
    </div>
  `;
  if (typeof lucide !== 'undefined') lucide.createIcons();

  scrollToBottom();

  // Suscribirse a nuevos mensajes
  subscribeToMessages(conversationId, (newMsg) => {
    const container = document.getElementById('chat-messages');
    if (container) {
      container.innerHTML += renderMessage(newMsg, currentUser.user.id);
      scrollToBottom();
      if (newMsg.sender_id !== currentUser.user.id) {
        markMessagesAsRead(conversationId, currentUser.user.id);
      }
    }
  });

  // Actualizar lista activa
  document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
  if (typeof event !== 'undefined' && event?.target) {
    event.target.closest('.chat-item')?.classList.add('active');
  }
}

/**
 * Enviar mensaje
 */
async function handleSendMessage() {
  const input = document.getElementById('chat-input');
  if (!input || !input.value.trim() || !currentConversationId) return;

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
  input.value = ''; // Reset file input
}

/**
 * Cargar historial de tratamientos
 */
async function loadTreatmentsHistory() {
  const { data: treatments } = await supabase
    .from('treatments')
    .select('*, patient:patient_id(full_name)')
    .eq('student_id', currentUser.user.id)
    .order('created_at', { ascending: false });

  const container = document.getElementById('treatments-list');
  if (!treatments || treatments.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="clipboard-list"></i></div><p class="empty-state-title">Sin tratamientos</p><p class="empty-state-text">Aún no hay tratamientos registrados</p></div>';
    return;
  }

  container.innerHTML = `
    <div style="text-align:right;margin-bottom:1rem;">
      <button class="btn btn-secondary btn-sm" onclick="handleDownloadTreatments()">Descargar Reporte</button>
    </div>
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Paciente</th>
            <th>Tratamiento</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th>Observaciones</th>
          </tr>
        </thead>
        <tbody>
          ${treatments.map(t => {
            const estadoInfo = {
              pendiente: { text: 'Pendiente', class: 'badge-warning' },
              en_proceso: { text: 'En proceso', class: 'badge-primary' },
              finalizado: { text: 'Finalizado', class: 'badge-success' }
            }[t.estado] || { text: t.estado, class: 'badge-gray' };
            return `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                      <span class="avatar avatar-placeholder" style="width:32px;height:32px;font-size:0.8rem">${getInitials(t.patient?.full_name || 'Paciente')}</span>
                      <span>${escapeHTML(t.patient?.full_name || 'Paciente')}</span>
                    </div>
                  </td>
                  <td><strong>${escapeHTML(t.tratamiento)}</strong></td>
                  <td>${new Date(t.fecha).toLocaleDateString('es-VE')}</td>
                  <td><span class="badge ${estadoInfo.class}">${estadoInfo.text}</span></td>
                  <td><span style="color:var(--text-secondary);font-size:0.85rem">${t.observaciones ? escapeHTML(t.observaciones) : '-'}</span></td>
                </tr>
              `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function handleDownloadTreatments() {
  showLoading(true);
  try {
    const res = await fetch(`/api/dashboard/treatments/student/${currentUser.user.id}`);
    const json = await res.json();
    const treatments = json.data || [];
    if (treatments.length === 0) {
      showToast('No hay tratamientos para exportar', 'warning');
      showLoading(false);
      return;
    }
    await generateTreatmentsReport(treatments, currentUser.profile.full_name);
  } catch(e) {
    showToast('Error al exportar tratamientos', 'error');
  }
  showLoading(false);
}

async function handleDownloadAppointments() {
  showLoading(true);
  try {
    const appointments = await getAppointments(currentUser.user.id);
    if (appointments.length === 0) {
      showToast('No hay citas para exportar', 'warning');
      showLoading(false);
      return;
    }
    await generateAppointmentsReport(appointments, currentUser.profile.full_name);
  } catch(e) {
    showToast('Error al exportar citas', 'error');
  }
  showLoading(false);
}

async function loadRatings() {
  try {
    const res = await fetch(`/api/ratings/student/${currentUser.user.id}`);
    const json = await res.json();
    if (!json.success) return;

    const { ratings, stats } = json.data;
    
    // Update badge
    const avgBadge = document.getElementById('ratings-average-badge');
    avgBadge.textContent = `⭐ ${parseFloat(stats.avg || 0).toFixed(1)} (${stats.count || 0})`;

    const container = document.getElementById('ratings-list');
    if (!ratings || ratings.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="star"></i></div><p class="empty-state-title">Sin calificaciones</p></div>';
      return;
    }

    container.innerHTML = ratings.map(r => `
      <div class="card" style="margin-bottom:1rem">
        <div class="card-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem">
            <strong>${escapeHTML(r.patient_name || 'Paciente')}</strong>
            <span class="badge badge-primary">⭐ ${r.rating}</span>
          </div>
          <p style="color:var(--text-secondary); font-size:0.9rem">${r.comment ? escapeHTML(r.comment) : '<em>Sin comentario</em>'}</p>
          <div style="margin-top:0.5rem; color:var(--text-muted); font-size:0.8rem">${new Date(r.created_at).toLocaleDateString('es-VE')}</div>
        </div>
      </div>
    `).join('');
  } catch(e) {
    console.error('Error cargando calificaciones', e);
  }
}

/**
 * Cargar datos del perfil para edición
 */
async function loadProfileData() {
  const userData = await getCurrentUser();
  if (!userData) return;

  const { profile, roleData } = userData;

  document.getElementById('profile-name-display').textContent = profile.full_name;
  document.getElementById('profile-email-display').textContent = profile.email;
  document.getElementById('profile-avatar').textContent = getInitials(profile.full_name);

  if (profile.avatar_url) {
    document.getElementById('profile-avatar-container').innerHTML = `
      <img src="${profile.avatar_url}" class="avatar avatar-xl" alt="Foto de perfil" style="cursor:pointer">
      <div style="position:absolute;bottom:0;right:0;background:var(--primary);color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;"><i data-lucide="camera" style="width:12px;height:12px;"></i></div>
    `;
  }

  document.getElementById('prof-name').value = profile.full_name || '';
  document.getElementById('prof-phone').value = profile.phone || '';
  document.getElementById('prof-disponibilidad').value = profile.disponibilidad || 'disponible';
  document.getElementById('prof-section').value = roleData?.section || '';
  document.getElementById('prof-year').value = roleData?.academic_year || '';
}

async function handleUpdateProfile(event) {
  event.preventDefault();
  const userId = currentUser.user.id;

  await updateProfile(userId, {
    fullName: document.getElementById('prof-name').value,
    phone: document.getElementById('prof-phone').value,
    disponibilidad: document.getElementById('prof-disponibilidad').value
  });

  await updateStudentData(userId, {
    section: document.getElementById('prof-section').value,
    academicYear: document.getElementById('prof-year').value,
    treatments: [],
    bio: ''
  });

  // Actualizar sidebar
  setupSidebar();
}

async function handlePhotoUpload(input) {
  if (input.files && input.files[0]) {
    showLoading(true);
    const url = await uploadProfilePhoto(currentUser.user.id, input.files[0]);
    showLoading(false);
    if (url) loadProfileData();
  }
}

/**
 * Cargar notificaciones
 */
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

async function viewPatientProfile(patientId) {
  try {
    showLoading(true);
    const res = await fetch(`/api/patients/${patientId}`);
    const json = await res.json();
    showLoading(false);
    
    if (json.success && json.data) {
      const p = json.data;
      document.getElementById('perfil-paciente-nombre').textContent = p.full_name;
      document.getElementById('perfil-paciente-avatar').innerHTML = 
        `<div class="avatar avatar-xl">${p.full_name.charAt(0).toUpperCase()}</div>`;
      
      const badgeClass = p.disponibilidad === 'disponible' ? 'badge-success' : 'badge-warning';
      document.getElementById('perfil-paciente-badges').innerHTML = 
        `<span class="badge ${badgeClass}">${p.disponibilidad || 'No especificada'}</span>
         <span class="badge badge-primary">${p.patients?.age ? p.patients.age + ' años' : 'Edad no especificada'}</span>`;
         
      document.getElementById('perfil-paciente-direccion').textContent = p.patients?.address || p.patients?.direccion || 'No especificada';
      document.getElementById('perfil-paciente-disponibilidad').textContent = p.disponibilidad || 'No especificada';
      document.getElementById('perfil-paciente-tratamiento').textContent = p.patients?.consultation_reason || 'No especificado';
      document.getElementById('perfil-paciente-antecedentes').textContent = p.patients?.medical_history || 'Ninguno';
      
      document.getElementById('current-perfil-paciente-id').value = patientId;

      try {
        const resResp = await fetch(`/api/ratings/patient/${patientId}/responsibility`);
        const jsonResp = await resResp.json();
        if (jsonResp.success) {
          const badgeHtml = jsonResp.status === 'No evaluado' 
            ? `<span class="badge" style="background:var(--gray-300);color:var(--text);">${jsonResp.status}</span>`
            : `<span class="badge ${jsonResp.status === 'Responsable' ? 'badge-success' : 'badge-error'}">${jsonResp.status}</span>`;
          document.getElementById('perfil-paciente-badges').innerHTML += ' ' + badgeHtml;
        }
      } catch(e) {}
      
      document.getElementById('modal-perfil-paciente').classList.add('active');
    } else {
      showToast('Error al cargar perfil', 'error');
    }
  } catch(e) {
    showLoading(false);
    showToast('Error de red', 'error');
  }
}

function openCalificarPacienteModal() {
  const patientId = document.getElementById('current-perfil-paciente-id').value;
  if (!patientId) return;
  document.getElementById('calificar-paciente-id').value = patientId;
  closeModal('modal-perfil-paciente');
  document.getElementById('modal-calificar-paciente').classList.add('active');
}

async function handleCalificarPaciente(event) {
  event.preventDefault();
  const patientId = document.getElementById('calificar-paciente-id').value;
  const rating = document.getElementById('calificar-paciente-puntuacion').value;
  const responsibility = document.getElementById('calificar-paciente-responsabilidad').value;
  const comment = document.getElementById('calificar-paciente-comentario').value;

  if (!rating || !responsibility) return;
  showLoading(true);

  try {
    const res = await fetch('/api/ratings/patient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, rating, responsibility, comment })
    });
    const json = await res.json();
    showLoading(false);

    if (json.success) {
      showToast('Calificación enviada');
      closeModal('modal-calificar-paciente');
    } else {
      showToast(json.message || 'Error al calificar', 'error');
    }
  } catch(e) {
    showLoading(false);
    showToast('Error de red', 'error');
  }
}

// Funciones auxiliares
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

async function openRegistrarTratamientoModal() {
  const select = document.getElementById('tratamiento-patient-id');
  select.innerHTML = '<option value="">Cargando pacientes...</option>';
  document.getElementById('modal-registrar-tratamiento').classList.add('active');

  try {
    // Buscar los pacientes del estudiante (solicitudes aceptadas o citas)
    const allReqs = await getStudentRequests(currentUser.user.id, null);
    const validReqs = allReqs.filter(r => r.status === 'accepted' || r.status === 'active');
    
    // Obtener pacientes únicos
    const uniquePatients = [];
    const patientIds = new Set();
    for (const r of validReqs) {
      if (!patientIds.has(r.patient_id)) {
        patientIds.add(r.patient_id);
        uniquePatients.push({ id: r.patient_id, name: r.patient?.full_name || 'Paciente' });
      }
    }

    if (uniquePatients.length === 0) {
      select.innerHTML = '<option value="">No tienes pacientes asignados actualmente</option>';
    } else {
      select.innerHTML = '<option value="">Seleccione un paciente</option>' + 
        uniquePatients.map(p => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('');
    }
  } catch (e) {
    select.innerHTML = '<option value="">Error al cargar pacientes</option>';
  }
}

async function handleCreateTreatment(event) {
  event.preventDefault();
  const patientId = document.getElementById('tratamiento-patient-id').value;
  const tratamiento = document.getElementById('tratamiento-nombre').value;
  const estado = document.getElementById('tratamiento-estado').value;
  const observaciones = document.getElementById('tratamiento-observaciones').value;

  if (!patientId || !tratamiento || !estado) {
    showToast('Por favor, complete todos los campos', 'warning');
    return;
  }

  try {
    const res = await fetch('/api/dashboard/treatments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: currentUser.user.id,
        patientId,
        tratamiento,
        estado,
        observaciones
      })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    
    showToast('Tratamiento registrado con éxito', 'success');
    closeModal('modal-registrar-tratamiento');
    document.getElementById('tratamiento-nombre').value = '';
    document.getElementById('tratamiento-observaciones').value = '';
    loadTreatmentsHistory();
  } catch(e) {
    showToast(e.message || 'Error al registrar', 'error');
  }
}
