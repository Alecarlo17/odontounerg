/* =============================================
   CONTROLLER: REQUEST CONTROLLER
   Controlador de solicitudes
   
   Maneja la lógica de envío, aceptación
   y rechazo de solicitudes.
   ============================================= */

const RequestsModel = require('../models/requests');
const { sendNotification } = require('../services/notificationService');
const db = require('../config/database');

/**
 * Enviar solicitud
 */
async function sendRequest(req, res) {
  const { studentId, patientId, message } = req.body;

  // Validar límite de pacientes activos
  const activeCount = await RequestsModel.getActivePatientsCount(studentId);
  if (activeCount >= 3) {
    return res.status(400).json({ success: false, message: 'Ha alcanzado el límite máximo de 3 pacientes activos. Debe finalizar o cancelar un tratamiento antes de enviar nuevas solicitudes.' });
  }

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

  // Obtener la solicitud para validar al estudiante
  const { data: requestRow } = await db.supabase
    .from('requests')
    .select('student_id, patient_id')
    .eq('id', id)
    .maybeSingle();

  if (!requestRow) {
    return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
  }

  // Validar si el paciente ya tiene un estudiante asignado
  const { data: activePatientReqs } = await db.supabase
    .from('requests')
    .select('id')
    .eq('patient_id', requestRow.patient_id)
    .in('status', ['accepted', 'active']);

  if (activePatientReqs && activePatientReqs.length > 0) {
    return res.status(400).json({ success: false, message: 'Ya tienes un tratamiento activo con un estudiante. No puedes aceptar más solicitudes hasta finalizar tu caso actual.' });
  }

  // Validar límite del estudiante
  const activeCount = await RequestsModel.getActivePatientsCount(requestRow.student_id);
  if (activeCount >= 3) {
    return res.status(400).json({ success: false, message: 'El estudiante ya ha alcanzado el límite máximo de 3 pacientes activos y no puede aceptar esta solicitud.' });
  }

  const result = await RequestsModel.updateRequestStatus(id, 'accepted');
  if (result === true || result.success) {
    // Rechazar automáticamente las demás solicitudes pendientes del paciente
    await db.supabase
      .from('requests')
      .update({ status: 'rejected' })
      .eq('patient_id', requestRow.patient_id)
      .eq('status', 'pending')
      .neq('id', id);

    if (requestRow) {
      await sendNotification(requestRow.student_id, 'request_accepted', 'Solicitud Aceptada', 'Un paciente ha aceptado tu solicitud', requestRow.patient_id);
    }
  }
  return res.json(result === true ? { success: true } : result);
}

/**
 * Rechazar solicitud
 */
async function rejectRequest(req, res) {
  const { id } = req.params;
  const result = await RequestsModel.updateRequestStatus(id, 'rejected');
  
  if (result === true || result.success) {
    const { data: requestRow } = await db.supabase
      .from('requests')
      .select('student_id, patient_id')
      .eq('id', id)
      .maybeSingle();

    if (requestRow) {
      await sendNotification(requestRow.student_id, 'request_rejected', 'Solicitud Rechazada', 'Un paciente ha rechazado tu solicitud', requestRow.patient_id);
    }
  }
  
  return res.json(result === true ? { success: true } : result);
}

/**
 * Obtener todas las solicitudes (admin)
 */
async function getAllRequests(req, res) {
  const requests = await RequestsModel.getAllRequests();
  return res.json({ success: true, data: requests });
}

/**
 * Dar de alta al paciente
 */
async function dischargePatient(req, res) {
  const { id } = req.params;

  // 1. Obtener la solicitud para conocer estudiante y paciente
  const { data: requestRow } = await db.supabase
    .from('requests')
    .select('student_id, patient_id, status')
    .eq('id', id)
    .maybeSingle();

  if (!requestRow) {
    return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
  }

  if (requestRow.status !== 'accepted' && requestRow.status !== 'active') {
    return res.status(400).json({ success: false, message: 'La solicitud no está activa' });
  }

  // 2. Validar que existan tratamientos registrados
  const { data: treatments } = await db.supabase
    .from('treatments')
    .select('id')
    .eq('student_id', requestRow.student_id)
    .eq('patient_id', requestRow.patient_id)
    .limit(1);

  if (!treatments || treatments.length === 0) {
    return res.status(400).json({ success: false, message: 'No se puede dar de alta a un paciente sin haber registrado al menos un tratamiento en el historial clínico.' });
  }

  // 3. Cambiar el estado a completed
  const result = await RequestsModel.updateRequestStatus(id, 'completed');
  
  if (result === true || result.success) {
    // 4. Enviar notificación al paciente para que califique
    await sendNotification(
      requestRow.student_id, 
      'request_discharged', 
      '¡Tratamiento Finalizado!', 
      'El estudiante te ha dado de alta. Por favor, califica tu experiencia.', 
      requestRow.patient_id
    );
  }
  
  return res.json(result === true ? { success: true } : result);
}

module.exports = {
  sendRequest,
  getStudentRequests,
  getPatientRequests,
  acceptRequest,
  rejectRequest,
  getAllRequests,
  dischargePatient
};
