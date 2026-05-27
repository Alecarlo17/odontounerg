/* =============================================
   CONTROLLER: REQUEST CONTROLLER
   Controlador de solicitudes
   
   Maneja la lógica de envío, aceptación
   y rechazo de solicitudes.
   ============================================= */

const RequestsModel = require('../models/requests');

/**
 * Enviar solicitud
 */
async function sendRequest(req, res) {
  const { studentId, patientId, message } = req.body;
  const result = await RequestsModel.createRequest(studentId, patientId, message);

  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
}

/**
 * Obtener solicitudes del estudiante
 */
async function getStudentRequests(req, res) {
  const { userId } = req.params;
  const status = req.query.status || null;
  const requests = await RequestsModel.getStudentRequests(userId, status);
  return res.json({ success: true, data: requests });
}

/**
 * Obtener solicitudes del paciente
 */
async function getPatientRequests(req, res) {
  const { userId } = req.params;
  const status = req.query.status || null;
  const requests = await RequestsModel.getPatientRequests(userId, status);
  return res.json({ success: true, data: requests });
}

/**
 * Aceptar solicitud
 */
async function acceptRequest(req, res) {
  const success = await RequestsModel.updateRequestStatus(req.params.id, 'accepted');
  if (!success) {
    return res.status(500).json({ success: false, message: 'Error al aceptar' });
  }
  return res.json({ success: true, message: 'Solicitud aceptada' });
}

/**
 * Rechazar solicitud
 */
async function rejectRequest(req, res) {
  const success = await RequestsModel.updateRequestStatus(req.params.id, 'rejected');
  if (!success) {
    return res.status(500).json({ success: false, message: 'Error al rechazar' });
  }
  return res.json({ success: true, message: 'Solicitud rechazada' });
}

/**
 * Obtener todas las solicitudes (admin)
 */
async function getAllRequests(req, res) {
  const requests = await RequestsModel.getAllRequests();
  return res.json({ success: true, data: requests });
}

module.exports = {
  sendRequest,
  getStudentRequests,
  getPatientRequests,
  acceptRequest,
  rejectRequest,
  getAllRequests
};
