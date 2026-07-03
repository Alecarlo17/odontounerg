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
    if (typeof loadStats === 'function') loadStats();
    if (typeof loadStudentRequestsList === 'function') loadStudentRequestsList();
    if (typeof loadNotificationsList === 'function') loadNotificationsList();
  });
});

/**
 * Configurar sidebar con datos del usuario
 */
function setupSidebar() {
  const name = currentUser.profile?.full_name ? formatShortName(currentUser.profile.full_name) : 'Estudiante';
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
 * Cargar estadísticas — UN SOLO fetch al endpoint consolidado del backend
 */
async function loadStats() {
  const userId = currentUser.user.id;
  let data = { activePatients: 0, pendingRequests: 0, activeAppointments: 0, completedTreatments: 0, avgRating: 0, totalRatings: 0 };
  try {
    const res = await fetch(`/api/dashboard/student/${userId}`);
    const json = await res.json();
    if (json.success) data = { ...data, ...json.data };
  } catch(e) {
    console.error('Error fetching dashboard stats:', e);
  }

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon blue"><i data-lucide="users"></i></div>
      <div class="stat-info">
        <div class="stat-label">Pacientes Activos</div>
        <div class="stat-value" style="${data.activePatients >= 3 ? 'color:var(--danger)' : ''}">${data.activePatients}/3</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon orange"><i data-lucide="star"></i></div>
      <div class="stat-info">
        <div class="stat-label">Promedio de Calificación</div>
        <div class="stat-value">${parseFloat(data.avgRating || 0).toFixed(1)}/5</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green"><i data-lucide="calendar"></i></div>
      <div class="stat-info">
        <div class="stat-label">Citas Activas</div>
        <div class="stat-value">${data.activeAppointments}</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon cyan"><i data-lucide="clipboard-check"></i></div>
      <div class="stat-info">
        <div class="stat-label">Tratamientos Finalizados</div>
        <div class="stat-value">${data.completedTreatments}</div>
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
    const patientName = req.patient?.full_name ? formatShortName(req.patient.full_name) : 'Paciente';
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
 * Actualizar badge de notificaciones (categorizado)
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

/**
 * Mostrar sección del dashboard
 * @param {string} sectionName
 */
const _loadedSections = new Set();

function showSection(sectionName, forceReload = false) {
  // Ocultar todas las secciones
  document.querySelectorAll('.page-content > section').forEach(s => s.classList.add('hidden'));
  document.getElementById(`section-${sectionName}`).classList.remove('hidden');

  // Actualizar sidebar activo
  if (typeof setActiveSidebarLink === 'function') {
    setActiveSidebarLink(sectionName);
  }

  // Cerrar sidebar en móvil al cambiar de sección
  if (window.innerWidth <= 768 && typeof closeSidebarOverlay === 'function') {
    closeSidebarOverlay();
  }

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

  // Caché: no recargar si ya fue abierta en esta sesión
  if (!forceReload && _loadedSections.has(sectionName)) return;

  // Marcar como leído según la sección a la que entra
  if (sectionName === 'notificaciones') {
    markAllNotificationsRead(currentUser.user.id, 'generales').then(() => updateNotificationBadge());
    loadNotificationsList(); 
  }
  else if (sectionName === 'solicitudes') {
    markAllNotificationsRead(currentUser.user.id, 'solicitudes').then(() => updateNotificationBadge());
    loadStudentRequestsList(); 
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
  else if (sectionName === 'pacientes') { loadPatients(); }
  else if (sectionName === 'tratamientos') { loadTreatmentsHistory(); }
  else if (sectionName === 'calificaciones') { loadRatings(); }
  else if (sectionName === 'historial') { loadTreatmentsHistory(); }
  else if (sectionName === 'perfil') { loadProfileData(); }

  _loadedSections.add(sectionName);
}

/**
 * Cargar pacientes disponibles
 */
async function loadPatients() {
  // Solo cargamos del backend una vez o si forzamos
  showLoading(true);
  allPatients = await getAvailablePatients(null);
  showLoading(false);

  filterPatients();
}

/**
 * Filtrar pacientes
 */
function filterPatients() {
  const searchTerm = document.getElementById('search-patients').value.toLowerCase();
  const sexo = document.getElementById('filter-sexo')?.value;
  const orden = document.getElementById('filter-orden')?.value;
  const treatment = document.getElementById('filter-treatment')?.value || 'all';

  let filtered = allPatients;

  // Filtro por motivo de consulta (priorizado)
  if (treatment !== 'all' && treatment !== '') {
    filtered = filtered.filter(p => {
      const reason = p.patients?.consultation_reason?.toLowerCase() || '';
      return reason.includes(treatment.toLowerCase());
    });
  }

  // Filtro por búsqueda
  if (searchTerm) {
    filtered = filtered.filter(p => 
      p.full_name?.toLowerCase().includes(searchTerm) ||
      p.patients?.consultation_reason?.toLowerCase().includes(searchTerm)
    );
  }

  // Filtro por sexo
  if (sexo && sexo !== 'all' && sexo !== '') {
    filtered = filtered.filter(p => p.patients?.gender === sexo);
  }

  // Ordenamiento
  if (orden === 'fecha') {
    // Ordenar por fecha de registro (más recientes primero)
    filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  } else if (orden === 'edad') {
    filtered.sort((a, b) => {
      const ageA = a.patients?.birth_date ? calculateAge(a.patients.birth_date) : (a.patients?.age || 0);
      const ageB = b.patients?.birth_date ? calculateAge(b.patients.birth_date) : (b.patients?.age || 0);
      return ageB - ageA;
    });
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
    const age = patient?.birth_date ? calculateAge(patient.birth_date) : (patient?.age || 'N/A');

    return `
      <div class="patient-card">
        <div class="patient-card-header">
          ${p.avatar_url 
            ? `<img src="${p.avatar_url}" class="patient-card-avatar" alt="${p.full_name}">`
            : `<span class="avatar avatar-placeholder" style="width:48px;height:48px;font-size:1rem;">${getInitials(p.full_name)}</span>`}
          <div>
            <div class="patient-card-name">${escapeHTML(formatShortName(p.full_name))}</div>
            <div class="patient-card-meta">${age} años ${patient?.gender ? '· ' + patient.gender : ''}</div>
          </div>
        </div>
        <div class="patient-card-body">
          <div class="patient-card-problem"><i data-lucide="heart-pulse" style="width:14px;height:14px;"></i> ${escapeHTML(patient?.consultation_reason || 'Sin motivo especificado')}</div>
          
          <div style="margin-top:0.75rem; font-size:0.85rem; display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem; color:var(--text-secondary);">
            <div style="grid-column:1/-1"><strong>Descripción:</strong> ${escapeHTML(patient?.descripcion_problema || 'No especificada')}</div>
            <div><strong>Dolor:</strong> ${escapeHTML(patient?.intensidad_dolor || 'N/A')}</div>
          </div>

          ${p.phone ? `<p style="font-size:0.8rem;color:var(--text-muted);margin-top:0.75rem">📞 ${escapeHTML(p.phone)}</p>` : ''}
        </div>
        <div class="patient-card-footer">
          <button class="btn btn-primary btn-sm" onclick="openSolicitudModal('${p.id}', '${escapeHTML(formatShortName(p.full_name))}', '${escapeHTML(patient?.consultation_reason || '')}')">Enviar Solicitud</button>
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
    loadDashboardData();
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
    const name = req.patient?.full_name ? formatShortName(req.patient.full_name) : 'Paciente';
    let messageStr = req.message || 'Sin mensaje';
    if (messageStr.startsWith('[FromStudent]')) messageStr = messageStr.replace('[FromStudent]', '').trim();

    const isActive = req.status === 'accepted' || req.status === 'active';
    let actionsStr = '';
    if (isActive) {
      actionsStr = `
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.5rem;">
          <button class="btn btn-sm btn-success" onclick="openDarAltaModal('${req.id}', '${req.patient_id}')">🏥 Dar de Alta</button>
          <button class="btn btn-sm btn-outline" onclick="openAbandonModal('${req.id}', '${escapeHTML(name)}')">⚠ Abandono</button>
        </div>`;
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
 * Abrir modal de dar de alta
 */
function openDarAltaModal(requestId, patientId) {
  document.getElementById('dar-alta-request-id').value = requestId;
  document.getElementById('dar-alta-patient-id').value = patientId;
  document.getElementById('dar-alta-responsabilidad').value = '';
  document.getElementById('dar-alta-comentario').value = '';
  document.getElementById('modal-dar-alta').classList.add('active');
}

/**
 * Dar de alta al paciente (con evaluación de responsabilidad)
 */
async function handleSubmitDischarge(event) {
  event.preventDefault();
  const requestId = document.getElementById('dar-alta-request-id').value;
  const patientId = document.getElementById('dar-alta-patient-id').value;
  const responsibility = document.getElementById('dar-alta-responsabilidad').value;
  const comment = document.getElementById('dar-alta-comentario').value;

  if (!responsibility) {
    showToast('Debe evaluar la responsabilidad del paciente', 'error');
    return;
  }

  const ok = await confirmAction('Confirmar Alta Médica', '¿Está seguro de cerrar el caso? Esta acción registrará la evaluación y dará de alta al paciente.');
  if (ok) {
    showLoading(true);
    try {
      // 1. Registrar evaluación de responsabilidad (sin rating numérico, rating = 5 por defecto si la base de datos lo requiere)
      await fetch('/api/ratings/patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: currentUser.user.id, patientId, rating: 5, responsibility, comment })
      });

      // 2. Dar de alta
      const res = await fetch(`/api/requests/${requestId}/discharge`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      showLoading(false);

      if (json.success) {
        showToast('Paciente dado de alta con éxito', 'success');
        closeModal('modal-dar-alta');
        loadStudentRequestsList();
        loadDashboardData();
      } else {
        showToast(json.message || 'Error al dar de alta', 'error');
      }
    } catch (e) {
      showLoading(false);
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
  // Cargar requests aceptadas Y en tratamiento para el select
  const allReqs = await getStudentRequests(currentUser.user.id);
  const requests = allReqs.filter(r => r.status === 'accepted' || r.status === 'active');
  const select = document.getElementById('cita-request');
  select.innerHTML = '<option value="">Seleccione un paciente</option>' +
    requests.map(r => `<option value="${r.id}">${r.patient?.full_name ? formatShortName(r.patient.full_name) : 'Paciente'}</option>`).join('');

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
    loadUpcomingAppointments();
    loadDashboardData();
  }
}

async function handleConfirmAppointment(id) {
  await confirmAppointment(id);
  loadAppointmentsList();
  loadUpcomingAppointments();
  loadDashboardData();
}

async function handleCancelAppointment(id) {
  const ok = await confirmAction('Cancelar Cita', '¿Está seguro de cancelar esta cita?');
  if (ok) {
    await cancelAppointment(id);
    loadAppointmentsList();
    loadUpcomingAppointments();
    loadDashboardData();
  }
}

async function handleCompleteAppointment(id) {
  await completeAppointment(id);
  loadAppointmentsList();
  loadUpcomingAppointments();
  loadDashboardData();
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
    <div class="chat-item ${currentConversationId === c.conversationId ? 'active' : ''}" onclick="openChat('${c.conversationId}', '${c.otherUser?.id}', '${escapeHTML(formatShortName(c.otherUser?.full_name) || 'Usuario')}')">
      ${c.otherUser?.avatar_url 
        ? `<img src="${c.otherUser.avatar_url}" class="chat-item-avatar" alt="${escapeHTML(formatShortName(c.otherUser.full_name))}">`
        : `<div class="chat-item-avatar-placeholder">${getInitials(c.otherUser?.full_name)}</div>`}
      <div class="chat-item-info">
        <div class="chat-item-name">${escapeHTML(formatShortName(c.otherUser?.full_name) || 'Usuario')}</div>
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
  
  // Marcar notificaciones de este chat como leídas
  try {
    await supabase
      .from('notifications')
      .update({ leida: true })
      .eq('user_id', currentUser.user.id)
      .eq('tipo', 'chat')
      .eq('referencia_id', conversationId);
    if(typeof loadNotificationsList === 'function') loadNotificationsList();
  } catch(e) {}

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
            <th>Sesiones</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th style="text-align:right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${treatments.map(t => {
            const estadoInfo = {
              pendiente: { text: 'Pendiente', class: 'badge-warning' },
              en_proceso: { text: 'En proceso', class: 'badge-primary' },
              finalizado: { text: 'Finalizado', class: 'badge-success' }
            }[t.estado] || { text: t.estado, class: 'badge-gray' };
            const patName = t.patient?.full_name ? formatShortName(t.patient.full_name) : 'Paciente';
            return `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:0.75rem;">
                    <span class="avatar avatar-placeholder" style="width:32px;height:32px;font-size:0.8rem">${getInitials(patName)}</span>
                    <span>${escapeHTML(patName)}</span>
                  </div>
                </td>
                <td><strong>${escapeHTML(t.tratamiento)}</strong></td>
                <td>
                  <span class="badge badge-gray" style="cursor:pointer" onclick="openSesionesModal('${t.id}', '${escapeHTML(t.tratamiento)}')">📋 ${t.sesiones_count || 0} sesiones</span>
                </td>
                <td>${new Date(t.fecha).toLocaleDateString('es-VE')}</td>
                <td><span class="badge ${estadoInfo.class}">${estadoInfo.text}</span></td>
                <td style="text-align:right">
                  <div style="display:flex;gap:0.4rem;justify-content:flex-end;">
                    ${t.estado !== 'finalizado' ? `
                      <button class="btn btn-sm btn-primary" onclick="openSesionesModal('${t.id}', '${escapeHTML(t.tratamiento)}')">+ Sesión</button>
                      <button class="btn btn-sm btn-outline" onclick="markTreatmentComplete('${t.id}')">Finalizar</button>
                    ` : `<span style="color:var(--success);font-size:0.85rem;">✓ Completado</span>`}
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
  if (typeof lucide !== 'undefined') lucide.createIcons();
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

async function markTreatmentComplete(treatmentId) {
  const ok = await confirmAction('Finalizar Tratamiento', '¿Está seguro que desea marcar este tratamiento como finalizado?');
  if (ok) {
    showLoading(true);
    try {
      const res = await fetch(`/api/dashboard/treatments/${treatmentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'finalizado' })
      });
      const json = await res.json();
      showLoading(false);
      if (json.success) {
        showToast('Tratamiento finalizado exitosamente', 'success');
        loadTreatmentsHistory();
      } else {
        showToast(json.message || 'Error al finalizar', 'error');
      }
    } catch(e) {
      showLoading(false);
      showToast('Error de red', 'error');
    }
  }
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

    // El endpoint retorna { ratings, avgRating, totalCount }
    const ratings = json.data.ratings || [];
    const avgRating = json.data.avgRating || 0;
    const totalCount = json.data.totalCount || 0;

    // Update badge
    const avgBadge = document.getElementById('ratings-average-badge');
    if (avgBadge) avgBadge.textContent = `⭐ ${parseFloat(avgRating).toFixed(1)} (${totalCount})`;

    const container = document.getElementById('ratings-list');
    if (!ratings || ratings.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="star"></i></div><p class="empty-state-title">Sin calificaciones</p></div>';
      return;
    }

    container.innerHTML = ratings.map(r => `
      <div class="card" style="margin-bottom:1rem">
        <div class="card-body">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
            <strong>${escapeHTML(r.patient_name || 'Paciente')}</strong>
            <span>${[1,2,3,4,5].map(i => `<span style="color:${i <= (r.score||r.rating||0) ? '#eab308' : 'var(--text-muted)'}">★</span>`).join('')}</span>
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

  document.getElementById('profile-name-display').textContent = formatShortName(profile.full_name);
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
      document.getElementById('perfil-paciente-nombre').textContent = formatShortName(p.full_name);
      document.getElementById('perfil-paciente-avatar').innerHTML = 
        `<div class="avatar avatar-placeholder avatar-xl" style="font-size: 2rem;">${getInitials(p.full_name)}</div>`;
      
      const badgeClass = p.disponibilidad === 'disponible' ? 'badge-success' : 'badge-warning';
      const ageNum = p.patients?.birth_date ? calculateAge(p.patients.birth_date) : p.patients?.age;
      const ageText = ageNum ? ageNum + ' años' : 'Edad no especificada';

      document.getElementById('perfil-paciente-badges').innerHTML = 
        `<span class="badge ${badgeClass}">${p.disponibilidad || 'No especificada'}</span>
         <span class="badge badge-primary">${ageText}</span>`;
         
      document.getElementById('perfil-paciente-genero').textContent = p.gender || 'No especificado';
      document.getElementById('perfil-paciente-telefono').textContent = p.p_phone || p.phone || 'No especificado';
      document.getElementById('perfil-paciente-direccion').textContent = p.direccion || 'No especificada';
      document.getElementById('perfil-paciente-fecha-registro').textContent = p.created_at ? new Date(p.created_at).toLocaleDateString() : 'No especificada';
      
      const prob = p.patients?.consultation_reason || p.consultation_reason || 'No especificado';
      const desc = p.patients?.descripcion_problema || p.descripcion_problema || 'No especificada';
      const dolor = p.patients?.intensidad_dolor || p.intensidad_dolor || 'N/A';
      const ant = p.patients?.medical_history || p.medical_history || 'Ninguno';
      
      document.getElementById('perfil-paciente-tratamiento').innerHTML = `<span>${escapeHTML(prob)}</span>`;
      document.getElementById('perfil-paciente-descripcion').innerHTML = `<span>${escapeHTML(desc)}</span><br><br><p style="margin-bottom:0"><strong>Intensidad del Dolor:</strong> ${escapeHTML(dolor)}</p>`;

      document.getElementById('perfil-paciente-antecedentes').innerHTML = `<div style="font-size:0.85rem;color:var(--text-secondary);margin-top:0.25rem;">${escapeHTML(ant)}</div>`;
      document.getElementById('perfil-paciente-disponibilidad').textContent = p.disponibilidad || 'No especificada';
      
      document.getElementById('current-perfil-paciente-id').value = patientId;

      // Evaluación visual removida según solicitud
      
      document.getElementById('modal-perfil-paciente').classList.add('active');
    } else {
      showToast('Error al cargar perfil', 'error');
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
  } catch (error) {
    showToast(error.message || 'Error al registrar tratamiento', 'error');
  }
}

/* =============================================
   MODAL ABANDONO
   ============================================= */
function openAbandonModal(requestId, patientName) {
  document.getElementById('abandon-request-id').value = requestId;
  document.getElementById('abandon-modal-title').textContent = `Marcar abandono: ${patientName}`;
  document.getElementById('abandon-reason').value = '';
  document.getElementById('modal-abandon').classList.add('active');
}

async function handleConfirmAbandon(event) {
  event.preventDefault();
  const requestId = document.getElementById('abandon-request-id').value;
  const reason = document.getElementById('abandon-reason').value;

  if (!reason.trim()) {
    showToast('Debe indicar el motivo del abandono', 'error');
    return;
  }

  const ok = await confirmAction('Confirmar Abandono', `¿Seguro que desea marcar este caso como abandonado? El paciente será reactivado para buscar otro estudiante.`);
  if (!ok) return;

  showLoading(true);
  try {
    const res = await fetch(`/api/requests/${requestId}/abandon`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    const json = await res.json();
    showLoading(false);
    if (json.success) {
      showToast('Caso marcado como abandonado', 'success');
      closeModal('modal-abandon');
      loadStudentRequestsList();
      loadStats();
    } else {
      showToast(json.message || 'Error al registrar abandono', 'error');
    }
  } catch(e) {
    showLoading(false);
    showToast('Error de conexión', 'error');
  }
}

/* =============================================
   MODAL SESIONES CLÍNICAS
   ============================================= */
let _currentSessionTreatmentId = null;

async function openSesionesModal(treatmentId, treatmentName) {
  _currentSessionTreatmentId = treatmentId;
  document.getElementById('sesiones-modal-title').textContent = `Sesiones: ${treatmentName}`;
  document.getElementById('sesion-fecha').value = new Date().toISOString().split('T')[0];
  document.getElementById('sesion-procedimiento').value = '';
  document.getElementById('sesion-observaciones').value = '';
  document.getElementById('sesion-recomendaciones').value = '';
  document.getElementById('modal-sesiones').classList.add('active');
  await loadSesiones(treatmentId);
}

async function loadSesiones(treatmentId) {
  const container = document.getElementById('sesiones-list');
  container.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--text-muted)">Cargando...</div>';
  try {
    const res = await fetch(`/api/dashboard/treatments/${treatmentId}/sessions`);
    const json = await res.json();
    const sessions = json.data || [];

    if (sessions.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding:1rem"><p class="empty-state-text">Sin sesiones registradas. Registra la primera sesión a continuación.</p></div>';
      return;
    }

    container.innerHTML = sessions.map(s => {
      const estadoBadge = s.estado === 'realizada' ? 'badge-success' : s.estado === 'cancelada' ? 'badge-error' : 'badge-warning';
      return `
        <div style="border:1px solid var(--border);border-radius:var(--radius);padding:0.75rem;margin-bottom:0.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong>Sesión #${s.numero_sesion}</strong>
            <span class="badge ${estadoBadge}">${s.estado}</span>
          </div>
          <p style="font-size:0.85rem;margin-top:0.25rem;"><strong>Fecha:</strong> ${new Date(s.fecha).toLocaleDateString('es-VE')}</p>
          <p style="font-size:0.85rem;"><strong>Procedimiento:</strong> ${escapeHTML(s.procedimiento)}</p>
          ${s.observaciones ? `<p style="font-size:0.8rem;color:var(--text-secondary);"><strong>Observaciones:</strong> ${escapeHTML(s.observaciones)}</p>` : ''}
          ${s.recomendaciones ? `<p style="font-size:0.8rem;color:var(--text-secondary);"><strong>Recomendaciones:</strong> ${escapeHTML(s.recomendaciones)}</p>` : ''}
        </div>
      `;
    }).join('');
  } catch(e) {
    container.innerHTML = '<div class="empty-state"><p class="empty-state-text">Error al cargar sesiones</p></div>';
  }
}

async function handleRegistrarSesion(event) {
  event.preventDefault();
  if (!_currentSessionTreatmentId) return;

  const procedimiento = document.getElementById('sesion-procedimiento').value.trim();
  const observaciones = document.getElementById('sesion-observaciones').value.trim();
  const recomendaciones = document.getElementById('sesion-recomendaciones').value.trim();
  const fecha = document.getElementById('sesion-fecha').value;

  if (!procedimiento) {
    showToast('El procedimiento es obligatorio', 'error');
    return;
  }

  showLoading(true);
  try {
    const res = await fetch(`/api/dashboard/treatments/${_currentSessionTreatmentId}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        procedimiento, observaciones, recomendaciones,
        fecha: new Date(fecha).toISOString(),
        estado: 'realizada',
        studentId: currentUser.user.id
      })
    });
    const json = await res.json();
    showLoading(false);
    if (json.success) {
      showToast(`Sesión #${json.data.numero_sesion} registrada exitosamente`, 'success');
      document.getElementById('sesion-procedimiento').value = '';
      document.getElementById('sesion-observaciones').value = '';
      document.getElementById('sesion-recomendaciones').value = '';
      await loadSesiones(_currentSessionTreatmentId);
      loadTreatmentsHistory(); // Actualizar contador de sesiones en la tabla
    } else {
      showToast(json.message || 'Error al registrar sesión', 'error');
    }
  } catch(e) {
    showLoading(false);
    showToast('Error de conexión', 'error');
  }
}
