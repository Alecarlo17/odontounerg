/* =============================================
   CONTROLLER: PATIENT CONTROLLER
   Controlador de pacientes
   
   Maneja la lógica de búsqueda, consulta
   y actualización de datos de pacientes.
   ============================================= */

const PatientsModel = require('../models/patients');

/**
 * Obtener pacientes disponibles
 */
async function getAvailablePatients(req, res) {
  const treatment = req.query.treatment || null;
  const patients = await PatientsModel.getAvailablePatients(treatment);
  return res.json({ success: true, data: patients });
}

/**
 * Obtener perfil de un paciente
 */
async function getPatientProfile(req, res) {
  const patient = await PatientsModel.getPatientById(req.params.id);
  if (!patient) {
    return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
  }
  return res.json({ success: true, data: patient });
}

/**
 * Actualizar datos de paciente
 */
async function updatePatient(req, res) {
  const success = await PatientsModel.updatePatient(req.params.id, req.body);
  if (!success) {
    return res.status(500).json({ success: false, message: 'Error al actualizar' });
  }
  return res.json({ success: true, message: 'Paciente actualizado' });
}

/**
 * Obtener todos los pacientes (admin)
 */
async function getAllPatients(req, res) {
  const patients = await PatientsModel.getAllPatients();
  return res.json({ success: true, data: patients });
}

module.exports = {
  getAvailablePatients,
  getPatientProfile,
  updatePatient,
  getAllPatients
};
