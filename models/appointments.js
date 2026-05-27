/* =============================================
   MODEL: APPOINTMENTS.JS
   Modelo de datos para citas odontológicas
   
   Encapsula las consultas a Supabase
   relacionadas con la gestión de citas.
   ============================================= */

const supabase = require('../config/supabase');

/**
 * Crear una nueva cita
 * @param {object} citaData - Datos de la cita
 * @returns {object|null} Cita creada o null en caso de error
 */
async function createAppointment(citaData) {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      request_id: citaData.requestId,
      proposed_by: citaData.proposedBy,
      date: citaData.date,
      duration_minutes: citaData.duration || 60,
      location: citaData.location || null,
      notes: citaData.notes || null,
      status: 'proposed'
    })
    .select()
    .single();

  if (error) return null;
  return data;
}

/**
 * Obtener citas por ID de usuario
 * @param {string} userId - ID del usuario
 * @param {string} status - Filtrar por estado (opcional)
 * @returns {Array} Lista de citas
 */
async function getAppointmentsByUser(userId, status = null) {
  // Obtener solicitudes del usuario
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
 * Actualizar estado de una cita
 * @param {string} appointmentId - ID de la cita
 * @param {string} newStatus - Nuevo estado
 * @returns {boolean} Éxito de la operación
 */
async function updateAppointmentStatus(appointmentId, newStatus) {
  const { error } = await supabase
    .from('appointments')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId);

  return !error;
}

/**
 * Obtener todas las citas (para administración)
 * @returns {Array} Lista de todas las citas
 */
async function getAllAppointments() {
  const { data } = await supabase
    .from('appointments')
    .select(`
      *,
      request:request_id(
        student:student_id(full_name),
        patient:patient_id(full_name)
      )
    `)
    .order('date', { ascending: false });

  return data || [];
}

// Exportar funciones del modelo
module.exports = {
  createAppointment,
  getAppointmentsByUser,
  updateAppointmentStatus,
  getAllAppointments
};
