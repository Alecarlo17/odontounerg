/* =============================================
   CITAS.JS - Sistema de Citas Odontológicas
   ============================================= */

/**
 * Crear nueva cita
 * @param {object} citaData
 */
async function createAppointment(citaData) {
  const { error } = await supabase.from('appointments').insert({
    request_id: citaData.requestId,
    proposed_by: citaData.proposedBy,
    date: citaData.date,
    duration_minutes: citaData.duration || 60,
    location: citaData.location || null,
    notes: citaData.notes || null,
    status: 'proposed'
  });

  if (error) {
    showToast('Error al crear cita', 'error');
    return false;
  }

  // Notificar al otro usuario
  const { data: request } = await supabase
    .from('requests')
    .select('student_id, patient_id')
    .eq('id', citaData.requestId)
    .single();

  if (request) {
    const otherUserId = citaData.proposedBy === request.student_id 
      ? request.patient_id 
      : request.student_id;
    
    await createNotification(
      otherUserId,
      'cita',
      'Nueva cita propuesta',
      `Se ha propuesto una cita para el ${formatDate(citaData.date)}`
    );
  }

  showToast('Cita creada exitosamente', 'success');
  return true;
}

/**
 * Obtener citas del usuario
 * @param {string} userId
 * @param {string} status - Filtrar por estado
 */
async function getAppointments(userId, status = null) {
  // Primero obtener requests del usuario
  const { data: requests } = await supabase
    .from('requests')
    .select('id')
    .or(`student_id.eq.${userId},patient_id.eq.${userId}`);

  if (!requests || requests.length === 0) return [];

  const requestIds = requests.map(r => r.id);

  let query = supabase
    .from('appointments')
    .select(`
      *,
      request:request_id(
        student_id,
        patient_id,
        student:student_id(id, full_name, avatar_url, email),
        patient:patient_id(id, full_name, avatar_url, email)
      )
    `)
    .in('request_id', requestIds)
    .order('date', { ascending: true });

  if (status) query = query.eq('status', status);

  const { data } = await query;
  return data || [];
}

/**
 * Confirmar cita
 * @param {string} appointmentId
 */
async function confirmAppointment(appointmentId) {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', appointmentId);

  if (error) {
    showToast('Error al confirmar cita', 'error');
    return false;
  }
  showToast('Cita confirmada', 'success');
  return true;
}

/**
 * Cancelar cita
 * @param {string} appointmentId
 */
async function cancelAppointment(appointmentId) {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', appointmentId);

  if (error) {
    showToast('Error al cancelar cita', 'error');
    return false;
  }
  showToast('Cita cancelada', 'success');
  return true;
}

/**
 * Completar cita
 * @param {string} appointmentId
 */
async function completeAppointment(appointmentId) {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', appointmentId);

  if (error) {
    showToast('Error al finalizar cita', 'error');
    return false;
  }
  showToast('Cita finalizada', 'success');
  return true;
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
    actions = `
      <button class="btn btn-success btn-sm" onclick="handleConfirmAppointment('${appointment.id}')">Confirmar</button>
      <button class="btn btn-danger btn-sm" onclick="handleCancelAppointment('${appointment.id}')">Cancelar</button>
    `;
  } else if (appointment.status === 'confirmed') {
    actions = `
      <button class="btn btn-primary btn-sm" onclick="handleCompleteAppointment('${appointment.id}')">Finalizar</button>
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
