/* =============================================
   CITAS.JS - Sistema de Citas Odontológicas
   ============================================= */

/**
 * Crear nueva cita
 */
async function createAppointment(citaData) {
  try {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: citaData.requestId,
        proposedBy: citaData.proposedBy,
        date: citaData.date,
        duration: citaData.duration || 60,
        location: citaData.location || null,
        notes: citaData.notes || null
      })
    });
    const json = await res.json();
    if (!json.success) {
      showToast(json.message || 'Error al crear cita', 'error');
      return false;
    }
    showToast('Cita creada exitosamente', 'success');
    return true;
  } catch (error) {
    showToast('Error de conexión', 'error');
    return false;
  }
}

/**
 * Obtener citas del usuario
 */
async function getAppointments(userId, status = null) {
  try {
    const url = status ? `/api/appointments/user/${userId}?status=${status}` : `/api/appointments/user/${userId}`;
    const res = await fetch(url);
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    return [];
  }
}

/**
 * Confirmar cita
 */
async function confirmAppointment(appointmentId) {
  try {
    const res = await fetch(`/api/appointments/${appointmentId}/confirm`, { method: 'PUT' });
    const json = await res.json();
    if (!json.success) {
      showToast(json.message || 'Error al confirmar cita', 'error');
      return false;
    }
    showToast('Cita confirmada', 'success');
    return true;
  } catch (error) {
    showToast('Error de conexión', 'error');
    return false;
  }
}

/**
 * Cancelar cita
 */
async function cancelAppointment(appointmentId) {
  try {
    const res = await fetch(`/api/appointments/${appointmentId}/cancel`, { method: 'PUT' });
    const json = await res.json();
    if (!json.success) {
      showToast(json.message || 'Error al cancelar cita', 'error');
      return false;
    }
    showToast('Cita cancelada', 'success');
    return true;
  } catch (error) {
    showToast('Error de conexión', 'error');
    return false;
  }
}

/**
 * Completar cita
 */
async function completeAppointment(appointmentId) {
  try {
    const res = await fetch(`/api/appointments/${appointmentId}/complete`, { method: 'PUT' });
    const json = await res.json();
    if (!json.success) {
      showToast(json.message || 'Error al finalizar cita', 'error');
      return false;
    }
    showToast('Cita finalizada', 'success');
    return true;
  } catch (error) {
    showToast('Error de conexión', 'error');
    return false;
  }
}

/**
 * Renderizar tarjeta de cita
 * @param {object} appointment
 * @param {string} currentUserId
 * @returns {string} HTML
 */
function renderAppointmentCard(appointment, currentUserId) {
  const statusInfo = getStatusInfo(appointment.status);
  const date = new Date(appointment.date);
  const dateStr = formatDate(appointment.date);
  const timeStr = date.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  
  // Determinar el otro usuario
  const req = appointment.request;
  const isStudent = req?.student_id === currentUserId;
  const otherUser = isStudent ? req?.patient : req?.student;
  const otherName = otherUser?.full_name || 'Usuario';

  let actions = '';
  if (appointment.status === 'proposed') {
    if (appointment.proposed_by === currentUserId) {
      actions = `
        <span class="badge badge-warning" style="margin-right:0.5rem;">Esperando respuesta</span>
        <button class="btn btn-danger btn-sm" onclick="handleCancelAppointment('${appointment.id}')">Cancelar</button>
      `;
    } else {
      actions = `
        <button class="btn btn-success btn-sm" onclick="handleConfirmAppointment('${appointment.id}')">Confirmar</button>
        <button class="btn btn-danger btn-sm" onclick="handleCancelAppointment('${appointment.id}')">Rechazar</button>
      `;
    }
  } else if (appointment.status === 'confirmed') {
    actions = `
      ${isStudent ? `<button class="btn btn-primary btn-sm" onclick="handleCompleteAppointment('${appointment.id}')">Finalizar</button>` : ''}
      <button class="btn btn-danger btn-sm" onclick="handleCancelAppointment('${appointment.id}')">Cancelar</button>
    `;
  }

  return `
    <div class="card" style="margin-bottom: 0.75rem; animation: fadeIn 0.4s ease;">
      <div class="card-body" style="display: flex; align-items: center; gap: 1rem;">
        <div style="width:48px;height:48px;border-radius:var(--radius-md);background:var(--primary-50);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--primary);"><i data-lucide="calendar" style="width:22px;height:22px;"></i></div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem;">
            <strong style="font-size:0.95rem;">${escapeHTML(otherName)}</strong>
            <span class="badge ${statusInfo.class}">${statusInfo.text}</span>
          </div>
          <p style="font-size:0.85rem;color:var(--text-secondary);">${dateStr} &nbsp; ${timeStr} &nbsp; ${appointment.duration_minutes} min</p>
          ${appointment.location ? `<p style="font-size:0.8rem;color:var(--text-muted);">${escapeHTML(appointment.location)}</p>` : ''}
          ${appointment.notes ? `<p style="font-size:0.8rem;color:var(--text-muted);">${escapeHTML(appointment.notes)}</p>` : ''}
        </div>
        <div style="display:flex;gap:0.35rem;flex-shrink:0;">
          ${actions}
        </div>
      </div>
    </div>
  `;
}
