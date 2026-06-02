/* =============================================
   MODEL: APPOINTMENTS.JS
   Modelo de datos para citas odontológicas
   SQLite como Principal
   ============================================= */

const db = require('../config/database');

/**
 * Crear una nueva cita
 */
async function createAppointment(citaData) {
  try {
    const id = Date.now().toString(); // simple ID gen
    const created_at = new Date().toISOString();
    await db.runSQLite(
      'INSERT INTO appointments (id, request_id, proposed_by, date, duration_minutes, location, status, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, citaData.requestId, citaData.proposedBy, citaData.date, citaData.duration || 60, citaData.location || null, 'proposed', citaData.notes || null, created_at]
    );

    if (await db.getStatus()) {
      db.supabase.from('appointments').insert({
        id,
        request_id: citaData.requestId,
        proposed_by: citaData.proposedBy,
        date: citaData.date,
        duration_minutes: citaData.duration || 60,
        location: citaData.location || null,
        notes: citaData.notes || null,
        status: 'proposed',
        created_at
      }).then(()=>{}).catch(()=>{});
    }

    return { id, request_id: citaData.requestId, status: 'proposed' };
  } catch (e) {
    return null;
  }
}

/**
 * Obtener citas por ID de usuario
 */
async function getAppointmentsByUser(userId, status = null) {
  try {
    let sql = `
      SELECT a.*, r.student_id, r.patient_id, s.full_name as student_name, s.email as student_email, s.avatar_url as student_avatar,
             p.full_name as patient_name, p.email as patient_email, p.avatar_url as patient_avatar
      FROM appointments a 
      JOIN requests r ON a.request_id = r.id 
      LEFT JOIN profiles s ON r.student_id = s.id
      LEFT JOIN profiles p ON r.patient_id = p.id
      WHERE (r.student_id = ? OR r.patient_id = ?)
    `;
    let params = [userId, userId];
    
    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY a.date ASC';
    const data = await db.querySQLite(sql, params);
    
    return data.map(a => ({
      ...a,
      request: {
        student_id: a.student_id,
        patient_id: a.patient_id,
        student: { id: a.student_id, full_name: a.student_name, email: a.student_email, avatar_url: a.student_avatar },
        patient: { id: a.patient_id, full_name: a.patient_name, email: a.patient_email, avatar_url: a.patient_avatar }
      }
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Actualizar estado de una cita
 */
async function updateAppointmentStatus(appointmentId, newStatus) {
  try {
    await db.runSQLite('UPDATE appointments SET status = ? WHERE id = ?', [newStatus, appointmentId]);
    
    if (await db.getStatus()) {
      db.supabase.from('appointments').update({ status: newStatus }).eq('id', appointmentId).then(()=>{}).catch(()=>{});
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Obtener todas las citas (para administración)
 */
async function getAllAppointments() {
  try {
    const sql = `
      SELECT a.*, s.full_name as student_name, p.full_name as patient_name
      FROM appointments a
      LEFT JOIN requests r ON a.request_id = r.id
      LEFT JOIN profiles s ON r.student_id = s.id
      LEFT JOIN profiles p ON r.patient_id = p.id
      ORDER BY a.date DESC
    `;
    const data = await db.querySQLite(sql);
    return data.map(a => ({
      ...a,
      request: {
        student: { full_name: a.student_name },
        patient: { full_name: a.patient_name }
      }
    }));
  } catch (e) {
    return [];
  }
}

module.exports = {
  createAppointment,
  getAppointmentsByUser,
  updateAppointmentStatus,
  getAllAppointments
};
