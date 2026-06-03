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
    const { data: existing, error: existError } = await db.supabase
      .from('requests')
      .select('id')
      .eq('student_id', studentId)
      .eq('patient_id', patientId)
      .in('status', ['pending', 'accepted', 'active'])
      .maybeSingle();

    if (existError) throw existError;
    if (existing) return { success: false, message: 'Ya existe una solicitud activa con este paciente' };

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

    if (status) {
      query = query.eq('status', status);
    }

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

    if (status) {
      query = query.eq('status', status);
    }

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
 * Obtener cantidad de pacientes activos de un estudiante
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
    return 0; // Prevent creation if error? Better to return 0 to not block completely, or maybe block. Let's return 0.
  }
}

module.exports = {
  createRequest,
  getStudentRequests,
  getPatientRequests,
  updateRequestStatus,
  getAllRequests,
  getActivePatientsCount
};
