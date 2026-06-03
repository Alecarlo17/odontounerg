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
    
    return (data || [])
      .filter(r => !r.comment || !r.comment.startsWith('[P_RATING]'))
      .map(r => {
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

    const filteredData = (data || []).filter(r => !r.comment || !r.comment.startsWith('[P_RATING]'));

    if (filteredData.length === 0) {
      return { avg: 0, count: 0 };
    }

    const sum = filteredData.reduce((acc, curr) => acc + curr.score, 0);
    const avg = sum / filteredData.length;

    return { avg, count: filteredData.length };
  } catch (e) {
    console.error('Error en getStudentAverage:', e);
    return { avg: 0, count: 0 };
  }
}

/**
 * Obtener todos los promedios de estudiantes en masa
 */
async function getAllStudentsAverages() {
  try {
    const { data, error } = await db.supabase
      .from('ratings')
      .select('student_id, score, comment');
      
    if (error) throw error;
    
    const averages = {};
    (data || []).forEach(r => {
      if (r.comment && r.comment.startsWith('[P_RATING]')) return;
      if (!averages[r.student_id]) averages[r.student_id] = { sum: 0, count: 0 };
      averages[r.student_id].sum += r.score;
      averages[r.student_id].count += 1;
    });
    
    const result = {};
    Object.keys(averages).forEach(student_id => {
      result[student_id] = averages[student_id].sum / averages[student_id].count;
    });
    return result;
  } catch(e) {
    console.error('Error in getAllStudentsAverages', e);
    return {};
  }
}

/**
 * Obtener estatus de responsabilidad de un paciente
 */
async function getPatientResponsibility(patientId) {
  try {
    const { data, error } = await db.supabase
      .from('ratings')
      .select('comment')
      .eq('patient_id', patientId)
      .like('comment', '[P_RATING]%')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (error) throw error;
    if (!data || data.length === 0) return 'No evaluado';
    
    // Parse [P_RATING][responsable] comment
    const match = data[0].comment.match(/\[P_RATING\]\[(.*?)\]/);
    if (match && match[1]) {
      return match[1] === 'responsable' ? 'Responsable' : 'Irresponsable';
    }
    return 'No evaluado';
  } catch(e) {
    console.error('Error in getPatientResponsibility', e);
    return 'No evaluado';
  }
}

module.exports = {
  createRating,
  getStudentRatings,
  getStudentAverage,
  getAllStudentsAverages,
  getPatientResponsibility
};
