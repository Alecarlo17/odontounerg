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
 * Verificar cita duplicada: mismo estudiante o paciente en el mismo rango horario
 * @returns {conflict: boolean, message: string}
 */
async function checkDuplicateAppointment(studentId, patientId, dateStr, durationMinutes = 60) {
  try {
    const startTime = new Date(dateStr);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    // Obtener todas las solicitudes activas del estudiante y el paciente
    const { data: studentRequests } = await db.supabase
      .from('requests')
      .select('id')
      .eq('student_id', studentId)
      .in('status', ['accepted', 'active', 'in_treatment']);

    const { data: patientRequests } = await db.supabase
      .from('requests')
      .select('id')
      .eq('patient_id', patientId)
      .in('status', ['accepted', 'active', 'in_treatment']);

    const studentReqIds = (studentRequests || []).map(r => r.id);
    const patientReqIds = (patientRequests || []).map(r => r.id);
    const allReqIds = [...new Set([...studentReqIds, ...patientReqIds])];

    if (allReqIds.length === 0) return { conflict: false };

    // Buscar citas confirmed/proposed en esos requests
    const { data: existingAppts } = await db.supabase
      .from('appointments')
      .select('date, duration_minutes, request_id')
      .in('request_id', allReqIds)
      .in('status', ['proposed', 'confirmed']);

    for (const appt of (existingAppts || [])) {
      const apptStart = new Date(appt.date);
      const apptEnd = new Date(apptStart.getTime() + (appt.duration_minutes || 60) * 60000);

      // Verificar solapamiento: dos rangos se solapan si start1 < end2 && start2 < end1
      if (startTime < apptEnd && apptStart < endTime) {
        return {
          conflict: true,
          message: `Ya existe una cita en ese horario (${apptStart.toLocaleString('es-VE')}). Por favor selecciona otro horario.`
        };
      }
    }

    return { conflict: false };
  } catch (e) {
    console.error('Error en checkDuplicateAppointment:', e);
    return { conflict: false }; // En caso de error, permitir (no bloquear)
  }
}

/**
 * Obtener citas por ID de usuario
 */
async function getAppointmentsByUser(userId, status = null) {
  try {
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

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(a => {
      const req = Array.isArray(a.request) ? a.request[0] : a.request;
      return { ...a, request: req };
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
 * Obtener una cita por ID (para leer datos del request asociado)
 */
async function getAppointmentById(appointmentId) {
  try {
    const { data, error } = await db.supabase
      .from('appointments')
      .select(`
        *,
        request:requests(student_id, patient_id,
          student:student_id(full_name),
          patient:patient_id(full_name)
        )
      `)
      .eq('id', appointmentId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const req = Array.isArray(data.request) ? data.request[0] : data.request;
    return { ...data, request: req };
  } catch (e) {
    console.error('Error en getAppointmentById:', e);
    return null;
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
      return { ...a, request: req };
    });
  } catch (e) {
    console.error('Error en getAllAppointments:', e);
    return [];
  }
}

module.exports = {
  createAppointment,
  checkDuplicateAppointment,
  getAppointmentsByUser,
  getAppointmentById,
  updateAppointmentStatus,
  getAllAppointments
};
