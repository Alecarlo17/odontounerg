/* =============================================
   MODEL: APPOINTMENTS.JS
   Modelo de datos para citas odontológicas
   ============================================= */

const db = require('../config/database');

/**
 * Crear una nueva cita
 */
async function createAppointment(citaData) {
  try {
    const created_at = new Date().toISOString();
    
    const { data, error } = await db.supabase
      .from('appointments')
      .insert({
        request_id: citaData.requestId,
        proposed_by: citaData.proposedBy,
        date: citaData.date,
        duration_minutes: citaData.duration || 60,
        location: citaData.location || null,
        notes: citaData.notes || null,
        status: 'proposed',
        created_at
      })
      .select('id')
      .single();

    if (error) throw error;
    return { id: data?.id, request_id: citaData.requestId, status: 'proposed' };
  } catch (e) {
    console.error('Error en createAppointment:', e);
    return null;
  }
}

/**
 * Obtener citas por ID de usuario
 */
async function getAppointmentsByUser(userId, status = null) {
  try {
    // Primero obtener los requests relacionados con el usuario
    const { data: userRequests, error: reqError } = await db.supabase
      .from('requests')
      .select('id')
      .or(`student_id.eq.${userId},patient_id.eq.${userId}`);
      
    if (reqError) throw reqError;
    if (!userRequests || userRequests.length === 0) return [];
    
    const requestIds = userRequests.map(r => r.id);

    let query = db.supabase
      .from('appointments')
      .select(`
        *,
        request:requests(
          student_id,
          patient_id,
          student:student_id(id, full_name, email, avatar_url),
          patient:patient_id(id, full_name, email, avatar_url)
        )
      `)
      .in('request_id', requestIds)
      .order('date', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    // Normalizar la respuesta al formato esperado por el frontend
    return (data || []).map(a => {
      // Supabase retorna array si la foreign key no es unívoca desde su perspectiva o si usa view,
      // extraemos el primer elemento si request viene como array.
      const req = Array.isArray(a.request) ? a.request[0] : a.request;
      return {
        ...a,
        request: req
      };
    });
  } catch (e) {
    console.error('Error en getAppointmentsByUser:', e);
    return [];
  }
}

/**
 * Actualizar estado de una cita
 */
async function updateAppointmentStatus(appointmentId, newStatus) {
  try {
    const { error } = await db.supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId);
      
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Error en updateAppointmentStatus:', e);
    return false;
  }
}

/**
 * Obtener todas las citas (para administración)
 */
async function getAllAppointments() {
  try {
    const { data, error } = await db.supabase
      .from('appointments')
      .select(`
        *,
        request:requests(
          student:student_id(full_name),
          patient:patient_id(full_name)
        )
      `)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map(a => {
      const req = Array.isArray(a.request) ? a.request[0] : a.request;
      return {
        ...a,
        request: req
      };
    });
  } catch (e) {
    console.error('Error en getAllAppointments:', e);
    return [];
  }
}

module.exports = {
  createAppointment,
  getAppointmentsByUser,
  updateAppointmentStatus,
  getAllAppointments
};
