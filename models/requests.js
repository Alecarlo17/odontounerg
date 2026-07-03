/* =============================================
   MODEL: REQUESTS.JS
   Modelo de datos para solicitudes
   ============================================= */

const db = require('../config/database');

/**
 * Crear una nueva solicitud
 */
async function createRequest(studentId, patientId, message = '') {
  try {
    // Anti-duplicado: bloquear si existe solicitud activa en cualquier estado activo
    const { data: existing, error: existError } = await db.supabase
      .from('requests')
      .select('id, status')
      .eq('student_id', studentId)
      .eq('patient_id', patientId)
      .in('status', ['pending', 'accepted', 'active'])
      .limit(1);

    if (existError) throw existError;
    if (existing && existing.length > 0) return { success: false, message: 'Ya existe una solicitud activa con este paciente' };

    const created_at = new Date().toISOString();
    const { error } = await db.supabase
      .from('requests')
      .insert({
        student_id: studentId,
        patient_id: patientId,
        status: 'pending',
        message: message || null,
        created_at
      });

    if (error) throw error;
    return { success: true };
  } catch(e) {
    console.error('Error en createRequest:', e);
    return { success: false, message: 'Error interno en la base de datos' };
  }
}

/**
 * Obtener solicitudes de un estudiante
 */
async function getStudentRequests(studentId, status = null) {
  try {
    let query = db.supabase
      .from('requests')
      .select(`
        *,
        patient:patient_id(full_name, email, phone)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error en getStudentRequests:', e);
    return [];
  }
}

/**
 * Obtener solicitudes de un paciente
 */
async function getPatientRequests(patientId, status = null) {
  try {
    let query = db.supabase
      .from('requests')
      .select(`
        *,
        student:student_id(full_name, email, phone)
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error en getPatientRequests:', e);
    return [];
  }
}

/**
 * Actualizar estado de una solicitud
 */
async function updateRequestStatus(requestId, newStatus) {
  try {
    const { error } = await db.supabase
      .from('requests')
      .update({ status: newStatus })
      .eq('id', requestId);

    if (error) throw error;
    return true;
  } catch(e) {
    console.error('Error en updateRequestStatus:', e);
    return false;
  }
}

/**
 * Transicionar solicitud a active (cuando se registra el primer tratamiento)
 */
async function transitionToActive(studentId, patientId) {
  try {
    const { data: requestRow } = await db.supabase
      .from('requests')
      .select('id')
      .eq('student_id', studentId)
      .eq('patient_id', patientId)
      .eq('status', 'accepted')
      .maybeSingle();
      
    if (requestRow) {
      const { error } = await db.supabase
        .from('requests')
        .update({ status: 'active' })
        .eq('id', requestRow.id);
      
      if (error) throw error;
    }
    
    return true;
  } catch(e) {
    console.error('Error en transitionToInTreatment:', e);
    return false;
  }
}

/**
 * Marcar solicitud como abandonada
 */
async function markAbandoned(requestId, reason = '') {
  try {
    const { error } = await db.supabase
      .from('requests')
      .update({
        status: 'abandoned',
        abandoned_at: new Date().toISOString(),
        abandon_reason: reason
      })
      .eq('id', requestId);

    if (error) throw error;
    return true;
  } catch(e) {
    console.error('Error en markAbandoned:', e);
    return false;
  }
}

/**
 * Obtener todas las solicitudes (para administración)
 */
async function getAllRequests() {
  try {
    const { data, error } = await db.supabase
      .from('requests')
      .select(`
        *,
        student:student_id(full_name),
        patient:patient_id(full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error en getAllRequests:', e);
    return [];
  }
}

/**
 * Obtener cantidad * Contar pacientes activos de un estudiante
 * (accepted + active)
 */
async function getActivePatientsCount(studentId) {
  try {
    const { count, error } = await db.supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .in('status', ['accepted', 'active']);

    if (error) throw error;
    return count || 0;
  } catch (e) {
    console.error('Error en getActivePatientsCount:', e);
    return 0;
  }
}

module.exports = {
  createRequest,
  getStudentRequests,
  getPatientRequests,
  updateRequestStatus,
  transitionToActive,
  markAbandoned,
  getAllRequests,
  getActivePatientsCount
};
