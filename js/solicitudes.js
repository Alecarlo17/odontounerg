/* =============================================
   SOLICITUDES.JS
   Sistema de solicitudes entre estudiantes y pacientes
   ============================================= */

/**
 * Enviar solicitud de estudiante a paciente
 */
async function sendRequest(studentId, patientId, message = '') {
  try {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, patientId, message })
    });
    const json = await res.json();
    if (!json.success) {
      showToast(json.message || 'Error al enviar solicitud', 'warning');
      return false;
    }
    showToast('Solicitud enviada exitosamente', 'success');
    return true;
  } catch (error) {
    showToast('Error de conexión', 'error');
    return false;
  }
}

/**
 * Aceptar solicitud
 */
async function acceptRequest(requestId) {
  try {
    const res = await fetch(`/api/requests/${requestId}/accept`, { method: 'PUT' });
    const json = await res.json();
    if (!json.success) {
      showToast(json.message || 'Error al aceptar solicitud', 'error');
      return false;
    }
    showToast('Solicitud aceptada', 'success');
    return true;
  } catch (error) {
    showToast('Error de conexión', 'error');
    return false;
  }
}

/**
 * Rechazar solicitud
 */
async function rejectRequest(requestId) {
  try {
    const res = await fetch(`/api/requests/${requestId}/reject`, { method: 'PUT' });
    const json = await res.json();
    if (!json.success) {
      showToast(json.message || 'Error al rechazar solicitud', 'error');
      return false;
    }
    showToast('Solicitud rechazada', 'success');
    return true;
  } catch (error) {
    showToast('Error de conexión', 'error');
    return false;
  }
}

/**
 * Obtener solicitudes del estudiante
 */
async function getStudentRequests(studentId, status = null) {
  if (navigator.onLine) {
    const client = window.supabaseClient || supabase;
    let query = client.from('requests').select('*, patient:patient_id(id, full_name, email, avatar_url, phone), patient_data:patient_id(consultation_reason, age, medical_history)').eq('student_id', studentId).order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data } = await query;
    return data || [];
  } else {
    try {
      const url = status ? `/api/requests/student/${studentId}?status=${status}` : `/api/requests/student/${studentId}`;
      const res = await fetch(url);
      const json = await res.json();
      return json.data || [];
    } catch (e) {
      return [];
    }
  }
}

/**
 * Obtener solicitudes del paciente
 */
async function getPatientRequests(patientId, status = null) {
  if (navigator.onLine) {
    const client = window.supabaseClient || supabase;
    let query = client.from('requests').select('*, student:student_id(id, full_name, email, avatar_url, phone)').eq('patient_id', patientId).order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data } = await query;
    return data || [];
  } else {
    try {
      const url = status ? `/api/requests/patient/${patientId}?status=${status}` : `/api/requests/patient/${patientId}`;
      const res = await fetch(url);
      const json = await res.json();
      return json.data || [];
    } catch (e) {
      return [];
    }
  }
}

/**
 * Obtener pacientes disponibles para el estudiante
 */
async function getAvailablePatients(filter = null) {
  if (navigator.onLine) {
    const client = window.supabaseClient || supabase;
    let query = client.from('profiles').select('*, patients!inner(*)').eq('role', 'patient').eq('patients.accepts_requests', true);
    if (filter && filter !== 'all') {
      query = query.eq('patients.consultation_reason', filter);
    }
    const { data } = await query;
    return data || [];
  } else {
    try {
      const url = filter && filter !== 'all' ? `/api/patients/available?treatment=${filter}` : '/api/patients/available';
      const res = await fetch(url);
      const json = await res.json();
      return json.data || [];
    } catch (e) {
      return [];
    }
  }
}

/**
 * Obtener estudiantes disponibles para el paciente
 */
async function getAvailableStudents() {
  if (navigator.onLine) {
    const client = window.supabaseClient || supabase;
    const { data } = await client.from('profiles').select('*, students!inner(*)').eq('role', 'student').eq('disponibilidad', 'disponible');
    return data || [];
  } else {
    try {
      const res = await fetch('/api/students/available');
      const json = await res.json();
      return json.data || [];
    } catch (e) {
      return [];
    }
  }
}
