/* =============================================
   SOLICITUDES.JS
   Sistema de solicitudes entre estudiantes y pacientes
   ============================================= */

/**
 * Enviar solicitud de estudiante a paciente
 * @param {string} studentId
 * @param {string} patientId
 * @param {string} message - Mensaje opcional
 */
async function sendRequest(studentId, patientId, message = '') {
  // Verificar que no exista solicitud pendiente
  const { data: existing } = await supabase
    .from('requests')
    .select('id')
    .eq('student_id', studentId)
    .eq('patient_id', patientId)
    .in('status', ['pending', 'accepted', 'active'])
    .single();

  if (existing) {
    showToast('Ya tiene una solicitud activa con este paciente', 'warning');
    return false;
  }

  const { error } = await supabase.from('requests').insert({
    student_id: studentId,
    patient_id: patientId,
    status: 'pending',
    message: message || null
  });

  if (error) {
    showToast('Error al enviar solicitud', 'error');
    return false;
  }

  // Crear notificación para el paciente
  await createNotification(
    patientId,
    'solicitud',
    'Nueva solicitud recibida',
    'Un estudiante desea atenderle. Revise sus solicitudes.'
  );

  showToast('Solicitud enviada exitosamente', 'success');
  return true;
}

/**
 * Aceptar solicitud
 * @param {string} requestId
 */
async function acceptRequest(requestId) {
  const { data: request, error: fetchError } = await supabase
    .from('requests')
    .select('*, student_id, patient_id')
    .eq('id', requestId)
    .single();

  if (fetchError) {
    showToast('Error al obtener solicitud', 'error');
    return false;
  }

  // Actualizar estado de solicitud
  const { error } = await supabase
    .from('requests')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', requestId);

  if (error) {
    showToast('Error al aceptar solicitud', 'error');
    return false;
  }

  // Crear conversación
  await supabase.from('conversations').insert({
    request_id: requestId
  });

  // Notificar al estudiante
  await createNotification(
    request.student_id,
    'aceptada',
    'Solicitud aceptada',
    'Un paciente ha aceptado su solicitud. Ya puede comunicarse por chat.'
  );

  showToast('Solicitud aceptada', 'success');
  return true;
}

/**
 * Rechazar solicitud
 * @param {string} requestId
 */
async function rejectRequest(requestId) {
  const { data: request } = await supabase
    .from('requests')
    .select('student_id')
    .eq('id', requestId)
    .single();

  const { error } = await supabase
    .from('requests')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', requestId);

  if (error) {
    showToast('Error al rechazar solicitud', 'error');
    return false;
  }

  if (request) {
    await createNotification(
      request.student_id,
      'rechazada',
      'Solicitud rechazada',
      'Un paciente ha rechazado su solicitud.'
    );
  }

  showToast('Solicitud rechazada', 'success');
  return true;
}

/**
 * Obtener solicitudes del estudiante
 * @param {string} studentId
 * @param {string} status - Filtrar por estado
 */
async function getStudentRequests(studentId, status = null) {
  let query = supabase
    .from('requests')
    .select(`
      *,
      patient:patient_id(id, full_name, email, avatar_url, phone),
      patient_data:patient_id(consultation_reason, age, medical_history)
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  return data || [];
}

/**
 * Obtener solicitudes del paciente
 * @param {string} patientId
 * @param {string} status
 */
async function getPatientRequests(patientId, status = null) {
  let query = supabase
    .from('requests')
    .select(`
      *,
      student:student_id(id, full_name, email, avatar_url, phone)
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  return data || [];
}

/**
 * Obtener pacientes disponibles para el estudiante
 * @param {string} filter - Filtrar por tratamiento
 */
async function getAvailablePatients(filter = null) {
  let query = supabase
    .from('profiles')
    .select(`
      *,
      patients!inner(*)
    `)
    .eq('role', 'patient')
    .eq('patients.accepts_requests', true);

  if (filter && filter !== 'all') {
    query = query.eq('patients.consultation_reason', filter);
  }

  const { data, error } = await query;
  return data || [];
}

/**
 * Obtener estudiantes disponibles para el paciente
 */
async function getAvailableStudents() {
  const { data } = await supabase
    .from('profiles')
    .select(`
      *,
      students!inner(*)
    `)
    .eq('role', 'student')
    .eq('disponibilidad', 'disponible');

  return data || [];
}
