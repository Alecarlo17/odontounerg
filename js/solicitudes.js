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
  try {
    const url = status ? `/api/requests/student/${studentId}?status=${status}` : `/api/requests/student/${studentId}`;
    const res = await fetch(url);
    const json = await res.json();
    return json.data || [];
  } catch (e) {
    return [];
  }
}

/**
 * Obtener solicitudes del paciente
 */
async function getPatientRequests(patientId, status = null) {
  try {
    const url = status ? `/api/requests/patient/${patientId}?status=${status}` : `/api/requests/patient/${patientId}`;
    const res = await fetch(url);
    const json = await res.json();
    return json.data || [];
  } catch (e) {
    return [];
  }
}

/**
 * Obtener pacientes disponibles para el estudiante
 */
async function getAvailablePatients(filter = null) {
  try {
    const url = filter && filter !== 'all' ? `/api/patients/available?treatment=${filter}` : '/api/patients/available';
    const res = await fetch(url);
    const json = await res.json();
    return json.data || [];
  } catch (e) {
    return [];
  }
}

/**
 * Obtener estudiantes disponibles para el paciente
 */
async function getAvailableStudents() {
  try {
    const res = await fetch('/api/students/available');
    const json = await res.json();
    return json.data || [];
  } catch (e) {
    return [];
  }
}
