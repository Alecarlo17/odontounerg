/* =============================================
   MODEL: REPORTS.JS
   Modelo de datos para reportes y estadísticas
   
   Encapsula las consultas a Supabase
   para generar reportes académicos del sistema.
   ============================================= */

const supabase = require('../config/supabase');

/**
 * Obtener estadísticas generales del sistema
 * @returns {object} Estadísticas globales
 */
async function getSystemStats() {
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { count: totalStudents } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student');

  const { count: totalPatients } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'patient');

  const { count: totalRequests } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true });

  const { count: totalAppointments } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true });

  return {
    totalUsers: totalUsers || 0,
    totalStudents: totalStudents || 0,
    totalPatients: totalPatients || 0,
    totalRequests: totalRequests || 0,
    totalAppointments: totalAppointments || 0
  };
}

/**
 * Obtener tratamientos de un estudiante
 * @param {string} studentId - ID del estudiante
 * @returns {Array} Lista de tratamientos
 */
async function getStudentTreatments(studentId) {
  const { data } = await supabase
    .from('treatments')
    .select('*, patient:patient_id(full_name)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  return data || [];
}

/**
 * Obtener tratamientos de un paciente
 * @param {string} patientId - ID del paciente
 * @returns {Array} Lista de tratamientos
 */
async function getPatientTreatments(patientId) {
  const { data } = await supabase
    .from('treatments')
    .select('*, student:student_id(full_name)')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  return data || [];
}

/**
 * Obtener distribución de tratamientos solicitados
 * @returns {object} Conteo por tipo de tratamiento
 */
async function getTreatmentDistribution() {
  const { data: patients } = await supabase
    .from('patients')
    .select('consultation_reason');

  const distribution = {};
  (patients || []).forEach(p => {
    const reason = p.consultation_reason || 'No especificado';
    distribution[reason] = (distribution[reason] || 0) + 1;
  });

  return distribution;
}

// Exportar funciones del modelo
module.exports = {
  getSystemStats,
  getStudentTreatments,
  getPatientTreatments,
  getTreatmentDistribution
};
