/* =============================================
   MODEL: PATIENTS.JS
   Modelo de datos para pacientes
   SQLite como Principal
   ============================================= */

const db = require('../config/database');

/**
 * Obtener datos de un paciente por ID
 */
async function getPatientById(patientId) {
  try {
    const data = await db.getSQLite(`
      SELECT p.*, pat.age, pat.phone as p_phone, pat.address, pat.medical_history, pat.consultation_reason, pat.accepts_requests, pat.gender
      FROM profiles p 
      LEFT JOIN patients pat ON p.id = pat.user_id 
      WHERE p.id = ?
    `, [patientId]);
    return data || null;
  } catch (e) {
    return null;
  }
}

/**
 * Obtener pacientes disponibles con sus perfiles
 */
async function getAvailablePatients(treatment = null) {
  try {
    // IMPORTANTE: el JOIN debe ser ON p.id = pat.id (ya que auth.js inserta user.id en la columna id de patients)
    let sql = `
      SELECT p.id as profile_id, p.full_name, p.email, p.phone, p.disponibilidad, p.role,
             pat.age, pat.consultation_reason, pat.medical_history, pat.gender
      FROM profiles p 
      INNER JOIN patients pat ON p.id = pat.user_id 
      WHERE p.role = 'patient' AND pat.accepts_requests = 1
    `;
    let params = [];
    if (treatment && treatment !== 'all') {
      sql += ' AND pat.consultation_reason = ?';
      params.push(treatment);
    }
    const data = await db.querySQLite(sql, params);
    
    // Mapear al formato esperado por el frontend
    return data.map(row => ({
      id: row.profile_id,
      full_name: row.full_name,
      email: row.email,
      phone: row.phone,
      avatar_url: row.avatar_url,
      disponibilidad: row.disponibilidad,
      role: row.role,
      patients: {
        age: row.age,
        consultation_reason: row.consultation_reason,
        medical_history: row.medical_history,
        gender: row.gender
      }
    }));
  } catch (e) {
    console.error('Error en getAvailablePatients:', e);
    return [];
  }
}

/**
 * Actualizar datos del paciente
 */
async function updatePatient(patientId, patientData) {
  try {
    await db.runSQLite(
      'UPDATE patients SET phone = ?, address = ?, age = ?, medical_history = ?, consultation_reason = ?, accepts_requests = ? WHERE id = ?',
      [patientData.phone, patientData.direccion || patientData.address, patientData.age, patientData.medicalHistory, patientData.consultationReason, patientData.acceptsRequests !== false ? 1 : 0, patientId]
    );

    if (await db.getStatus()) {
      db.supabase.from('patients').update({
        phone: patientData.phone,
        address: patientData.direccion || patientData.address,
        age: patientData.age,
        medical_history: patientData.medicalHistory,
        consultation_reason: patientData.consultationReason,
        accepts_requests: patientData.acceptsRequests !== false
      }).eq('id', patientId).then(()=>{}).catch(()=>{});
    }

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Obtener todos los pacientes (para administración)
 */
async function getAllPatients() {
  try {
    let sql = `
      SELECT p.id as profile_id, p.*, pat.* 
      FROM profiles p 
      LEFT JOIN patients pat ON p.id = pat.user_id 
      WHERE p.role = 'patient'
      ORDER BY p.created_at DESC
    `;
    const data = await db.querySQLite(sql);
    
    return data.map(row => ({
      id: row.profile_id,
      full_name: row.full_name,
      role: row.role,
      created_at: row.created_at,
      patients: {
        age: row.age,
        consultation_reason: row.consultation_reason,
        medical_history: row.medical_history,
        phone: row.phone
      }
    }));
  } catch (e) {
    return [];
  }
}

module.exports = {
  getPatientById,
  getAvailablePatients,
  updatePatient,
  getAllPatients
};
