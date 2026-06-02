/* =============================================
   MODEL: REQUESTS.JS
   Modelo de datos para solicitudes
   SQLite como Principal
   ============================================= */

const db = require('../config/database');

/**
 * Crear una nueva solicitud
 */
async function createRequest(studentId, patientId, message = '') {
  try {
    // 1. Verificar existencia en SQLite
    const existing = await db.getSQLite("SELECT id FROM requests WHERE student_id = ? AND patient_id = ? AND status IN ('pending', 'accepted', 'active')", [studentId, patientId]);
    if (existing) return { success: false, message: 'Ya existe una solicitud activa con este paciente' };

    const id = Date.now().toString();
    const created_at = new Date().toISOString();

    // 2. Guardar en SQLite (Principal)
    await db.runSQLite(
      'INSERT INTO requests (id, student_id, patient_id, status, message, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, studentId, patientId, 'pending', message || null, created_at]
    );

    // 3. Sincronizar a Supabase en background si hay internet (Secundario)
    if (await db.getStatus()) {
      db.supabase.from('requests').insert({
        id, student_id: studentId, patient_id: patientId, status: 'pending', message: message || null, created_at
      }).then(() => {}).catch(() => {});
    }

    return { success: true };
  } catch(e) {
    console.error('Error en createRequest:', e);
    return { success: false, message: 'Error interno en la base de datos local' };
  }
}

/**
 * Obtener solicitudes de un estudiante
 */
async function getStudentRequests(studentId, status = null) {
  try {
    let sql = `
      SELECT r.*, p.full_name, p.email, p.phone
      FROM requests r
      LEFT JOIN profiles p ON r.patient_id = p.id
      WHERE r.student_id = ?
    `;
    let params = [studentId];
    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY r.created_at DESC';
    const data = await db.querySQLite(sql, params);
    
    // Formatear para que el frontend lo lea bien
    return data.map(r => ({
      ...r,
      patient: { full_name: r.full_name, email: r.email, phone: r.phone }
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Obtener solicitudes de un paciente
 */
async function getPatientRequests(patientId, status = null) {
  try {
    let sql = `
      SELECT r.*, s.full_name, s.email, s.phone
      FROM requests r
      LEFT JOIN profiles s ON r.student_id = s.id
      WHERE r.patient_id = ?
    `;
    let params = [patientId];
    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY r.created_at DESC';
    const data = await db.querySQLite(sql, params);
    
    return data.map(r => ({
      ...r,
      student: { full_name: r.full_name, email: r.email, phone: r.phone }
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Actualizar estado de una solicitud
 */
async function updateRequestStatus(requestId, newStatus) {
  try {
    await db.runSQLite('UPDATE requests SET status = ? WHERE id = ?', [newStatus, requestId]);

    if (await db.getStatus()) {
      db.supabase.from('requests').update({ status: newStatus }).eq('id', requestId).then(()=>{}).catch(()=>{});
    }
    return true;
  } catch(e) {
    return false;
  }
}

/**
 * Obtener todas las solicitudes (para administración)
 */
async function getAllRequests() {
  try {
    const sql = `
      SELECT r.*, s.full_name as student_name, p.full_name as patient_name
      FROM requests r
      LEFT JOIN profiles s ON r.student_id = s.id
      LEFT JOIN profiles p ON r.patient_id = p.id
      ORDER BY r.created_at DESC
    `;
    const data = await db.querySQLite(sql);
    return data.map(r => ({
      ...r,
      student: { full_name: r.student_name },
      patient: { full_name: r.patient_name }
    }));
  } catch (e) {
    return [];
  }
}

module.exports = {
  createRequest,
  getStudentRequests,
  getPatientRequests,
  updateRequestStatus,
  getAllRequests
};
