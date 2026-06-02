/* =============================================
   MODEL: RATINGS.JS
   ============================================= */

const db = require('../config/database');

/**
 * Crear una nueva calificación
 */
async function createRating(studentId, patientId, rating, comment = '') {
  try {
    const id = Date.now().toString();
    const created_at = new Date().toISOString();

    await db.runSQLite(
      'INSERT INTO ratings (id, student_id, patient_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, studentId, patientId, rating, comment, created_at]
    );

    // Sync to Supabase si hay red
    if (await db.getStatus()) {
      db.supabase.from('ratings').insert({
        id, student_id: studentId, patient_id: patientId, rating, comment, created_at
      }).then(() => {}).catch(() => {});
    }

    return { success: true };
  } catch(e) {
    console.error('Error en createRating:', e);
    return { success: false, message: 'Error al crear la calificación' };
  }
}

/**
 * Obtener calificaciones de un estudiante
 */
async function getStudentRatings(studentId) {
  try {
    const sql = `
      SELECT r.*, p.full_name as patient_name 
      FROM ratings r
      LEFT JOIN profiles p ON r.patient_id = p.id
      WHERE r.student_id = ?
      ORDER BY r.created_at DESC
    `;
    const data = await db.querySQLite(sql, [studentId]);
    return data;
  } catch (e) {
    return [];
  }
}

/**
 * Obtener el promedio de un estudiante
 */
async function getStudentAverage(studentId) {
  try {
    const data = await db.querySQLite('SELECT AVG(rating) as avg, COUNT(id) as count FROM ratings WHERE student_id = ?', [studentId]);
    return data[0] || { avg: 0, count: 0 };
  } catch (e) {
    return { avg: 0, count: 0 };
  }
}

module.exports = {
  createRating,
  getStudentRatings,
  getStudentAverage
};
