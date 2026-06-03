/* =============================================
   MODEL: REPORTS.JS
   Modelo de datos para reportes y estadísticas
   ============================================= */

const db = require('../config/database');

/**
 * Obtener estadísticas generales del sistema
 */
async function getSystemStats() {
  try {
    const { count: users } = await db.supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: students } = await db.supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
    const { count: patients } = await db.supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'patient');
    const { count: requests } = await db.supabase.from('requests').select('*', { count: 'exact', head: true });
    const { count: appointments } = await db.supabase.from('appointments').select('*', { count: 'exact', head: true });

    return {
      totalUsers: users || 0,
      totalStudents: students || 0,
      totalPatients: patients || 0,
      totalRequests: requests || 0,
      totalAppointments: appointments || 0
    };
  } catch (e) {
    console.error('Error en getSystemStats:', e);
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
    const { data, error } = await db.supabase
      .from('treatments')
      .select(`
        *,
        patient:profiles!treatments_patient_id_fkey(full_name)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error en getStudentTreatments:', e);
    return [];
  }
}

/**
 * Obtener tratamientos de un paciente
 */
async function getPatientTreatments(patientId) {
  try {
    const { data, error } = await db.supabase
      .from('treatments')
      .select(`
        *,
        student:profiles!treatments_student_id_fkey(full_name)
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error en getPatientTreatments:', e);
    return [];
  }
}

/**
 * Obtener distribución de tratamientos solicitados
 */
async function getTreatmentDistribution() {
  try {
    const { data, error } = await db.supabase
      .from('patients')
      .select('consultation_reason');

    if (error) throw error;

    const distribution = {};
    if (data) {
      data.forEach(p => {
        const reason = p.consultation_reason || 'No especificado';
        distribution[reason] = (distribution[reason] || 0) + 1;
      });
    }
    return distribution;
  } catch (e) {
    console.error('Error en getTreatmentDistribution:', e);
    return {};
  }
}

module.exports = {
  getSystemStats,
  getStudentTreatments,
  getPatientTreatments,
  getTreatmentDistribution
};
