/* =============================================
   MODEL: PATIENTS.JS
   Modelo de datos para pacientes
   
   Encapsula las consultas a Supabase
   relacionadas con la tabla de pacientes.
   ============================================= */

const supabase = require('../config/supabase');

/**
 * Obtener datos de un paciente por ID
 * @param {string} patientId - ID del paciente
 * @returns {object|null} Datos del paciente
 */
async function getPatientById(patientId) {
  const { data } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single();

  return data || null;
}

/**
 * Obtener pacientes disponibles con sus perfiles
 * @param {string} treatment - Filtrar por tratamiento (opcional)
 * @returns {Array} Lista de pacientes disponibles
 */
async function getAvailablePatients(treatment = null) {
  let query = supabase
    .from('profiles')
    .select('*, patients!inner(*)')
    .eq('role', 'patient')
    .eq('patients.accepts_requests', true);

  if (treatment && treatment !== 'all') {
    query = query.eq('patients.consultation_reason', treatment);
  }

  const { data } = await query;
  return data || [];
}

/**
 * Actualizar datos del paciente
 * @param {string} patientId - ID del paciente
 * @param {object} patientData - Datos a actualizar
 * @returns {boolean} Éxito de la operación
 */
async function updatePatient(patientId, patientData) {
  const { error } = await supabase
    .from('patients')
    .update({
      age: patientData.age,
      phone: patientData.phone,
      direccion: patientData.direccion,
      medical_history: patientData.medicalHistory,
      consultation_reason: patientData.consultationReason,
      accepts_requests: patientData.acceptsRequests !== false
    })
    .eq('id', patientId);

  return !error;
}

/**
 * Obtener todos los pacientes (para administración)
 * @returns {Array} Lista de pacientes con perfiles
 */
async function getAllPatients() {
  const { data } = await supabase
    .from('profiles')
    .select('*, patients(*)')
    .eq('role', 'patient')
    .order('created_at', { ascending: false });

  return data || [];
}

// Exportar funciones del modelo
module.exports = {
  getPatientById,
  getAvailablePatients,
  updatePatient,
  getAllPatients
};
