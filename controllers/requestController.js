/* =============================================
   CONTROLLER: REQUEST CONTROLLER
   Controlador de solicitudes
   
   Maneja la lógica de envío, aceptación
   y rechazo de solicitudes.
   ============================================= */

const RequestsModel = require('../models/requests');
const { sendNotification } = require('../services/notificationService');

/**
 * Enviar solicitud
 */
async function sendRequest(req, res) {
  const { studentId, patientId, message } = req.body;
  const result = await RequestsModel.createRequest(studentId, patientId, message);

  if (!result.success) {
    return res.status(400).json(result);
  }
  
  await sendNotification(patientId, 'request_new', 'Nueva Solicitud', 'Un estudiante te ha enviado una solicitud', studentId);
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
  const { id } = req.params;
  const result = await RequestsModel.updateRequestStatus(id, 'accepted');
  if (result.success) {
    const db = require('../config/database');
    const requestRow = await db.getSQLite('SELECT student_id, patient_id FROM requests WHERE id = ?', [id]);
    if (requestRow) {
      await sendNotification(requestRow.student_id, 'request_accepted', 'Solicitud Aceptada', 'Un paciente ha aceptado tu solicitud', requestRow.patient_id);
    }
  }
  return res.json(result);
}

/**
 * Rechazar solicitud
 */
async function rejectRequest(req, res) {
  const { id } = req.params;
  const result = await RequestsModel.updateRequestStatus(id, 'rejected');
  
  if (result.success || result) {
    const db = require('../config/database');
    const requestRow = await db.getSQLite('SELECT student_id, patient_id FROM requests WHERE id = ?', [id]);
    if (requestRow) {
      await sendNotification(requestRow.student_id, 'request_rejected', 'Solicitud Rechazada', 'Un paciente ha rechazado tu solicitud', requestRow.patient_id);
    }
  }
  
  return res.json(result.success !== undefined ? result : { success: !!result });
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
