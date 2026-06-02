/* =============================================
   MODEL: REPORTS.JS
   Modelo de datos para reportes y estadísticas
   SQLite como Principal
   ============================================= */

const db = require('../config/database');

/**
 * Obtener estadísticas generales del sistema
 */
async function getSystemStats() {
  try {
    const users = await db.getSQLite('SELECT COUNT(*) as c FROM profiles');
    const students = await db.getSQLite("SELECT COUNT(*) as c FROM profiles WHERE role='student'");
    const patients = await db.getSQLite("SELECT COUNT(*) as c FROM profiles WHERE role='patient'");
    const requests = await db.getSQLite('SELECT COUNT(*) as c FROM requests');
    const appointments = await db.getSQLite('SELECT COUNT(*) as c FROM appointments');

    return {
      totalUsers: users ? users.c : 0,
      totalStudents: students ? students.c : 0,
      totalPatients: patients ? patients.c : 0,
      totalRequests: requests ? requests.c : 0,
      totalAppointments: appointments ? appointments.c : 0
    };
  } catch (e) {
    return {
      totalUsers: 0, totalStudents: 0, totalPatients: 0, totalRequests: 0, totalAppointments: 0
    };
  }
}

/**
 * Obtener tratamientos de un estudiante
 */
async function getStudentTreatments(studentId) {
  try {
    const sql = `
      SELECT t.*, p.full_name as patient_name
      FROM treatments t
      LEFT JOIN profiles p ON t.patient_id = p.id
      WHERE t.student_id = ?
      ORDER BY t.created_at DESC
    `;
    const data = await db.querySQLite(sql, [studentId]);
    return data.map(t => ({
      ...t,
      patient: { full_name: t.patient_name }
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Obtener tratamientos de un paciente
 */
async function getPatientTreatments(patientId) {
  try {
    const sql = `
      SELECT t.*, s.full_name as student_name
      FROM treatments t
      LEFT JOIN profiles s ON t.student_id = s.id
      WHERE t.patient_id = ?
      ORDER BY t.created_at DESC
    `;
    const data = await db.querySQLite(sql, [patientId]);
    return data.map(t => ({
      ...t,
      student: { full_name: t.student_name }
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Obtener distribución de tratamientos solicitados
 */
async function getTreatmentDistribution() {
  try {
    const patients = await db.querySQLite('SELECT consultation_reason FROM patients');
    const distribution = {};
    patients.forEach(p => {
      const reason = p.consultation_reason || 'No especificado';
      distribution[reason] = (distribution[reason] || 0) + 1;
    });
    return distribution;
  } catch (e) {
    return {};
  }
}

module.exports = {
  getSystemStats,
  getStudentTreatments,
  getPatientTreatments,
  getTreatmentDistribution
};
