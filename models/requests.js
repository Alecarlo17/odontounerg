/* =============================================
   MODEL: REQUESTS.JS
   Modelo de datos para solicitudes
   
   Encapsula las consultas a Supabase
   relacionadas con las solicitudes entre
   estudiantes y pacientes.
   ============================================= */

const supabase = require('../config/supabase');

/**
 * Crear una nueva solicitud
 * @param {string} studentId - ID del estudiante
 * @param {string} patientId - ID del paciente
 * @param {string} message - Mensaje opcional
 * @returns {boolean} Éxito de la operación
 */
async function createRequest(studentId, patientId, message = '') {
  // Verificar que no exista solicitud activa
  const { data: existing } = await supabase
    .from('requests')
    .select('id')
    .eq('student_id', studentId)
    .eq('patient_id', patientId)
    .in('status', ['pending', 'accepted', 'active'])
    .single();

  if (existing) return { success: false, message: 'Ya existe una solicitud activa' };

  const { error } = await supabase.from('requests').insert({
    student_id: studentId,
    patient_id: patientId,
    status: 'pending',
    message: message || null
  });

  if (error) return { success: false, message: 'Error al crear solicitud' };
  return { success: true };
}

/**
 * Obtener solicitudes de un estudiante
 * @param {string} studentId - ID del estudiante
 * @param {string} status - Filtrar por estado (opcional)
 * @returns {Array} Lista de solicitudes
 */
async function getStudentRequests(studentId, status = null) {
  let query = supabase
    .from('requests')
    .select(`
      *,
      patient:patient_id(id, full_name, email, avatar_url, phone)
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data } = await query;
  return data || [];
}

/**
 * Obtener solicitudes de un paciente
 * @param {string} patientId - ID del paciente
 * @param {string} status - Filtrar por estado (opcional)
 * @returns {Array} Lista de solicitudes
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

  const { data } = await query;
  return data || [];
}

/**
 * Actualizar estado de una solicitud
 * @param {string} requestId - ID de la solicitud
 * @param {string} newStatus - Nuevo estado
 * @returns {boolean} Éxito de la operación
 */
async function updateRequestStatus(requestId, newStatus) {
  const { error } = await supabase
    .from('requests')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId);

  return !error;
}

/**
 * Obtener todas las solicitudes (para administración)
 * @returns {Array} Lista completa de solicitudes
 */
async function getAllRequests() {
  const { data } = await supabase
    .from('requests')
    .select(`
      *,
      student:student_id(full_name),
      patient:patient_id(full_name)
    `)
    .order('created_at', { ascending: false });

  return data || [];
}

// Exportar funciones del modelo
module.exports = {
  createRequest,
  getStudentRequests,
  getPatientRequests,
  updateRequestStatus,
  getAllRequests
};
