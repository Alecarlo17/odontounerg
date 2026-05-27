/* =============================================
   CONTROLLER: REPORT CONTROLLER
   Controlador de reportes y estadísticas
   
   Maneja la lógica para obtener estadísticas
   y generar datos de reportes académicos.
   ============================================= */

const ReportsModel = require('../models/reports');

/**
 * Obtener estadísticas generales del sistema
 */
async function getSystemStats(req, res) {
  const stats = await ReportsModel.getSystemStats();
  return res.json({ success: true, data: stats });
}

/**
 * Obtener tratamientos de un estudiante
 */
async function getStudentTreatments(req, res) {
  const treatments = await ReportsModel.getStudentTreatments(req.params.studentId);
  return res.json({ success: true, data: treatments });
}

/**
 * Obtener tratamientos de un paciente
 */
async function getPatientTreatments(req, res) {
  const treatments = await ReportsModel.getPatientTreatments(req.params.patientId);
  return res.json({ success: true, data: treatments });
}

/**
 * Obtener distribución de tratamientos
 */
async function getTreatmentDistribution(req, res) {
  const distribution = await ReportsModel.getTreatmentDistribution();
  return res.json({ success: true, data: distribution });
}

module.exports = {
  getSystemStats,
  getStudentTreatments,
  getPatientTreatments,
  getTreatmentDistribution
};
