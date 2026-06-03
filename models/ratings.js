/* =============================================
   MODEL: RATINGS.JS
   ============================================= */

const db = require('../config/database');

/**
 * Crear una nueva calificación
 */
async function createRating(studentId, patientId, rating, comment = '') {
  try {
    const created_at = new Date().toISOString();

    const { error } = await db.supabase
      .from('ratings')
      .insert({
        student_id: studentId, 
        patient_id: patientId, 
        score: rating, 
        comment, 
        created_at
      });

    if (error) throw error;
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
    const { data, error } = await db.supabase
      .from('ratings')
      .select(`
        *,
        patient:patient_id(full_name)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(r => {
      const pat = Array.isArray(r.patient) ? r.patient[0] : r.patient;
      return {
        ...r,
        patient_name: pat ? pat.full_name : 'Desconocido'
      };
    });
  } catch (e) {
    console.error('Error en getStudentRatings:', e);
    return [];
  }
}

/**
 * Obtener el promedio de un estudiante
 */
async function getStudentAverage(studentId) {
  try {
    const { data, error } = await db.supabase
      .from('ratings')
      .select('score')
      .eq('student_id', studentId);

    if (error) throw error;

    if (!data || data.length === 0) {
      return { avg: 0, count: 0 };
    }

    const sum = data.reduce((acc, curr) => acc + curr.score, 0);
    const avg = sum / data.length;

    return { avg, count: data.length };
  } catch (e) {
    console.error('Error en getStudentAverage:', e);
    return { avg: 0, count: 0 };
  }
}

module.exports = {
  createRating,
  getStudentRatings,
  getStudentAverage
};
